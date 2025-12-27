#!/usr/bin/env tsx
/**
 * Status viewer for continuous Claude agent
 *
 * Shows current goal, progress, checkpoints, and learnings.
 *
 * Usage:
 *   pnpm status              # Show current status
 *   pnpm status --full       # Show all history
 *   pnpm status --learnings  # Show only learnings
 */

import { getMemory } from "./memory.js";
import chalk from "chalk";
import { formatDistanceToNow } from "date-fns";

function formatTime(isoString: string): string {
  try {
    return formatDistanceToNow(new Date(isoString), { addSuffix: true });
  } catch {
    return isoString;
  }
}

function progressBar(percent: number, width = 30): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const bar = chalk.green("█".repeat(filled)) + chalk.gray("░".repeat(empty));
  return `[${bar}] ${percent}%`;
}

async function main() {
  const args = process.argv.slice(2);
  const showFull = args.includes("--full");
  const showLearningsOnly = args.includes("--learnings");

  const memory = getMemory();
  const goal = memory.getActiveGoal();

  if (!goal) {
    console.log(chalk.yellow("\nNo active goal found.\n"));
    console.log("Start a new goal with:");
    console.log(chalk.cyan('  pnpm start "Your goal description"\n'));
    process.exit(0);
  }

  const stats = memory.getStats(goal.id);
  const checkpoint = memory.getLatestCheckpoint(goal.id);
  const checkpoints = memory.getAllCheckpoints(goal.id);
  const learnings = memory.getLearnings(goal.id);
  const actions = memory.getRecentActions(goal.id, showFull ? 100 : 10);

  console.log(chalk.bold("\n🤖 Continuous Claude Agent Status\n"));
  console.log(chalk.gray("━".repeat(50)));

  // Goal info
  console.log(chalk.bold("\n📎 Goal"));
  console.log(chalk.white(`   ${goal.description}`));
  console.log(chalk.gray(`   Status: ${goal.status}`));
  console.log(chalk.gray(`   Started: ${formatTime(goal.createdAt)}`));

  // Progress
  if (checkpoint) {
    console.log(chalk.bold("\n📊 Progress"));
    console.log(`   ${progressBar(checkpoint.progress)}`);
    console.log(chalk.gray(`   ${checkpoint.summary}`));
    console.log(chalk.cyan(`   Next: ${checkpoint.nextSteps}`));
  }

  // Stats
  console.log(chalk.bold("\n📈 Stats"));
  console.log(chalk.gray(`   Actions: ${stats.actions}`));
  console.log(chalk.gray(`   Checkpoints: ${stats.checkpoints}`));
  console.log(chalk.gray(`   Learnings: ${stats.learnings}`));

  // Learnings
  if (learnings.length > 0) {
    console.log(chalk.bold("\n💡 Learnings"));
    for (const l of learnings) {
      const cat = l.category ? chalk.yellow(`[${l.category}]`) : "";
      console.log(`   ${cat} ${l.content}`);
    }
  }

  if (showLearningsOnly) {
    console.log();
    memory.close();
    return;
  }

  // Checkpoints history
  if (showFull && checkpoints.length > 0) {
    console.log(chalk.bold("\n🏁 Checkpoint History"));
    for (const cp of checkpoints) {
      console.log(
        chalk.gray(`   ${formatTime(cp.createdAt)}`),
        chalk.green(`${cp.progress}%`),
        chalk.white(cp.summary.slice(0, 60))
      );
    }
  }

  // Recent actions
  if (actions.length > 0) {
    console.log(chalk.bold(`\n📝 Recent Actions ${showFull ? "(all)" : "(last 10)"}`));
    for (const a of actions) {
      const typeColor = {
        task: chalk.blue,
        observation: chalk.cyan,
        learning: chalk.yellow,
        error: chalk.red,
        checkpoint: chalk.green,
      }[a.type] || chalk.gray;

      console.log(
        chalk.gray(`   ${formatTime(a.timestamp)}`),
        typeColor(`[${a.type}]`),
        a.content.slice(0, 60) + (a.content.length > 60 ? "..." : "")
      );
    }
  }

  console.log(chalk.gray("\n" + "━".repeat(50)));
  console.log(chalk.gray("Run with --full for complete history"));
  console.log();

  memory.close();
}

main().catch((err) => {
  console.error(chalk.red("Error:"), err);
  process.exit(1);
});
