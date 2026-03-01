import { promises as fs } from "node:fs";
import path from "node:path";

const MEMORY_DIR = path.join("software-factory", "workflow-memory");
const INDEX_PATH = path.join(MEMORY_DIR, "index.json");

export type WorkflowMemoryRetrieveOptions = {
  workflow?: string;
  tags?: string;
  limit?: number;
  minScore?: number;
  month?: string;
  hasScenario: boolean;
  scenarioSkill?: string;
};

async function readJsonArray(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function parseOptionalNumber(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function computeRecency(dateString, now) {
  if (!dateString) return 0;
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return 0;
  const daysAgo = Math.max(0, (now.getTime() - parsed.getTime()) / 86_400_000);
  const horizonDays = 90;
  return clamp01(1 - Math.min(daysAgo, horizonDays) / horizonDays);
}

function computeTagMatch(rowTags, desiredTags) {
  if (!desiredTags.length) return 0;
  const rowSet = new Set(Array.isArray(rowTags) ? rowTags : []);
  let hits = 0;
  for (const tag of desiredTags) {
    if (rowSet.has(tag)) hits += 1;
  }
  return hits / desiredTags.length;
}

export const runWorkflowMemoryRetrieve = async ({
  workflow,
  tags,
  limit,
  minScore,
  month,
  hasScenario,
  scenarioSkill,
}: WorkflowMemoryRetrieveOptions): Promise<number> => {
  const workflowValue = workflow?.trim() ?? "";
  const monthValue = month?.trim() ?? "";
  const scenarioSkillValue = scenarioSkill?.trim() ?? "";
  const tagsValue = tags
    ? tags
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  const limitValue = limit ?? 5;
  const minScoreValue = minScore ?? 0;

  const index = await readJsonArray(INDEX_PATH);
  const now = new Date();

  const scored = index
    .filter((row) => {
      if (!row || typeof row !== "object") return false;
      if (workflowValue && row.workflow !== workflowValue) return false;
      if (monthValue && row.month !== monthValue) return false;
      if (hasScenario && !row.hasScenario) return false;
      if (scenarioSkillValue && row.scenarioSkill !== scenarioSkillValue) return false;
      return true;
    })
    .map((row) => {
      const importance = clamp01(parseOptionalNumber(row.importance) ?? 0);
      const confidence = clamp01(parseOptionalNumber(row.confidence) ?? 0);
      const recency = clamp01(
        parseOptionalNumber(row.recency) ?? computeRecency(row.date, now),
      );
      const tagMatch = clamp01(computeTagMatch(row.tags, tagsValue));
      const score =
        0.4 * importance + 0.3 * recency + 0.2 * tagMatch + 0.1 * confidence;

      return {
        id: row.id,
        date: row.date,
        workflow: row.workflow,
        title: row.title,
        tags: row.tags ?? [],
        score: Number(score.toFixed(4)),
        breakdown: {
          importance,
          recency,
          tagMatch,
          confidence,
        },
        eventFile: row.eventFile,
      };
    })
    .filter((row) => row.score >= minScoreValue)
    .sort((a, b) => b.score - a.score)
    .slice(0, limitValue);

  const response = {
    query: {
      workflow: workflowValue || null,
      tags: tagsValue,
      month: monthValue || null,
      minScore: minScoreValue,
      limit: limitValue,
    },
    results: scored,
  };

  console.log(JSON.stringify(response, null, 2));
  return 0;
};
