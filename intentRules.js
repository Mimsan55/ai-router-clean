/**
 * intentRules.js - Advanced Multi-Signal Weighted Classification Engine
 * Sub-3ms in-memory intent classifier for 5 specialized LLM routes.
 */

// 1. Comprehensive Multi-Category Dictionaries & RegEx Patterns
const DOMAIN_PATTERNS = {
  UNIT_TESTING: {
    // Weight 15: Exact code syntax, test runner imports & assertions
    highPrecision: [
      /\b(import\s+pytest|from\s+unittest|import\s+jest|@pytest\.fixture|describe\(|it\(['"]|test\(['"]|expect\(|assert\.strictEqual)\b/i,
      /\b(PyTest|Jest|Vitest|Mocha|Chai|Cypress|Playwright|JUnit|NUnit|XUnit|PHPUnit|rspec|pytest-mock)\b/i,
      /\b(mock\.patch|mocker\.patch|jest\.fn\(|sinon\.spy|assert_called_with|assert_called_once)\b/i
    ],
    // Weight 8: General testing terminology & API contract terms
    general: [
      /\b(unit\s+test|integration\s+test|end-to-end|e2e\s+test|test\s+suite|test\s+runner|test\s+coverage)\b/i,
      /\b(assertion|assertions|mocking|stubbing|fixtures?|parameterized\s+test|test\s+case|test\s+driven)\b/i,
      /\b(OpenAPI\s+contract|Swagger\s+schema\s+test|API\s+contract\s+test)\b/i
    ],
    // Weight 5: Multilingual terms (Kurdish & Arabic)
    multilingual: [
      /(تاقیکردنەوە|تێستکردن|یۆنیت\s+تێست|تێست\s+سویت|تێست)/i, // Kurdish
      /(اختبار\s+الوحدة|اختبارات|فحص\_الكود|بيئة\_الاختبار|تست)/i    // Arabic
    ]
  },

  EMBEDDED_HARDWARE: {
    // Weight 15: Hardware microcontrollers, C/C++ register signatures & pin functions
    highPrecision: [
      /\b(STM32|ESP32|ESP8266|Arduino|Raspberry\s+Pi\s+Pico|AVR|PIC16|ARM\s+Cortex|NRF52|RISC-V)\b/i,
      /#include\s*<[a-z0-9_/\.]*(stm32|avr\/|esp_|arduino)[a-z0-9_/\.]*>/i,
      /\b(HAL_GPIO_|HAL_UART_|pinMode\(|digitalWrite\(|analogRead\(|attachInterrupt\()\b/i,
      /\b(volatile\s+uint32_t|uint8_t\*|uint16_t\*|register_offset|memory_mapped_io|ISR\()\b/i
    ],
    // Weight 8: Low-level protocols, peripherals & C firmware terms
    general: [
      /\b(GPIO|SPI|I2C|I2S|UART|USART|CAN\s+bus|PWM|ADC|DAC|DMA|NVIC|Watchdog|EEPROM|Flash\s+Memory)\b/i,
      /\b(firmware|microcontroller|embedded\s+system|bare\s+metal|FreeRTOS|register\s+mapping|memory\s+leak\s+in\s+C)\b/i,
      /\b(baud\s+rate|clock\s+prescaler|logic\s+analyzer|oscilloscope|pinout|datasheet)\b/i
    ],
    // Weight 5: Multilingual hardware terms
    multilingual: [
      /(میکڕۆکۆنترۆڵەر|فیرموێر|هاردوێر|سێنسۆر|سیستەمی\s+مدمج|ڕێجستەر)/i, // Kurdish
      /(نظام\_مدمج|المتحكمات\_الدقيقة|لوحة\_الأردوينو|العتاد\_الصلب|السجل)/i   // Arabic
    ]
  },

  ALGORITHMIC_REASONING: {
    // Weight 15: Asymptotic bounds, dynamic programming signatures & proofs
    highPrecision: [
      /O\((?:1|n|n\^2|n\^3|2\^n|n!|log\s*n|n\s*log\s*n)\)/i,
      /\b(mathematical\s+proof|inductive\s+step|base\s+case|time\s+complexity|space\s+complexity|asymptotic\s+bound)\b/i,
      /\b(dynamic\s+programming|memoization|tabulation|recurrence\s+relation|dp\[i\]\[j\]|dp\[n\])\b/i
    ],
    // Weight 8: Classic algorithms, data structures & graph theory
    general: [
      /\b(Dijkstra|A\*\s+search|Bellman-Ford|Floyd-Warshall|Kruskal|Prim|Trie|Red-Black\s+Tree|AVL\s+Tree)\b/i,
      /\b(NP-complete|NP-hard|traveling\s+salesman|backtracking|divide\s+and\s+conquer|sliding\s+window|two\s+pointers)\b/i,
      /\b(formal\s+logic|proof\s+of\s+correctness|combinatorics|graph\s+theory|topological\s+sort)\b/i
    ],
    // Weight 5: Multilingual mathematical & algorithm terms
    multilingual: [
      /(ئەلگۆریزم|ئاڵۆزیی\s+کات|داینامیک\s+پڕۆگرامینگ|سەلماندنی\s+ماتماتیکی)/i, // Kurdish
      /(خوارزمية|تعقيد\_الوقت|البرمجة\_الديناميكية|الإثبات\_الرياضي)/i        // Arabic
    ]
  },

  DEVELOPER_TASK: {
    // Weight 12: SQL statements, ORMs, database schemas & web frameworks
    highPrecision: [
      /\b(SELECT\s+.+?\s+FROM|INSERT\s+INTO|UPDATE\s+.+?\s+SET|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE)\b/i,
      /\b(PostgreSQL|MySQL|MongoDB|SQLite|Redis|Prisma|TypeORM|Sequelize|SQLAlchemy)\b/i,
      /\b(Express\.js|FastAPI|Django|Flask|Spring\b|NestJS|React|Next\.js|Vue\.js|Angular)\b/i
    ],
    // Weight 7: General web development, REST APIs & refactoring
    general: [
      /\b(SQL\s+schema|database\s+migration|REST\s+API|GraphQL|JWT\s+auth|OAuth2|CRUD|JSON\s+response)\b/i,
      /\b(refactor|code\s+review|optimize\s+query|index\s+optimization|foreign\s+key|join\s+query)\b/i,
      /\b(HTML|CSS|Tailwind|Flexbox|TypeScript|Node\.js|Docker|Kubernetes|CI\/CD)\b/i
    ],
    // Weight 4: Multilingual general developer terms
    multilingual: [
      /(داتابێس|سکیمای\_داتا|کۆدی\_پایتۆن|فۆنکشن|ئەی\_پی\_ئای|پڕۆگرامسازی)/i, // Kurdish
      /(قاعدة\_بيانات|تطوير\_المواقع|واجهة\_البرمجة|استعلامات|برمجة)/i      // Arabic
    ]
  }
};

/**
 * Main Classification Function
 * @param {string} promptText - Raw user prompt input
 * @returns {string} - Designated Intent Domain ID
 */
export function classifyPrompt(promptText) {
  const text = (promptText || '').trim();

  // -------------------------------------------------------------
  // SIGNAL 1: Structural Log & Large Context Inspection
  // -------------------------------------------------------------
  const estimatedTokens = Math.ceil(text.length / 3.8);
  const stackTraceLines = (text.match(/(at\s+.+?:\d+:\d+|Traceback\s+\(most\s+recent|Exception\s+in\s+thread)/g) || []).length;
  const isMicroserviceLog = /\b(FATAL|ERROR|WARN|INFO|DEBUG|NullPointerException|Segmentation\s+fault)\b/i.test(text) && stackTraceLines >= 2;

  // Trigger Google Gemini Flash if text > 3000 tokens or contains heavy stack traces
  if (estimatedTokens > 3000 || stackTraceLines >= 4 || (isMicroserviceLog && text.length > 1200)) {
    return 'LARGE_CONTEXT';
  }

  // -------------------------------------------------------------
  // SIGNAL 2: Multi-Domain Weighted Scoring Engine
  // -------------------------------------------------------------
  const scores = {
    UNIT_TESTING: 0,
    EMBEDDED_HARDWARE: 0,
    ALGORITHMIC_REASONING: 0,
    DEVELOPER_TASK: 0
  };

  // Calculate matching scores across all categories
  for (const [domain, tiers] of Object.entries(DOMAIN_PATTERNS)) {
    // 1. High Precision Matches (15 Points each)
    for (const pattern of tiers.highPrecision) {
      const matches = text.match(new RegExp(pattern, 'gi'));
      if (matches) scores[domain] += matches.length * 15;
    }

    // 2. General Technical Matches (8 Points each)
    for (const pattern of tiers.general) {
      const matches = text.match(new RegExp(pattern, 'gi'));
      if (matches) scores[domain] += matches.length * 8;
    }

    // 3. Multilingual Matches (5 Points each)
    for (const pattern of tiers.multilingual) {
      const matches = text.match(new RegExp(pattern, 'gi'));
      if (matches) scores[domain] += matches.length * 5;
    }
  }

  // -------------------------------------------------------------
  // SIGNAL 3: Highest Score Resolution & Fallback Matrix
  // -------------------------------------------------------------
  let bestDomain = 'DEVELOPER_TASK';
  let highestScore = 0;

  for (const [domain, score] of Object.entries(scores)) {
    if (score > highestScore) {
      highestScore = score;
      bestDomain = domain;
    }
  }

  // Fallback: If no specific keywords triggered (Score === 0), route to default DEVELOPER_TASK
  return bestDomain;
}