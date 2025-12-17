import { SimpleEvalRunner } from "../src/runner.js";
import type { SimpleTest } from "../src/types.js";
import { join } from "path";
import { existsSync } from "fs";

const agentPath = join(process.cwd(), ".opencode", "agent", "codebase-agent.md");

if (!existsSync(agentPath)) {
  console.log("⚠️  No codebase-agent.md found in .opencode/agent/");
  console.log("   This test requires an existing OpenCode agent.");
  console.log("   Skipping test.");
  process.exit(0);
}

const test: SimpleTest = {
  name: "Test with existing OpenCode agent",
  prompt: "Create a file called example.ts with a simple function",
  expectedTool: "write",
  agentFile: agentPath,
  agentName: "codebase-agent",
};

const runner = new SimpleEvalRunner(process.cwd());

await runner.start();

try {
  const result = await runner.runTest(test);
  
  console.log("=".repeat(60));
  console.log("📊 Existing Agent Test Result:");
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
