import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile, chmod } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const WRAPPER_SOURCE_PATH = path.join(process.cwd(), "automations", "run-operation-wrapper.sh");

const writeExecutable = async (filePath: string, content: string): Promise<void> => {
  await writeFile(filePath, content, "utf8");
  await chmod(filePath, 0o755);
};

const readLogLines = async (logPath: string): Promise<string[]> => {
  const raw = await readFile(logPath, "utf8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
};

describe("automation wrapper profiles", () => {
  it("uses advisory profile bootstrap for researcher lanes", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "automation-wrapper-advisory-"));
    const logPath = path.join(tempRoot, "wrapper.log");
    const binDir = path.join(tempRoot, "bin");
    const scriptsDir = path.join(tempRoot, "scripts", "git");
    const automationsDir = path.join(tempRoot, "automations");
    await mkdir(binDir, { recursive: true });
    await mkdir(scriptsDir, { recursive: true });
    await mkdir(automationsDir, { recursive: true });
    await writeFile(logPath, "", "utf8");

    try {
      const wrapperSource = await readFile(WRAPPER_SOURCE_PATH, "utf8");
      const wrapperPath = path.join(automationsDir, "run-operation-wrapper.sh");
      await writeExecutable(wrapperPath, wrapperSource);

      await writeExecutable(
        path.join(binDir, "git"),
        `#!/usr/bin/env bash
set -euo pipefail
if [[ "$1" == "rev-parse" && "$2" == "--show-toplevel" ]]; then
  printf '%s\\n' "$MOCK_REPO_ROOT"
  exit 0
fi
echo "unexpected git invocation: $*" >&2
exit 1
`,
      );

      await writeExecutable(
        path.join(binDir, "zsh"),
        `#!/usr/bin/env bash
set -euo pipefail
echo "zsh:$*" >> "$WRAPPER_LOG"
`,
      );

      await writeExecutable(
        path.join(scriptsDir, "check-workspace-clean.sh"),
        `#!/usr/bin/env bash
set -euo pipefail
echo "check-workspace:$*" >> "$WRAPPER_LOG"
`,
      );

      const result = spawnSync("bash", [wrapperPath, "best-practice-researcher"], {
        cwd: tempRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ""}`,
          MOCK_REPO_ROOT: tempRoot,
          WRAPPER_LOG: logPath,
        },
      });

      expect(result.status).toBe(0);
      const lines = await readLogLines(logPath);
      const joined = lines.join("\n");
      expect(joined).toContain("pnpm workflow-memory:preflight --bootstrap");
      expect(joined).toContain("pnpm software-factory operation run \"best-practice-researcher\"");
      expect(joined).not.toContain("check-workspace:");
      expect(joined).not.toContain("pnpm install --frozen-lockfile --prefer-offline");
      expect(joined).not.toContain("pnpm software-factory doctor");
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("uses full bootstrap profile for implementation lanes", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "automation-wrapper-implementation-"));
    const logPath = path.join(tempRoot, "wrapper.log");
    const binDir = path.join(tempRoot, "bin");
    const scriptsDir = path.join(tempRoot, "scripts", "git");
    const automationsDir = path.join(tempRoot, "automations");
    await mkdir(binDir, { recursive: true });
    await mkdir(scriptsDir, { recursive: true });
    await mkdir(automationsDir, { recursive: true });
    await writeFile(logPath, "", "utf8");

    try {
      const wrapperSource = await readFile(WRAPPER_SOURCE_PATH, "utf8");
      const wrapperPath = path.join(automationsDir, "run-operation-wrapper.sh");
      await writeExecutable(wrapperPath, wrapperSource);

      await writeExecutable(
        path.join(binDir, "git"),
        `#!/usr/bin/env bash
set -euo pipefail
if [[ "$1" == "rev-parse" && "$2" == "--show-toplevel" ]]; then
  printf '%s\\n' "$MOCK_REPO_ROOT"
  exit 0
fi
echo "unexpected git invocation: $*" >&2
exit 1
`,
      );

      await writeExecutable(
        path.join(binDir, "zsh"),
        `#!/usr/bin/env bash
set -euo pipefail
echo "zsh:$*" >> "$WRAPPER_LOG"
`,
      );

      await writeExecutable(
        path.join(scriptsDir, "check-workspace-clean.sh"),
        `#!/usr/bin/env bash
set -euo pipefail
echo "check-workspace:$*" >> "$WRAPPER_LOG"
`,
      );

      const result = spawnSync("bash", [wrapperPath, "ready-for-dev-executor"], {
        cwd: tempRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ""}`,
          MOCK_REPO_ROOT: tempRoot,
          WRAPPER_LOG: logPath,
        },
      });

      expect(result.status).toBe(0);
      const lines = await readLogLines(logPath);
      const joined = lines.join("\n");
      expect(joined).toContain("check-workspace:--context automation-wrapper");
      expect(joined).toContain("pnpm install --frozen-lockfile --prefer-offline");
      expect(joined).toContain("pnpm workflow-memory:preflight");
      expect(joined).toContain("pnpm software-factory doctor");
      expect(joined).toContain("pnpm software-factory operation run \"ready-for-dev-executor\"");
      expect(joined).not.toContain("pnpm workflow-memory:preflight --bootstrap");
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
