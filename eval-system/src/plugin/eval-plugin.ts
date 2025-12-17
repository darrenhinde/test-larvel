import type { Plugin } from "@opencode-ai/plugin";

export interface CapturedToolCall {
  tool: string;
  args: any;
  output: any;
  startTime: number;
  endTime: number;
  duration: number;
}

export class EvalMonitor {
  tools: CapturedToolCall[] = [];
  private pendingTools = new Map<string, { tool: string; args: any; startTime: number }>();

  captureToolStart(callID: string, tool: string, args: any) {
    this.pendingTools.set(callID, {
      tool,
      args,
      startTime: Date.now(),
    });
  }

  captureToolEnd(callID: string, output: any) {
    const pending = this.pendingTools.get(callID);
    if (pending) {
      const endTime = Date.now();
      this.tools.push({
        tool: pending.tool,
        args: pending.args,
        output,
        startTime: pending.startTime,
        endTime,
        duration: endTime - pending.startTime,
      });
      this.pendingTools.delete(callID);
    }
  }

  getTools() {
    return this.tools;
  }

  reset() {
    this.tools = [];
    this.pendingTools.clear();
  }
}

export const createEvalPlugin = (monitor: EvalMonitor): Plugin => {
  return async ({ client, directory, $ }) => {
    console.log("🔍 Eval plugin loaded for directory:", directory);

    return {
      "tool.execute.before": async (input, output) => {
        const callID = input.messageID + "-" + input.tool;
        monitor.captureToolStart(callID, input.tool, output.args);
        console.log(`   🔧 Tool starting: ${input.tool}`);
      },

      "tool.execute.after": async (input, output) => {
        const callID = input.messageID + "-" + input.tool;
        monitor.captureToolEnd(callID, output.output);
        console.log(`   ✅ Tool completed: ${input.tool} (${monitor.tools[monitor.tools.length - 1]?.duration}ms)`);
      },

      "permission.ask": async (input, output) => {
        console.log(`   🔓 Auto-approving permission: ${input.tool} ${input.args.command || ""}`);
        output.status = "allow";
      },
    };
  };
};
