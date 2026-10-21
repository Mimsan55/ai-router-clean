import { MODEL_REGISTRY } from './modelRegistry.js';

export function classifyDeveloperIntent(prompt, hasImage = false) {
  const p = prompt.toLowerCase();
  const tokenLengthEstimate = prompt.length / 4;

  // Domain 1: Vision or Embedded Firmware (Google Gemini Pro)
  if (hasImage || p.includes("stm32") || p.includes("esp32") || p.includes("register") || p.includes("firmware")) {
    return {
      modelConfig: MODEL_REGISTRY.GEMINI_PRO,
      category: "EMBEDDED_HARDWARE"
    };
  }

  // Domain 2: Large Context & Stack Traces (Google Gemini 3.8 Flash)
  if (tokenLengthEstimate > 3000 || p.includes("stack trace") || p.includes("error log") || p.includes("microservice")) {
    return {
      modelConfig: MODEL_REGISTRY.GEMINI_38_FLASH,
      category: "LARGE_CONTEXT"
    };
  }

  // Domain 3: Unit Testing & Contract Parsing (Groq Qwen 3.8 27B)
  if (p.includes("pytest") || p.includes("jest") || p.includes("assert") || p.includes("mock") || p.includes("swagger")) {
    return {
      modelConfig: MODEL_REGISTRY.GROQ_QWEN_27B,
      category: "UNIT_TESTING"
    };
  }

  // Domain 4: Algorithmic Reasoning & Formal Logic (OpenRouter Free Node)
  if (p.includes("algorithm") || p.includes("dynamic programming") || p.includes("proof") || p.includes("complexity")) {
    return {
      modelConfig: MODEL_REGISTRY.OPENROUTER_FREE,
      category: "ALGORITHMIC_REASONING"
    };
  }

  // Domain 5: Default General Dev Task & SQL (Groq GPT-OSS 120B)
  return {
    modelConfig: MODEL_REGISTRY.GROQ_GPT_120B,
    category: "DEVELOPER_TASK"
  };
}