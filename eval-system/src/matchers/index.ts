import { readFile } from "fs/promises";
import { join } from "path";
import type {
  BehavioralPattern,
  OutputPattern,
  PerformancePattern,
  ErrorPattern,
  EvalContext,
  ValidationResult,
} from "../types.js";

export class PatternMatcher {
  static matchBehavioral(pattern: BehavioralPattern, context: EvalContext): ValidationResult {
    const errors: string[] = [];
    const toolNames = context.tools.map(t => t.tool);
    
    if (pattern.toolSequence) {
      const actual = toolNames.join(",");
      const expected = pattern.toolSequence.join(",");
      if (actual !== expected) {
        errors.push(`Tool sequence mismatch. Expected: [${expected}], Got: [${actual}]`);
      }
    }
    
    if (pattern.toolPattern) {
      const matched = this.matchToolPattern(pattern.toolPattern, toolNames);
      if (!matched) {
        errors.push(`Tool pattern "${pattern.toolPattern}" not matched. Got: [${toolNames.join(", ")}]`);
      }
    }
    
    if (pattern.mustCall) {
      const missing = pattern.mustCall.filter(tool => !toolNames.includes(tool));
      if (missing.length > 0) {
        errors.push(`Missing required tools: ${missing.join(", ")}`);
      }
    }
    
    if (pattern.mustNotCall) {
      const forbidden = pattern.mustNotCall.filter(tool => toolNames.includes(tool));
      if (forbidden.length > 0) {
        errors.push(`Forbidden tools called: ${forbidden.join(", ")}`);
      }
    }
    
    if (pattern.maxCalls || pattern.minCalls) {
      const counts = this.countTools(toolNames);
      
      for (const [tool, max] of Object.entries(pattern.maxCalls || {})) {
        if ((counts[tool] || 0) > max) {
          errors.push(`Tool "${tool}" called ${counts[tool]} times (max: ${max})`);
        }
      }
      
      for (const [tool, min] of Object.entries(pattern.minCalls || {})) {
        if ((counts[tool] || 0) < min) {
          errors.push(`Tool "${tool}" called ${counts[tool] || 0} times (min: ${min})`);
        }
      }
    }
    
    if (pattern.maxToolDuration) {
      for (const tool of context.tools) {
        const max = pattern.maxToolDuration[tool.tool];
        if (max && tool.duration > max) {
          errors.push(`Tool "${tool.tool}" took ${tool.duration}ms (max: ${max}ms)`);
        }
      }
    }
    
    return {
      passed: errors.length === 0,
      message: errors.join("; "),
      details: { toolSequence: toolNames },
    };
  }
  
  static async matchOutput(pattern: OutputPattern, context: EvalContext): Promise<ValidationResult> {
    const errors: string[] = [];
    
    if (pattern.filesCreated) {
      for (const fileExpectation of pattern.filesCreated) {
        const filePath = join(context.directory, fileExpectation.path);
        
        try {
          const content = await readFile(filePath, "utf-8");
          
          if (fileExpectation.contains) {
            for (const needle of fileExpectation.contains) {
              if (!content.includes(needle)) {
                errors.push(`File "${fileExpectation.path}" missing content: "${needle}"`);
              }
            }
          }
          
          if (fileExpectation.matches) {
            if (!fileExpectation.matches.test(content)) {
              errors.push(`File "${fileExpectation.path}" doesn't match pattern: ${fileExpectation.matches}`);
            }
          }
          
          const lines = content.split("\n").length;
          if (fileExpectation.minLines && lines < fileExpectation.minLines) {
            errors.push(`File "${fileExpectation.path}" has ${lines} lines (min: ${fileExpectation.minLines})`);
          }
          if (fileExpectation.maxLines && lines > fileExpectation.maxLines) {
            errors.push(`File "${fileExpectation.path}" has ${lines} lines (max: ${fileExpectation.maxLines})`);
          }
          
        } catch (err) {
          errors.push(`File "${fileExpectation.path}" not found`);
        }
      }
    }
    
    if (pattern.filesModified) {
      for (const file of pattern.filesModified) {
        if (!context.filesChanged.includes(file)) {
          errors.push(`Expected file "${file}" to be modified`);
        }
      }
    }
    
    const allText = context.messages
      .filter(m => m.role === "assistant")
      .map(m => m.content)
      .join("\n");
    
    if (pattern.responseContains) {
      for (const needle of pattern.responseContains) {
        if (!allText.includes(needle)) {
          errors.push(`Response missing expected text: "${needle}"`);
        }
      }
    }
    
    if (pattern.responseMatches) {
      for (const regex of pattern.responseMatches) {
        if (!regex.test(allText)) {
          errors.push(`Response doesn't match pattern: ${regex}`);
        }
      }
    }
    
    return {
      passed: errors.length === 0,
      message: errors.join("; "),
      details: { filesChanged: context.filesChanged },
    };
  }
  
