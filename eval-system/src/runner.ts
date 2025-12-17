/**
 * Eval runner - Phase 2
 * Pattern matching with enhanced context capture
 */

import { createOpencodeClient, createOpencodeServer } from "@opencode-ai/sdk";
import type { SimpleTest, EvalContext, TestResult, ToolCall } from "./types.js";
import { PatternMatcher } from "./matchers/index.js";
import { copyFile, mkdir, rm } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

export class SimpleEvalRunner {
  private server: Awaited<ReturnType<typeof createOpencodeServer>> | null = null;
  private client: ReturnType<typeof createOpencodeClient> | null = null;
  private directory: string;
  private agentsDir: string;
  private copiedAgents: string[] = [];

  constructor(directory: string = process.cwd()) {
    this.directory = directory;
    this.agentsDir = join(directory, ".opencode", "agent");
  }

  /**
   * Start OpenCode server
   */
  async start(config?: any) {
    console.log("🚀 Starting OpenCode server...");
    this.server = await createOpencodeServer({ config });
    this.client = createOpencodeClient({ baseUrl: this.server.url });
    console.log(`✅ Server started at ${this.server.url}\n`);
  }

  /**
   * Stop server and cleanup
   */
  async stop() {
    await this.cleanupAgents();
    
    if (this.server) {
      await this.server.close();
      console.log("🛑 Server stopped");
    }
  }

  /**
   * Setup custom agent file for testing
   */
  async setupAgent(agentFilePath: string): Promise<string> {
    const agentFileName = agentFilePath.split("/").pop()!;
    const targetPath = join(this.agentsDir, agentFileName);

    if (agentFilePath.includes(".opencode/agent/") && existsSync(agentFilePath)) {
      console.log(`   📋 Using existing agent: ${agentFileName}`);
      return agentFilePath;
    }

    if (!existsSync(this.agentsDir)) {
      await mkdir(this.agentsDir, { recursive: true });
    }

    await copyFile(agentFilePath, targetPath);
    this.copiedAgents.push(targetPath);
    
    console.log(`   📋 Copied test agent to .opencode/agent/: ${agentFileName}`);
    return targetPath;
  }

  /**
   * Cleanup copied agent files
   */
  async cleanupAgents() {
    for (const agentPath of this.copiedAgents) {
      try {
        await rm(agentPath);
        console.log(`   🗑️  Removed: ${agentPath.split("/").pop()}`);
      } catch (err) {
        // Ignore cleanup errors
      }
    }
    this.copiedAgents = [];
  }

  async runTest(test: SimpleTest): Promise<TestResult> {
    if (!this.client) {
      throw new Error("Server not started. Call start() first");
    }

    console.log(`🧪 Running: ${test.name}`);
    
    if (test.agentFile) {
      await this.setupAgent(test.agentFile);
    }
    
    const startTime = Date.now();

    const session = await this.client.session.create();
    const sessionID = session.data?.id;
    
    if (!sessionID) {
      throw new Error("Failed to create session");
    }

    const context = await this.monitorSession(sessionID, async () => {
      const parts: any[] = [];
      
      if (test.files) {
        for (const file of test.files) {
          parts.push({
            type: "file",
            mime: "text/plain",
            url: `file://${join(this.directory, file)}`,
          });
        }
      }
      
      parts.push({ type: "text", text: test.prompt });
      
      await this.client!.session.prompt({
        path: { id: sessionID },
        body: {
          parts,
          agent: test.agentName,
        },
        query: { directory: this.directory },
      });
    });

    const duration = Date.now() - startTime;
    context.metrics.totalDuration = duration;

    if (test.expectations) {
      const validations = await this.validateExpectations(test.expectations, context);
      const passed = validations.every(v => v.passed);
      const failedMessages = validations
        .filter(v => !v.passed)
        .map(v => v.message)
        .join("; ");
      
      const message = passed ? "All validations passed" : failedMessages;
      
      console.log(`${passed ? "✅" : "❌"} ${test.name} (${duration}ms)`);
      if (!passed) {
        for (const validation of validations.filter(v => !v.passed)) {
          console.log(`   ❌ ${validation.message}`);
        }
      }
      console.log("");

      return {
        test,
        passed,
        message,
        duration,
        validations,
        context,
      };
    } else if (test.expectedTool) {
      const toolWasCalled = context.tools.some((t) => t.tool === test.expectedTool);
      const passed = toolWasCalled;
      const message = passed
        ? `✅ Tool "${test.expectedTool}" was called`
        : `❌ Tool "${test.expectedTool}" was NOT called. Tools used: ${context.tools.map((t) => t.tool).join(", ")}`;

      console.log(`${passed ? "✅" : "❌"} ${test.name} (${duration}ms)`);
      console.log(`   ${message}\n`);

      return {
        test,
        passed,
        message,
        duration,
        context,
      };
    } else {
      throw new Error("Test must have either 'expectedTool' or 'expectations'");
    }
  }

