import { writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Effect } from "effect";
import { readWorkflowRegistry } from "./registry";

const PRODUCT_NAME = "Creator Studio" as const;

const runWorkflowsGeneratePromise = async (): Promise<number> => {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const workflowsDir = resolve(scriptDir, "../../workflows");
  const readmePath = resolve(workflowsDir, "README.md");
  const repoRoot = resolve(workflowsDir, "../..");

  const registry = await readWorkflowRegistry();

  const core = registry.coreWorkflows ?? [];
  const utility = registry.utilitySkills ?? [];

  const coreNameById = new Map(core.map((entry) => [entry.id, entry.name]));

  const laneLink = (lane) => `[\`${lane}\`](../../automations/${lane}/${lane}.md)`;
  const skillLink = (skill) => `[\`${skill}\`](../../.agents/skills/${skill}/SKILL.md)`;
  const workflowDocLink = (entry) => {
    const absolutePath = resolve(repoRoot, entry.docsPath);
    const relativePath = relative(workflowsDir, absolutePath).split("\\").join("/");
    const href = relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
    return `[\`${entry.id}\`](${href})`;
  };

  const renderLanes = (lanes) => {
    if (!lanes || lanes.length === 0) {
      return "No dedicated lane";
    }
    return lanes.map(laneLink).join(", ");
  };

  const renderSkills = (skills) => skills.map(skillLink).join(", ");

  const renderUsedWith = (workflowIds) => {
    if (!workflowIds || workflowIds.length === 0) {
      return "-";
    }

    return workflowIds
      .map((id) => {
        const name = coreNameById.get(id);
        if (!name) {
          throw new Error(`Unknown workflow id in utilitySkills.usedWithWorkflows: ${id}`);
        }
        return `\`${name}\``;
      })
      .join(", ");
  };

  const lines = [];

  lines.push("<!-- GENERATED FILE. DO NOT EDIT DIRECTLY. -->");
  lines.push("<!-- Run `pnpm workflows:generate` to regenerate from registry.json. -->");
  lines.push("");
  lines.push("# Workflow Catalog");
  lines.push("");
  lines.push(`Workflow, skill, and automation-lane reference for ${PRODUCT_NAME}.`);
  lines.push("");
  lines.push("Source of truth: [`software-factory/workflows/registry.json`](./registry.json)");
  lines.push("");
  lines.push("## Terms");
  lines.push("");
  lines.push(
    "- `Workflow`: a documented development or maintenance flow with scope, expected outcome, and workflow-memory key.",
  );
  lines.push("- `Skill`: reusable execution instructions used within a workflow or helper task.");
  lines.push(
    "- `Automation lane`: a scheduled or event-driven wrapper that runs operations with lane-specific policies.",
  );
  lines.push("");
  lines.push("Start in `docs/` for product and code rules. Use this catalog to choose the workflow, skills, and lanes that fit the work.");
  lines.push("");
  lines.push("## Core Workflows");
  lines.push("");
  lines.push("Only core workflows own standalone workflow-memory keys.");
  lines.push("");
  lines.push("| Workflow | Directory | Memory Key | Primary Skills | Automation Lanes | Intent |");
  lines.push("|---|---|---|---|---|---|");

  for (const entry of core) {
    lines.push(
      `| ${entry.name} | ${workflowDocLink(entry)} | \`${entry.memoryKey}\` | ${renderSkills(entry.primarySkills)} | ${renderLanes(entry.automationLanes)} | ${entry.summary} |`,
    );
  }

  lines.push("");
  lines.push("## Utility Skills (Not Workflows)");
  lines.push("");
  lines.push("These are reusable helper skills. They do not define standalone workflow classes.");
  lines.push("");
  lines.push("| Utility Skill | Memory Key | Source Skill | Used With Workflows | Automation Lanes | Purpose |");
  lines.push("|---|---|---|---|---|---|");

  for (const entry of utility) {
    lines.push(
      `| ${entry.name} | \`${entry.memoryKey}\` | ${renderSkills(entry.skills)} | ${renderUsedWith(entry.usedWithWorkflows)} | ${renderLanes(entry.automationLanes)} | ${entry.summary} |`,
    );
  }

  lines.push("");
  lines.push("## Usage");
  lines.push("");
  lines.push("1. Pick the smallest core workflow set that satisfies the change.");
  lines.push("2. Add utility skills only when they reduce risk or improve execution clarity.");
  lines.push("3. Check the linked automation lanes when the work is scheduled, issue-driven, or queue-driven.");
  lines.push("4. Persist workflow-memory notes using the core workflow key(s) that were actually executed.");

  await writeFile(readmePath, `${lines.join("\n")}\n`, "utf8");
  console.log(`Generated ${readmePath}`);
  return 0;
};

export const runWorkflowsGenerate = (): Effect.Effect<number, Error> =>
  Effect.tryPromise({
    try: () => runWorkflowsGeneratePromise(),
    catch: (error) => (error instanceof Error ? error : new Error(String(error))),
  });
