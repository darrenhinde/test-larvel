import { SimpleEvalRunner } from "../src/runner.js";
import type { SimpleTest } from "../src/types.js";

const tests: SimpleTest[] = [
  {
    name: "Behavioral Pattern - Tool sequence",
    prompt: "Create a file called hello.ts with a hello world function",
    expectations: {
      behavioral: {
        type: "behavioral",
        toolSequence: ["write"],
      },
    },
  },

  {
    name: "Behavioral Pattern - Must call specific tools",
    prompt: "Read package.json and create a new script for testing",
    expectations: {
      behavioral: {
        type: "behavioral",
        mustCall: ["read", "edit"],
        mustNotCall: ["write"],
      },
    },
  },

  {
    name: "Behavioral Pattern - Tool frequency",
    prompt: "Create three files: a.ts, b.ts, c.ts",
    expectations: {
      behavioral: {
        type: "behavioral",
        minCalls: { write: 3 },
        maxCalls: { write: 3 },
      },
    },
  },

  {
    name: "Behavioral Pattern - Wildcard pattern",
    prompt: "Read all TypeScript files in src/ and fix any linting issues",
    expectations: {
      behavioral: {
        type: "behavioral",
        toolPattern: "read+ edit*",
      },
    },
  },

  {
    name: "Output Pattern - File content validation",
    prompt: "Create a TypeScript interface User with name and email fields",
    expectations: {
      output: {
        type: "output",
        filesCreated: [{
          path: "User.ts",
          contains: ["interface", "User", "name", "email"],
          minLines: 3,
        }],
      },
    },
  },

  {
    name: "Output Pattern - Multiple files",
    prompt: "Create math.ts with a sum function and math.test.ts with tests",
    expectations: {
      output: {
        type: "output",
        filesCreated: [
          {
            path: "math.ts",
            contains: ["export", "sum"],
            matches: /function\s+sum|const\s+sum\s*=/,
          },
          {
            path: "math.test.ts",
            contains: ["test", "sum"],
            minLines: 5,
          },
        ],
      },
    },
  },

  {
    name: "Performance Pattern - Duration limit",
    prompt: "Create a simple hello world script",
    expectations: {
      performance: {
        type: "performance",
        maxDuration: 15000,
        maxToolCalls: 2,
      },
    },
  },

  {
    name: "Performance Pattern - No redundant reads",
    prompt: "Count all TODO comments in the codebase",
    expectations: {
      behavioral: {
        type: "behavioral",
        mustCall: ["grep"],
        mustNotCall: ["read"],
      },
      performance: {
        type: "performance",
        maxToolCalls: 3,
        noRedundantReads: true,
      },
    },
  },

  {
    name: "Combined Patterns - Full validation",
    prompt: "Implement a TypeScript function to calculate factorial with tests",
    expectations: {
      behavioral: {
        type: "behavioral",
        mustCall: ["write"],
        minCalls: { write: 2 },
      },
      output: {
        type: "output",
        filesCreated: [
          {
            path: "factorial.ts",
            contains: ["factorial"],
            matches: /function|const.*=>/,
          },
          {
            path: "factorial.test.ts",
            contains: ["factorial", "test"],
          },
        ],
      },
      performance: {
        type: "performance",
        maxDuration: 30000,
        noRedundantReads: true,
      },
    },
  },
];

async function runPatternTests() {
  console.log("🚀 Running Pattern Matching Tests\n");
  console.log("=" .repeat(60));
  
  const runner = new SimpleEvalRunner(process.cwd());
  await runner.start();

  try {
    const results = [];
    
    for (const test of tests) {
      const result = await runner.runTest(test);
      results.push(result);
      
      if (result.validations) {
        console.log(`📊 Validations:`);
        for (const validation of result.validations) {
          const icon = validation.passed ? "✅" : "❌";
          console.log(`   ${icon} ${validation.message || "Passed"}`);
        }
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 Test Summary");
    console.log("=".repeat(60));

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log(`✅ Passed: ${passed}/${results.length}`);
    console.log(`❌ Failed: ${failed}/${results.length}`);
    
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    console.log(`⏱️  Average duration: ${Math.round(avgDuration)}ms`);

  } finally {
    await runner.stop();
  }
}

runPatternTests();
