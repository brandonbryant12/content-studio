import { Effect } from "effect";
import { ExternalToolError, unknownErrorMessage } from "./cli-errors";
import { CliConfig, CliConsole, CliFileSystem, CliProcess } from "./cli-services";
import { OPERATIONS_PATH } from "./control-plane-types";

type DoctorCheck = {
  name: string;
  ok: boolean;
  details: string;
};

type DoctorEnv = CliFileSystem | CliProcess | CliConsole | CliConfig;

const runOptionalCommand = (
  command: string,
  args: string[],
): Effect.Effect<{ status: number; stdout: string; stderr: string }, ExternalToolError, CliProcess | CliConfig> =>
  Effect.gen(function* () {
    const processService = yield* CliProcess;
    const config = yield* CliConfig;
    return yield* processService.run(command, args, {
      cwd: config.cwd,
      allowFailure: true,
    }).pipe(
      Effect.mapError(
        (error) =>
          new ExternalToolError({
            reason: `Failed to run ${command} ${args.join(" ")}: ${unknownErrorMessage(error)}`,
          }),
      ),
    );
  });

export const runDoctor = (): Effect.Effect<number, ExternalToolError, DoctorEnv> =>
  Effect.gen(function* () {
    const fileSystem = yield* CliFileSystem;
    const cliConsole = yield* CliConsole;
    const checks: DoctorCheck[] = [];

    const paths = [OPERATIONS_PATH];
    for (const candidate of paths) {
      const exists = yield* fileSystem.access(candidate).pipe(
        Effect.map(() => true),
        Effect.catchAll(() => Effect.succeed(false)),
      );
      checks.push({
        name: candidate,
        ok: exists,
        details: exists ? "found" : "missing",
      });
    }

    const codexVersion = yield* runOptionalCommand("codex", ["--version"]);
    checks.push({
      name: "codex --version",
      ok: codexVersion.status === 0,
      details: (codexVersion.stdout || codexVersion.stderr || "").trim(),
    });

    const ghStatus = yield* runOptionalCommand("gh", ["auth", "status"]);
    checks.push({
      name: "gh auth status",
      ok: ghStatus.status === 0,
      details: ((ghStatus.stdout || ghStatus.stderr) || "").trim().split("\n")[0] || "",
    });

    let hasMissingRouting = false;
    const routingCheck = yield* runOptionalCommand("gh", [
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
    ]);
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
      yield* cliConsole.log(
        `${check.ok ? "OK" : "FAIL"}  ${check.name}${check.details ? ` - ${check.details}` : ""}`,
      );
    }

    return checks.every((check) => check.ok) ? 0 : 1;
  });

