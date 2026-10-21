import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { classifyDeveloperIntent } from './intentRules.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  next();
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Groq REST Stream Adapter
 */
async function streamGroq(modelId, prompt, onChunk) {
  const apiKey = (process.env.GROQ_API_KEY || '').trim();
  if (!apiKey) throw new Error('GROQ_API_KEY is missing in .env');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      stream: true
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq HTTP ${response.status}: ${errText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
        try {
          const parsed = JSON.parse(trimmed.slice(6));
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onChunk(content);
        } catch (e) {}
      }
    }
  }
}

/**
 * Google Gemini REST Stream Adapter
 */
async function streamGemini(requestedModelId, prompt, onChunk) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing in .env');

  // Fallback target array to prevent 404s
  const modelTargets = requestedModelId === 'gemini-3.8-flash'
    ? ['gemini-3.8-flash', 'gemini-2.0-flash']
    : [requestedModelId, 'gemini-1.5-pro-002', 'gemini-2.0-flash', 'gemini-3.8-flash'];

  let lastErr = '';

  for (const modelId of modelTargets) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse&key=${apiKey}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) {
          const errText = await response.text();
          if (response.status === 503 && attempt < 3) {
            await sleep(600 * attempt);
            continue;
          }
          lastErr = `HTTP ${response.status}: ${errText}`;
          break; // Try next model in fallback array
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) onChunk(text);
              } catch (e) {}
            }
          }
        }
        return { modelUsed: modelId };
      } catch (err) {
        lastErr = err.message;
        break;
      }
    }
  }
  throw new Error(`Gemini stream failed -> ${lastErr}`);
}

/**
 * OpenRouter Free REST Stream Adapter
 */
async function streamOpenRouter(modelId, prompt, onChunk) {
  const apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
  
  const headers = {
    'Content-Type': 'application/json',
    'HTTP-Referer': 'http://localhost:5000',
    'X-Title': 'Stateless AI Router'
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  // Fallback models for OpenRouter free tier
  const openRouterModels = [
    modelId,
    'openrouter/free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'nvidia/nemotron-3-super-120b-a12b:free'
  ];

  let lastErr = '';

  for (const targetModel of openRouterModels) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: 'user', content: prompt }],
          stream: true
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        lastErr = `HTTP ${response.status}: ${errText}`;
        continue;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) onChunk(content);
            } catch (e) {}
          }
        }
      }
      return { modelUsed: targetModel };
    } catch (err) {
      lastErr = err.message;
    }
  }
  throw new Error(`OpenRouter stream failed -> ${lastErr}`);
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Primary SSE Stream Endpoint
app.post('/api/v1/chat/stream', async (req, res) => {
  const { prompt, hasImage } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt string is required.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  const { modelConfig, category } = classifyDeveloperIntent(prompt, hasImage);
  const startTime = Date.now();

  res.write(`data: ${JSON.stringify({
    type: 'metadata',
    category: category,
    selectedModel: modelConfig.displayName,
    provider: modelConfig.provider,
    reasoning: modelConfig.reasoning
  })}\n\n`);

  const sendChunk = (chunk) => {
    res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
  };

  try {
    console.log(`Routing to ${modelConfig.displayName} (${modelConfig.id})`);
    
    if (modelConfig.provider === 'google') {
      const resGemini = await streamGemini(modelConfig.id, prompt, sendChunk);
      modelConfig.displayName = `Google ${resGemini.modelUsed}`;
    } else if (modelConfig.provider === 'openrouter') {
      const resOR = await streamOpenRouter(modelConfig.id, prompt, sendChunk);
      modelConfig.displayName = `OpenRouter (${resOR.modelUsed})`;
    } else {
      await streamGroq(modelConfig.id, prompt, sendChunk);
    }
  } catch (primaryErr) {
    console.warn(`Primary route failed: ${primaryErr.message}. Executing Groq fallback...`);
    try {
      await streamGroq('openai/gpt-oss-120b', prompt, sendChunk);
      modelConfig.displayName = 'Groq GPT-OSS 120B (Failover)';
    } catch (failoverErr) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: failoverErr.message })}\n\n`);
      return res.end();
    }
  }

  const duration = Date.now() - startTime;
  res.write(`data: ${JSON.stringify({ type: 'done', executionTimeMs: duration, finalModel: modelConfig.displayName })}\n\n`);
  res.end();
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`Router Active at http://localhost:${PORT}`);
  console.log(`==================================================\n`);
});