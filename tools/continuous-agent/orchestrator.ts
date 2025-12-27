#!/usr/bin/env tsx
/**
 * Continuous Claude Agent Orchestrator
 *
 * Runs Claude Code in a loop, managing memory and checkpoints.
 *
 * Usage:
 *   pnpm start                          # Resume existing goal
 *   pnpm start "Build feature X"        # Start new goal
 *   pnpm start --max-cycles 10          # Limit iterations
 */

import { spawn } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { getMemory, AgentMemory } from "./memory.js";
import chalk from "chalk";

// Configuration
const CONFIG = {
  maxCycles: parseInt(process.env.MAX_CYCLES || "100"),
  cyclePauseMs: parseInt(process.env.CYCLE_PAUSE_MS || "5000"),
  maxCycleTimeMs: parseInt(process.env.MAX_CYCLE_TIME_MS || "600000"), // 10 min
  workspaceDir: process.env.WORKSPACE_DIR || "/workspace",
};

const PROMPT_TEMPLATE_PATH = new URL("./prompt-template.md", import.meta.url)
  .pathname;
const CURRENT_PROMPT_PATH = new URL("./current-prompt.md", import.meta.url)
  .pathname;

function log(message: string, type: "info" | "success" | "warn" | "error" = "info") {
  const timestamp = new Date().toISOString().slice(11, 19);
  const prefix = {
    info: chalk.blue("ℹ"),
    success: chalk.green("✓"),
    warn: chalk.yellow("⚠"),
    error: chalk.red("✗"),
  }[type];
  console.log(`${chalk.gray(timestamp)} ${prefix} ${message}`);
}

function buildPrompt(goal: string, context: string): string {
  const template = readFileSync(PROMPT_TEMPLATE_PATH, "utf-8");
  return template
    .replace("{{GOAL}}", goal)
    .replace("{{CONTEXT}}", context || "This is a fresh start - no previous context.");
}

function parseOutput(output: string, memory: AgentMemory, goalId: number) {
  // Parse checkpoints
  const checkpointMatch = output.match(
    /=== CHECKPOINT ===\s*\n?Progress:\s*(\d+)%?\s*\n?Summary:\s*(.+?)\s*\n?Next:\s*(.+?)\s*\n?=== END CHECKPOINT ===/is
  );
  if (checkpointMatch) {
    const [, progress, summary, next] = checkpointMatch;
    memory.createCheckpoint(goalId, summary.trim(), parseInt(progress), next.trim());
    log(`Checkpoint: ${progress}% - ${summary.trim().slice(0, 60)}...`, "success");
  }

  // Parse learnings
  const learningMatches = output.matchAll(
    /=== LEARNING ===\s*\n?Category:\s*(.+?)\s*\n?Content:\s*(.+?)\s*\n?=== END LEARNING ===/gis
  );
  for (const match of learningMatches) {
    const [, category, content] = match;
    memory.addLearning(goalId, content.trim(), category.trim());
    log(`Learning: [${category.trim()}] ${content.trim().slice(0, 60)}...`, "info");
  }

  // Check for goal completion
  if (output.includes("=== GOAL COMPLETE ===")) {
    return true;
  }

  return false;
}

