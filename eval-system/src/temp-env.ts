import { mkdir, writeFile, cp, rm } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

export interface TempEnvConfig {
  baseDir: string;
  opencodeSource?: string;
  agentFile?: string;
  agentName?: string;
}

export class TempEnvironment {
  readonly path: string;
  readonly opencodeDir: string;
  private created = false;

  constructor(baseDir: string) {
    const timestamp = Date.now();
    const seed = Math.random().toString(36).substring(7);
    this.path = join(baseDir, ".tmp/evals", `opencode-eval-${timestamp}-${seed}`);
    this.opencodeDir = join(this.path, ".opencode");
  }

  async setup(config: TempEnvConfig): Promise<void> {
    console.log(`📁 Creating temp environment: ${this.path}`);

    await mkdir(this.opencodeDir, { recursive: true });

    if (config.opencodeSource) {
      console.log(`   📋 Copying .opencode from: ${config.opencodeSource}`);
      await cp(config.opencodeSource, this.opencodeDir, { recursive: true });
    } else {
      await mkdir(join(this.opencodeDir, "agent"), { recursive: true });

      if (config.agentFile && config.agentName) {
        const targetPath = join(this.opencodeDir, "agent", `${config.agentName}.md`);
        console.log(`   📋 Copying agent: ${config.agentFile} -> ${targetPath}`);
        await cp(config.agentFile, targetPath);
      }
    }

    await this.setupEvalPlugin();

    const configPath = join(this.opencodeDir, "config.json");
    if (!existsSync(configPath)) {
      const defaultConfig = {
        agent: config.agentName || "default",
      };
      await writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
      console.log(`   ⚙️  Created config.json with agent: ${defaultConfig.agent}`);
    }

    this.created = true;
    console.log(`   ✅ Temp environment ready`);
  }

  private async setupEvalPlugin(): Promise<void> {
    const pluginDir = join(this.opencodeDir, "plugin");
    await mkdir(pluginDir, { recursive: true });

    const pluginPackageJson = {
      name: "eval-plugin",
      version: "1.0.0",
      type: "module",
      main: "eval-plugin.js",
      dependencies: {
        "@opencode-ai/plugin": "latest",
      },
    };

    await writeFile(
      join(pluginDir, "package.json"),
      JSON.stringify(pluginPackageJson, null, 2)
    );

    const pluginCode = `
import { createEvalPlugin, EvalMonitor } from "../../../src/plugin/eval-plugin.js";

const monitor = globalThis.__evalMonitor;
if (!monitor) {
  throw new Error("EvalMonitor not found in global scope");
}

export default createEvalPlugin(monitor);
`;

    await writeFile(join(pluginDir, "eval-plugin.js"), pluginCode.trim());

    console.log(`   🔌 Eval plugin configured`);
  }

  async cleanup(): Promise<void> {
    if (this.created && existsSync(this.path)) {
      console.log(`   🧹 Cleaning up temp environment: ${this.path}`);
      await rm(this.path, { recursive: true, force: true });
    }
  }

  getWorkingDirectory(): string {
    return this.path;
  }

  getOpencodeDirectory(): string {
    return this.opencodeDir;
  }
}
