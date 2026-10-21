export const MODEL_REGISTRY = {
  GROQ_GPT_120B: {
    id: "openai/gpt-oss-120b",
    provider: "groq",
    displayName: "Groq GPT-OSS 120B",
    maxTokens: 128000,
    primaryDomains: ["DEVELOPER_TASK", "SQL_SCHEMA"],
    reasoning: "Selected for ultra-fast general logic and SQL database schema generation."
  },

  GROQ_QWEN_27B: {
    id: "qwen/qwen3.8-27b",
    provider: "groq",
    displayName: "Groq Qwen 3.8 27B",
    maxTokens: 131000,
    primaryDomains: ["UNIT_TESTING", "CODE_TRANSPILATION"],
    reasoning: "Selected for deterministic code generation, PyTest/Jest suites, and OpenAPI parsing."
  },

  GEMINI_38_FLASH: {
    id: "gemini-3.8-flash",
    provider: "google",
    displayName: "Google Gemini 3.8 Flash",
    maxTokens: 1000000,
    primaryDomains: ["LARGE_CONTEXT", "LOG_DEBUGGING"],
    reasoning: "Selected for massive context ingestion, error log tracing, and microservice debugging."
  },

  GEMINI_PRO: {
    id: "gemini-1.5-pro-002",
    provider: "google",
    displayName: "Google Gemini Pro",
    maxTokens: 2000000,
    primaryDomains: ["EMBEDDED_HARDWARE", "UI_VISION"],
    reasoning: "Selected for deep systems architecture, C++ firmware registers, and multimodal analysis."
  },

  OPENROUTER_FREE: {
    id: "openrouter/free",
    provider: "openrouter",
    displayName: "OpenRouter Free Node",
    maxTokens: 128000,
    primaryDomains: ["ALGORITHMIC_REASONING", "MATHEMATICAL_PROOFS"],
    reasoning: "Selected for step-by-step algorithmic optimization and formal code verification."
  }
};