async function runCycle(
  memory: AgentMemory,
  goalId: number,
  goal: string,
  cycleNum: number
): Promise<{ completed: boolean; output: string }> {
  log(`Starting cycle ${cycleNum}`, "info");

  // Build context from memory
  const context = memory.buildContext(goalId);
  const prompt = buildPrompt(goal, context);

  // Save current prompt for debugging
  writeFileSync(CURRENT_PROMPT_PATH, prompt);

  // Log that we're starting
  memory.logAction(goalId, "task", `Starting cycle ${cycleNum}`);

  return new Promise((resolve) => {
    let output = "";
    let timedOut = false;

    // Run Claude Code with the prompt
    const claude = spawn(
      "claude",
      [
        "--dangerously-skip-permissions",
        "--print",
        "-p",
        prompt,
      ],
      {
        cwd: CONFIG.workspaceDir,
        env: {
          ...process.env,
          CLAUDE_CODE_ENTRYPOINT: "cli",
        },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    // Timeout handler
    const timeout = setTimeout(() => {
      timedOut = true;
      log(`Cycle ${cycleNum} timed out after ${CONFIG.maxCycleTimeMs}ms`, "warn");
      claude.kill("SIGTERM");
    }, CONFIG.maxCycleTimeMs);

    claude.stdout.on("data", (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(chalk.dim(text));
    });

    claude.stderr.on("data", (data) => {
      const text = data.toString();
      output += text;
      process.stderr.write(chalk.red(text));
    });

    claude.on("close", (code) => {
      clearTimeout(timeout);

      if (timedOut) {
        memory.logAction(goalId, "error", `Cycle ${cycleNum} timed out`);
        resolve({ completed: false, output });
        return;
      }

      if (code !== 0) {
        memory.logAction(goalId, "error", `Cycle ${cycleNum} exited with code ${code}`);
        log(`Cycle ${cycleNum} exited with code ${code}`, "warn");
      }

      // Parse output for checkpoints and learnings
      const goalComplete = parseOutput(output, memory, goalId);

      // Log the cycle as an observation
      memory.logAction(
        goalId,
        "observation",
        `Cycle ${cycleNum} completed. Output length: ${output.length} chars`
      );

      resolve({ completed: goalComplete, output });
    });

    claude.on("error", (err) => {
      clearTimeout(timeout);
      memory.logAction(goalId, "error", `Cycle ${cycleNum} error: ${err.message}`);
      log(`Cycle error: ${err.message}`, "error");
      resolve({ completed: false, output });
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  let goalArg: string | undefined;
  let maxCycles = CONFIG.maxCycles;

  // Parse args
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--max-cycles" && args[i + 1]) {
      maxCycles = parseInt(args[i + 1]);
      i++;
    } else if (!args[i].startsWith("--")) {
      goalArg = args[i];
    }
  }

  const memory = getMemory();

  // Get or create goal
  let goal = memory.getActiveGoal();

  if (goalArg) {
    // Create new goal
    const goalId = memory.createGoal(goalArg);
    goal = memory.getActiveGoal()!;
    log(`Created new goal: ${goalArg}`, "success");
  } else if (!goal) {
    console.log(chalk.yellow("\nNo active goal found."));
    console.log(chalk.gray("Usage: pnpm start \"Your goal description here\"\n"));
    console.log("Example goals:");
    console.log(chalk.cyan('  pnpm start "Add dark mode support to the app"'));
    console.log(chalk.cyan('  pnpm start "Fix all TypeScript errors in the codebase"'));
    console.log(chalk.cyan('  pnpm start "Write tests for the auth module"'));
    process.exit(1);
  } else {
    log(`Resuming goal: ${goal.description}`, "info");
    const checkpoint = memory.getLatestCheckpoint(goal.id);
    if (checkpoint) {
      log(`Last checkpoint: ${checkpoint.progress}% - ${checkpoint.summary}`, "info");
    }
  }

  console.log(chalk.bold("\n🤖 Continuous Claude Agent Starting\n"));
  console.log(chalk.gray("Goal:"), goal.description);
  console.log(chalk.gray("Max cycles:"), maxCycles);
  console.log(chalk.gray("Workspace:"), CONFIG.workspaceDir);
  console.log();

  // Main loop
  let cycle = 0;
  let completed = false;

  while (cycle < maxCycles && !completed) {
    cycle++;

    try {
      const result = await runCycle(memory, goal.id, goal.description, cycle);
      completed = result.completed;

      if (completed) {
        log("Goal completed!", "success");
        memory.updateGoalStatus(goal.id, "completed");
        break;
      }

      // Pause between cycles
      if (cycle < maxCycles) {
        log(`Pausing ${CONFIG.cyclePauseMs}ms before next cycle...`, "info");
        await new Promise((r) => setTimeout(r, CONFIG.cyclePauseMs));
      }
    } catch (err) {
      log(`Cycle ${cycle} failed: ${err}`, "error");
      memory.logAction(goal.id, "error", `Cycle ${cycle} failed: ${err}`);
    }
  }

  // Final summary
  const stats = memory.getStats(goal.id);
  const checkpoint = memory.getLatestCheckpoint(goal.id);

  console.log(chalk.bold("\n📊 Session Summary\n"));
  console.log(chalk.gray("Cycles run:"), cycle);
  console.log(chalk.gray("Total actions:"), stats.actions);
  console.log(chalk.gray("Checkpoints:"), stats.checkpoints);
  console.log(chalk.gray("Learnings:"), stats.learnings);
  if (checkpoint) {
    console.log(chalk.gray("Final progress:"), `${checkpoint.progress}%`);
    console.log(chalk.gray("Last status:"), checkpoint.summary);
  }
  console.log();

  if (!completed && cycle >= maxCycles) {
    log(`Stopped after ${maxCycles} cycles. Run again to continue.`, "warn");
  }

  memory.close();
}

main().catch((err) => {
  console.error(chalk.red("Fatal error:"), err);
  process.exit(1);
});
