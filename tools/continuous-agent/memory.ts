/**
 * Memory system for continuous Claude agent
 * Uses SQLite to persist:
 * - Actions taken
 * - Observations/results
 * - Learnings/insights
 * - Current state/progress
 */

import Database from "better-sqlite3";
import { existsSync } from "fs";

const DB_PATH = new URL("./agent.db", import.meta.url).pathname;

export interface Action {
  id: number;
  timestamp: string;
  type: "task" | "observation" | "learning" | "error" | "checkpoint";
  content: string;
  metadata?: string;
}

export interface Goal {
  id: number;
  description: string;
  status: "active" | "completed" | "paused";
  createdAt: string;
  updatedAt: string;
}

export interface Checkpoint {
  id: number;
  goalId: number;
  summary: string;
  progress: number; // 0-100
  nextSteps: string;
  createdAt: string;
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER,
      timestamp TEXT DEFAULT (datetime('now')),
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      FOREIGN KEY (goal_id) REFERENCES goals(id)
    );

    CREATE TABLE IF NOT EXISTS checkpoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL,
      summary TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      next_steps TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (goal_id) REFERENCES goals(id)
    );

    CREATE TABLE IF NOT EXISTS learnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER,
      category TEXT,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (goal_id) REFERENCES goals(id)
    );

    CREATE INDEX IF NOT EXISTS idx_actions_goal ON actions(goal_id);
    CREATE INDEX IF NOT EXISTS idx_actions_type ON actions(type);
    CREATE INDEX IF NOT EXISTS idx_checkpoints_goal ON checkpoints(goal_id);
  `);
}

export class AgentMemory {
  private db: Database.Database;

  constructor() {
    const isNew = !existsSync(DB_PATH);
    this.db = new Database(DB_PATH);
    this.db.pragma("journal_mode = WAL");

    if (isNew) {
      initDb(this.db);
    }
  }

  // Goal management
  createGoal(description: string): number {
    const stmt = this.db.prepare(
      "INSERT INTO goals (description) VALUES (?)"
    );
    const result = stmt.run(description);
    return result.lastInsertRowid as number;
  }

  getActiveGoal(): Goal | undefined {
    const stmt = this.db.prepare(
      "SELECT * FROM goals WHERE status = 'active' ORDER BY id DESC LIMIT 1"
    );
    const row = stmt.get() as any;
    if (!row) return undefined;
    return {
      id: row.id,
      description: row.description,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  updateGoalStatus(goalId: number, status: Goal["status"]) {
    const stmt = this.db.prepare(
      "UPDATE goals SET status = ?, updated_at = datetime('now') WHERE id = ?"
    );
    stmt.run(status, goalId);
  }

  // Action logging
  logAction(
    goalId: number,
    type: Action["type"],
    content: string,
    metadata?: object
  ): number {
    const stmt = this.db.prepare(
      "INSERT INTO actions (goal_id, type, content, metadata) VALUES (?, ?, ?, ?)"
    );
    const result = stmt.run(
      goalId,
      type,
      content,
      metadata ? JSON.stringify(metadata) : null
    );
    return result.lastInsertRowid as number;
  }

  getRecentActions(goalId: number, limit = 20): Action[] {
    const stmt = this.db.prepare(`
      SELECT * FROM actions
      WHERE goal_id = ?
      ORDER BY id DESC
      LIMIT ?
    `);
    return (stmt.all(goalId, limit) as any[]).reverse().map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      type: row.type,
      content: row.content,
      metadata: row.metadata,
    }));
  }

  // Checkpoints
  createCheckpoint(
    goalId: number,
    summary: string,
    progress: number,
    nextSteps: string
  ): number {
    const stmt = this.db.prepare(`
      INSERT INTO checkpoints (goal_id, summary, progress, next_steps)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(goalId, summary, progress, nextSteps);
    return result.lastInsertRowid as number;
  }

  getLatestCheckpoint(goalId: number): Checkpoint | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM checkpoints
      WHERE goal_id = ?
      ORDER BY id DESC
      LIMIT 1
    `);
    const row = stmt.get(goalId) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      goalId: row.goal_id,
      summary: row.summary,
      progress: row.progress,
      nextSteps: row.next_steps,
      createdAt: row.created_at,
    };
  }

  getAllCheckpoints(goalId: number): Checkpoint[] {
    const stmt = this.db.prepare(`
      SELECT * FROM checkpoints
      WHERE goal_id = ?
      ORDER BY id ASC
    `);
    return (stmt.all(goalId) as any[]).map((row) => ({
      id: row.id,
      goalId: row.goal_id,
      summary: row.summary,
      progress: row.progress,
      nextSteps: row.next_steps,
      createdAt: row.created_at,
    }));
  }

  // Learnings
  addLearning(goalId: number, content: string, category?: string) {
    const stmt = this.db.prepare(`
      INSERT INTO learnings (goal_id, category, content)
      VALUES (?, ?, ?)
    `);
    stmt.run(goalId, category, content);
  }

  getLearnings(goalId?: number): Array<{ category: string; content: string }> {
    const stmt = goalId
      ? this.db.prepare("SELECT * FROM learnings WHERE goal_id = ?")
      : this.db.prepare("SELECT * FROM learnings");
    const rows = goalId ? stmt.all(goalId) : stmt.all();
    return (rows as any[]).map((row) => ({
      category: row.category,
      content: row.content,
    }));
  }

  // Context building for prompts
  buildContext(goalId: number): string {
    const actions = this.getRecentActions(goalId, 30);
    const checkpoint = this.getLatestCheckpoint(goalId);
    const learnings = this.getLearnings(goalId);

    let context = "";

    if (checkpoint) {
      context += `## Current Progress (${checkpoint.progress}%)\n`;
      context += `${checkpoint.summary}\n\n`;
      context += `## Next Steps\n${checkpoint.nextSteps}\n\n`;
    }

    if (learnings.length > 0) {
      context += `## Learnings So Far\n`;
      for (const l of learnings) {
        context += `- ${l.category ? `[${l.category}] ` : ""}${l.content}\n`;
      }
      context += "\n";
    }

    if (actions.length > 0) {
      context += `## Recent Actions\n`;
      for (const a of actions.slice(-10)) {
        context += `- [${a.type}] ${a.content.slice(0, 200)}${a.content.length > 200 ? "..." : ""}\n`;
      }
    }

    return context;
  }

  // Stats
  getStats(goalId: number) {
    const actionsStmt = this.db.prepare(
      "SELECT COUNT(*) as count FROM actions WHERE goal_id = ?"
    );
    const checkpointsStmt = this.db.prepare(
      "SELECT COUNT(*) as count FROM checkpoints WHERE goal_id = ?"
    );
    const learningsStmt = this.db.prepare(
      "SELECT COUNT(*) as count FROM learnings WHERE goal_id = ?"
    );

    return {
      actions: (actionsStmt.get(goalId) as any).count,
      checkpoints: (checkpointsStmt.get(goalId) as any).count,
      learnings: (learningsStmt.get(goalId) as any).count,
    };
  }

  close() {
    this.db.close();
  }
}

// Singleton for easy access
let instance: AgentMemory | null = null;

export function getMemory(): AgentMemory {
  if (!instance) {
    instance = new AgentMemory();
  }
  return instance;
}