  static matchPerformance(pattern: PerformancePattern, context: EvalContext): ValidationResult {
    const errors: string[] = [];
    
    if (pattern.maxDuration && context.metrics.totalDuration > pattern.maxDuration) {
      errors.push(
        `Duration ${context.metrics.totalDuration}ms exceeded max ${pattern.maxDuration}ms`
      );
    }
    
    if (pattern.maxToolCalls && context.metrics.toolCallCount > pattern.maxToolCalls) {
      errors.push(
        `Tool calls ${context.metrics.toolCallCount} exceeded max ${pattern.maxToolCalls}`
      );
    }
    
    if (pattern.noRedundantReads) {
      const readTools = context.tools.filter(t => t.tool === "read");
      const readPaths = readTools.map(t => t.args?.filePath).filter(Boolean);
      const duplicates = readPaths.filter((p, i) => readPaths.indexOf(p) !== i);
      
      if (duplicates.length > 0) {
        errors.push(`Redundant reads detected: ${[...new Set(duplicates)].join(", ")}`);
      }
    }
    
    if (pattern.noRedundantEdits) {
      const editTools = context.tools.filter(t => t.tool === "edit");
      const editPaths = editTools.map(t => t.args?.filePath).filter(Boolean);
      const duplicates = editPaths.filter((p, i) => editPaths.indexOf(p) !== i);
      
      if (duplicates.length > 0) {
        errors.push(`Redundant edits detected: ${[...new Set(duplicates)].join(", ")}`);
      }
    }
    
    if (pattern.fasterThan && context.metrics.totalDuration >= pattern.fasterThan) {
      errors.push(`Not faster than ${pattern.fasterThan}ms benchmark`);
    }
    
    if (pattern.fewerToolsThan && context.metrics.toolCallCount >= pattern.fewerToolsThan) {
      errors.push(`Not fewer tools than ${pattern.fewerToolsThan} benchmark`);
    }
    
    return {
      passed: errors.length === 0,
      message: errors.join("; "),
      details: context.metrics,
    };
  }
  
  static matchError(pattern: ErrorPattern, context: EvalContext): ValidationResult {
    const errors: string[] = [];
    const hasErrors = context.errors.length > 0;
    
    if (pattern.shouldFail && !hasErrors) {
      errors.push("Expected task to fail but it succeeded");
    }
    
    if (!pattern.shouldFail && hasErrors && pattern.noUnhandledErrors) {
      errors.push(`Unhandled errors: ${context.errors.map(e => e.message).join(", ")}`);
    }
    
    if (pattern.expectedErrors) {
      for (const expected of pattern.expectedErrors) {
        const found = context.errors.find(
          e =>
            e.tool === expected.tool &&
            (!expected.messageContains || e.message.includes(expected.messageContains))
        );
        
        if (!found) {
          errors.push(`Expected error from "${expected.tool}" not found`);
        }
      }
    }
    
    return {
      passed: errors.length === 0,
      message: errors.join("; "),
      details: { errors: context.errors },
    };
  }
  
  private static matchToolPattern(pattern: string, tools: string[]): boolean {
    const parts = pattern.split(/\s+/);
    let toolIndex = 0;
    
    for (const part of parts) {
      const tool = part.replace(/[*+?]$/, "");
      const quantifier = part.match(/[*+?]$/)?.[0];
      
      if (!quantifier) {
        if (toolIndex >= tools.length || tools[toolIndex] !== tool) {
          return false;
        }
        toolIndex++;
      } else if (quantifier === "*") {
        while (toolIndex < tools.length && tools[toolIndex] === tool) {
          toolIndex++;
        }
      } else if (quantifier === "+") {
        if (toolIndex >= tools.length || tools[toolIndex] !== tool) {
          return false;
        }
        while (toolIndex < tools.length && tools[toolIndex] === tool) {
          toolIndex++;
        }
      } else if (quantifier === "?") {
        if (toolIndex < tools.length && tools[toolIndex] === tool) {
          toolIndex++;
        }
      }
    }
    
    return toolIndex === tools.length;
  }
  
  private static countTools(tools: string[]): Record<string, number> {
    return tools.reduce((acc, tool) => {
      acc[tool] = (acc[tool] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
