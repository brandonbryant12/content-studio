import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

type CommandResult = {
  status: number;
  stdout: string;
  stderr: string;
};

const runGit = (cwd: string, args: string[]): CommandResult => {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
};

const runWorkflowMemorySync = (repoPath: string, message: string): CommandResult => {
  const inlineScript = `
import { Effect } from "effect";
import { runWorkflowMemorySync } from "./software-factory/scripts/workflow-memory/sync-git";

(async () => {
  process.chdir(process.env.TARGET_REPO);
  const status = await Effect.runPromise(
    runWorkflowMemorySync({
      dryRun: false,
      message: process.env.SYNC_MESSAGE,
    }),
  );
  process.exit(status);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
`;

  const result = spawnSync("pnpm", ["exec", "tsx", "-e", inlineScript], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      TARGET_REPO: repoPath,
      SYNC_MESSAGE: message,
    },
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
};

const configureGitIdentity = (repoPath: string): void => {
  expect(runGit(repoPath, ["config", "user.name", "Workflow Memory Test"]).status).toBe(0);
  expect(runGit(repoPath, ["config", "user.email", "workflow-memory-test@example.com"]).status).toBe(0);
};

describe("workflow-memory sync git resilience", () => {
  it("rebases and pushes memory commits even when local non-memory changes are dirty", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "workflow-memory-sync-"));
    const remotePath = path.join(tempRoot, "remote.git");
    const repoAPath = path.join(tempRoot, "repo-a");
    const repoBPath = path.join(tempRoot, "repo-b");
    const eventId = "2026-03-02-workflow-memory-sync-dirty-rebase";

    try {
      expect(runGit(tempRoot, ["init", "--bare", remotePath]).status).toBe(0);
      expect(runGit(tempRoot, ["clone", remotePath, repoAPath]).status).toBe(0);
      configureGitIdentity(repoAPath);

      await mkdir(path.join(repoAPath, "software-factory", "workflow-memory", "events"), {
        recursive: true,
      });
      await mkdir(path.join(repoAPath, "software-factory", "workflow-memory", "summaries"), {
        recursive: true,
      });
      await writeFile(
        path.join(repoAPath, "software-factory", "workflow-memory", "events", "2026-03.jsonl"),
        "",
        "utf8",
      );
      await writeFile(
        path.join(repoAPath, "software-factory", "workflow-memory", "summaries", ".gitkeep"),
        "",
        "utf8",
      );
      await writeFile(
        path.join(repoAPath, "software-factory", "workflow-memory", "index.json"),
        "[]\n",
        "utf8",
      );
      await writeFile(path.join(repoAPath, "notes.txt"), "base\n", "utf8");

      expect(runGit(repoAPath, ["checkout", "-b", "main"]).status).toBe(0);
      expect(runGit(repoAPath, ["add", "."]).status).toBe(0);
      expect(runGit(repoAPath, ["commit", "-m", "chore: seed repo"]).status).toBe(0);
      expect(runGit(repoAPath, ["push", "-u", "origin", "main"]).status).toBe(0);
      expect(runGit(remotePath, ["symbolic-ref", "HEAD", "refs/heads/main"]).status).toBe(0);

      expect(runGit(tempRoot, ["clone", remotePath, repoBPath]).status).toBe(0);
      configureGitIdentity(repoBPath);
      await writeFile(path.join(repoBPath, "remote-update.txt"), "remote\n", "utf8");
      expect(runGit(repoBPath, ["add", "remote-update.txt"]).status).toBe(0);
      expect(runGit(repoBPath, ["commit", "-m", "chore: remote update"]).status).toBe(0);
      expect(runGit(repoBPath, ["push", "origin", "main"]).status).toBe(0);

      // Dirty tracked non-memory change in repo A.
      await writeFile(path.join(repoAPath, "notes.txt"), "dirty-local-change\n", "utf8");
      await writeFile(
        path.join(repoAPath, "software-factory", "workflow-memory", "events", "2026-03.jsonl"),
        `${JSON.stringify({
          id: eventId,
          date: "2026-03-02",
          workflow: "Periodic Scans",
          title: "Workflow memory sync dirty rebase test",
          trigger: "test",
          finding: "test",
          evidence: "test",
          followUp: "test",
          owner: "@test",
          status: "open",
          severity: "low",
          tags: ["automation", "workflow-memory"],
        })}\n`,
        "utf8",
      );

      const syncResult = runWorkflowMemorySync(
        repoAPath,
        "chore(workflow-memory): dirty rebase sync test",
      );
      expect(syncResult.status, `${syncResult.stdout}\n${syncResult.stderr}`).toBe(0);
      expect(syncResult.stdout).toContain("Push rejected by concurrent updates");
      expect(syncResult.stdout).toContain("Workflow-memory sync complete");

      const statusResult = runGit(repoAPath, ["status", "--short"]);
      expect(statusResult.status).toBe(0);
      expect(statusResult.stdout).toContain(" M notes.txt");

      const aheadBehind = runGit(repoAPath, ["rev-list", "--left-right", "--count", "origin/main...main"]);
      expect(aheadBehind.status).toBe(0);
      expect(aheadBehind.stdout.trim()).toBe("0\t0");

      const remoteEventFile = runGit(
        repoAPath,
        ["show", "origin/main:software-factory/workflow-memory/events/2026-03.jsonl"],
      );
      expect(remoteEventFile.status).toBe(0);
      expect(remoteEventFile.stdout).toContain(eventId);

      const notesContent = await readFile(path.join(repoAPath, "notes.txt"), "utf8");
      expect(notesContent).toBe("dirty-local-change\n");
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
