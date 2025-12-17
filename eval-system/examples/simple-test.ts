/**
 * Simple test - Phase 1
 * Just verify we can detect tool calls
 */

import { SimpleEvalRunner } from "../src/runner.js";
import type { SimpleTest } from "../src/types.js";

// Define ONE simple test
const test: SimpleTest = {
  name: "Create a hello.txt file",
  prompt: "Create a file called hello.txt with the text 'Hello World'",
  expectedTool: "write", // We expect the 'write' tool to be called
};

const runner = new SimpleEvalRunner(process.cwd());

await runner.start();

try {
  const result = await runner.runTest(test);
  
  console.log("=".repeat(50));
  console.log("📊 Test Result:");
  console.log(`   Name: ${result.test.name}`);
  console.log(`   Passed: ${result.passed ? "✅ YES" : "❌ NO"}`);
  console.log(`   Duration: ${result.duration}ms`);
  console.log(`   Message: ${result.message}`);
  console.log("=".repeat(50));
  
  process.exit(result.passed ? 0 : 1);
} finally {
  await runner.stop();
}
