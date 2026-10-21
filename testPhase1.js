import { classifyDeveloperIntent } from './intentRules.js';

const testPrompts = [
  "Write 5 PyTest unit tests with mocks for a user payment processing function.",
  "Here is a SELECT query with 4 INNER JOINs on PostgreSQL, optimize its indexing.",
  "I have a 10,000 line microservice error log attached below. Trace the root cause.",
  "Write a C++ program for ESP32 microcontroller using SPI protocol to read an IR sensor."
];

console.log("\n==================================================");
console.log("=== PHASE 1 ROUTING VERIFICATION (CLEAN BUILD) ===");
console.log("==================================================\n");

testPrompts.forEach((prompt, index) => {
  const result = classifyDeveloperIntent(prompt);
  console.log(`Test #${index + 1}: "${prompt.substring(0, 50)}..."`);
  console.log(` -> Selected Model: ${result.modelConfig.displayName}`);
  console.log(` -> Provider:       ${result.modelConfig.provider}`);
  console.log(` -> Category:       ${result.category}`);
  console.log(` -> Reasoning:      ${result.modelConfig.reasoning}\n`);
});