  private async validateExpectations(
    expectations: NonNullable<SimpleTest["expectations"]>,
    context: EvalContext
  ) {
    const results = [];

    if (expectations.behavioral) {
      results.push(PatternMatcher.matchBehavioral(expectations.behavioral, context));
    }

    if (expectations.output) {
      results.push(await PatternMatcher.matchOutput(expectations.output, context));
    }

    if (expectations.performance) {
      results.push(PatternMatcher.matchPerformance(expectations.performance, context));
    }

    if (expectations.error) {
      results.push(PatternMatcher.matchError(expectations.error, context));
    }

    if (expectations.custom) {
      results.push(await expectations.custom(context));
    }

    return results;
  }

  private async monitorSession(
    sessionID: string,
    runTest: () => Promise<void>
  ): Promise<EvalContext> {
    const context: EvalContext = {
      sessionID,
      directory: this.directory,
      events: [],
      tools: [],
      messages: [],
      filesChanged: [],
      errors: [],
      metrics: {
        totalDuration: 0,
        toolCallCount: 0,
      },
    };

    let sessionCompleted = false;
    const toolTimings = new Map<string, number>();

    const eventStream = await this.client!.event.subscribe();

    const monitorPromise = (async () => {
      try {
        for await (const event of eventStream as any) {
          if (event.directory !== this.directory) continue;
          context.events.push(event);

          const payload = event.payload;

          if (payload.type === "message.part.updated") {
            const part = (payload as any).properties?.part;
            if (part?.type === "tool") {
              if (part.state.status === "pending") {
                toolTimings.set(part.callID, Date.now());
              } else if (part.state.status === "completed") {
                const startTime = toolTimings.get(part.callID) || Date.now();
                const toolCall: ToolCall = {
                  tool: part.tool,
                  callID: part.callID,
                  args: part.state.input || {},
                  output: part.state.output || {},
                  metadata: part.state.metadata || {},
                  duration: Date.now() - startTime,
                  timestamp: startTime,
                };
                context.tools.push(toolCall);
                context.metrics.toolCallCount++;
                console.log(`   🔧 Tool called: ${part.tool}`);
              } else if (part.state.status === "error") {
                context.errors.push({
                  tool: part.tool,
                  message: part.state.error || "Unknown error",
                  timestamp: Date.now(),
                });
              }
            }
          }

          if (payload.type === "message.updated") {
            const msg = (payload as any).properties?.message;
            if (msg) {
              context.messages.push({
                role: msg.role,
                content: msg.content || "",
                parts: msg.parts || [],
              });
            }
          }

          if (payload.type === "file.edited") {
            const filePath = (payload as any).properties?.path;
            if (filePath && !context.filesChanged.includes(filePath)) {
              context.filesChanged.push(filePath);
            }
          }

          if (payload.type === "session.error") {
            context.errors.push({
              message: (payload as any).properties?.error?.message || "Session error",
              timestamp: Date.now(),
            });
          }

          if (payload.type === "session.idle") {
            const props = payload.properties as any;
            if (props?.sessionID === sessionID) {
              console.log(`   ✅ Session went idle`);
              sessionCompleted = true;
            }
          }
        }
      } catch (err) {
        // Stream aborted
      }
    })();

    await runTest();

    const timeoutMs = 10000;
    const startTime = Date.now();
    
    console.log(`   ⏳ Waiting for session events (max ${timeoutMs}ms)...`);
    
    while (!sessionCompleted && Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (sessionCompleted) {
      console.log(`   ✅ Session completed successfully`);
    } else {
      console.log(`   ⚠️  Timeout reached. Collected ${context.tools.length} tool call(s).`);
    }

    (eventStream as any)?.controller?.abort?.();
    await monitorPromise.catch(() => {});

    return context;
  }

}
