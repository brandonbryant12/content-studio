import { promises as fs } from "node:fs";
import { runCommand } from "../lib/command";
import { OPERATIONS_PATH } from "./control-plane-types";

export const runDoctor = async (): Promise<number> => {
  const checks: Array<{ name: string; ok: boolean; details: string }> = [];

  const paths = [OPERATIONS_PATH];
  for (const candidate of paths) {
    try {
      await fs.access(candidate);
      checks.push({ name: candidate, ok: true, details: "found" });
    } catch {
      checks.push({ name: candidate, ok: false, details: "missing" });
    }
  }

  const codexVersion = await runCommand("codex", ["--version"], {
    cwd: process.cwd(),
    allowFailure: true,
  });
  checks.push({
    name: "codex --version",
    ok: codexVersion.status === 0,
    details: (codexVersion.stdout || codexVersion.stderr || "").trim(),
  });

  const ghStatus = await runCommand("gh", ["auth", "status"], {
    cwd: process.cwd(),
    allowFailure: true,
  });
  checks.push({
    name: "gh auth status",
    ok: ghStatus.status === 0,
    details: ((ghStatus.stdout || ghStatus.stderr) || "").trim().split("\n")[0] || "",
  });

  let hasMissingRouting = false;
  const routingCheck = await runCommand(
    "gh",
    [
      "issue",
      "list",
      "--state",
      "open",
      "--label",
      "ready-for-dev",
      "--limit",
      "200",
      "--json",
      "number,labels",
      "--jq",
      '[.[] | {n:.number,m:([.labels[].name|select(startswith("model:"))]|length),t:([.labels[].name|select(startswith("thinking:"))]|length)} | select(.m!=1 or .t!=1)] | length',
    ],
    { cwd: process.cwd(), allowFailure: true },
  );
  if (routingCheck.status === 0) {
    const count = Number.parseInt((routingCheck.stdout || "0").trim(), 10);
    hasMissingRouting = Number.isFinite(count) && count > 0;
    checks.push({
      name: "ready-for-dev routing labels",
      ok: !hasMissingRouting,
      details: hasMissingRouting ? `${count} issues missing model/thinking labels` : "ok",
    });
  } else {
    checks.push({
      name: "ready-for-dev routing labels",
      ok: false,
      details: (routingCheck.stderr || routingCheck.stdout || "").trim(),
    });
  }

  for (const check of checks) {
    console.log(`${check.ok ? "OK" : "FAIL"}  ${check.name}${check.details ? ` - ${check.details}` : ""}`);
  }

  return checks.every((check) => check.ok) ? 0 : 1;
};
