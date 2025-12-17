import { createOpencodeClient, createOpencodeServer } from "@opencode-ai/sdk";
import { TempEnvironment } from "../src/temp-env.js";
import { EvalMonitor } from "../src/plugin/eval-plugin.js";
import { join } from "path";

declare global {
  var __evalMonitor: EvalMonitor;
}

async function runSimpleTest() {
  console.log("🧪 Starting Simple Eval Test\n");
  console.log("=" .repeat(60));

  const tempEnv = new TempEnvironment(process.cwd());
  const monitor = new EvalMonitor();
  globalThis.__evalMonitor = monitor;

  try {
    await tempEnv.setup({
      baseDir: process.cwd(),
      agentFile: "./test-fixtures/simple-agent/simple-writer.md",
      agentName: "simple-writer",
    });

    console.log(`\n📂 Working directory: ${tempEnv.getWorkingDirectory()}`);
    console.log(`📁 .opencode directory: ${tempEnv.getOpencodeDirectory()}`);

    console.log("\n🚀 Starting OpenCode server...");
    const server = await createOpencodeServer({
      config: {
        llm: {
          provider: "openrouter",
          model: "x-ai/grok-2-1212",
        },
      },
    });
    const client = createOpencodeClient({ baseUrl: server.url });
    console.log(`✅ Server started at ${server.url}`);

    console.log("\n📝 Creating session and sending prompt...");
    const session = await client.session.create();
    const sessionID = session.data?.id;

    if (!sessionID) {
      throw new Error("Failed to create session");
    }

    const eventStream = await client.event.subscribe();

    let sessionIdle = false;
    const monitorPromise = (async () => {
      try {
        for await (const event of eventStream as any) {
          if (event.payload.type === "session.idle") {
            const props = event.payload.properties as any;
            if (props?.sessionID === sessionID) {
              sessionIdle = true;
            }
          }
        }
      } catch (err) {
        // Stream aborted
      }
    })();

    await client.session.prompt({
      path: { id: sessionID },
      body: {
        parts: [{ type: "text", text: "Create a file called test.txt with the content 'Hello from eval system!'" }],
        agent: "simple-writer",
      },
      query: { directory: tempEnv.getWorkingDirectory() },
    });

    console.log("   ⏳ Waiting for session to complete...");
    const timeout = 15000;
    const start = Date.now();
    while (!sessionIdle && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    (eventStream as any)?.controller?.abort?.();
    await monitorPromise.catch(() => {});

    console.log("\n📊 Captured tool calls:");
    const tools = monitor.getTools();
    if (tools.length === 0) {
      console.log("   ⚠️  No tools captured!");
    } else {
      for (const tool of tools) {
        console.log(`   ✅ ${tool.tool} (${tool.duration}ms)`);
        if (tool.args) {
          console.log(`      Args: ${JSON.stringify(tool.args).substring(0, 100)}`);
        }
      }
    }

    console.log("\n🎯 Test Summary:");
    console.log(`   Tools executed: ${tools.length}`);
    console.log(`   Session status: ${sessionIdle ? "Completed" : "Timeout"}`);

    const writeToolCalled = tools.some(t => t.tool === "write");
    console.log(`   Write tool called: ${writeToolCalled ? "✅ YES" : "❌ NO"}`);

    await server.close();
    console.log("\n🛑 Server stopped");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    throw error;
  } finally {
    await tempEnv.cleanup();
    console.log("🧹 Temp environment cleaned up");
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Test completed successfully!");
}

runSimpleTest();
