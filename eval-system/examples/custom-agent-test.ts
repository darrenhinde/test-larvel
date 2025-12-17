import { SimpleEvalRunner } from "../src/runner.js";
import type { SimpleTest } from "../src/types.js";
import { join } from "path";

const test: SimpleTest = {
  name: "Test custom agent - file creation",
  prompt: "Create a file called test.txt with 'Testing custom agent'",
  expectedTool: "write",
  agentFile: join(process.cwd(), "fixtures/agents/test-writer.md"),
  agentName: "test-writer",
};

const runner = new SimpleEvalRunner(process.cwd());

await runner.start();

try {
  const result = await runner.runTest(test);
  
  console.log("=".repeat(60));
  console.log("📊 Custom Agent Test Result:");
  console.log(`   Test: ${result.test.name}`);
  console.log(`   Agent: ${result.test.agentName}`);
  console.log(`   Passed: ${result.passed ? "✅ YES" : "❌ NO"}`);
  console.log(`   Duration: ${result.duration}ms`);
  console.log(`   Message: ${result.message}`);
  console.log("=".repeat(60));
  
  process.exit(result.passed ? 0 : 1);
} finally {
  await runner.stop();
}
