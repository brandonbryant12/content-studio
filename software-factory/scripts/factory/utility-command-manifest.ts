export type UtilityPackageScript = {
  name: string;
  command: string;
};

export type UtilityCommandSpec = {
  key: string;
  domain: string;
  action: string;
  usage: string;
  packageScripts: readonly UtilityPackageScript[];
};

export const UTILITY_COMMAND_SPECS = [
  {
    key: "skills:check",
    domain: "skills",
    action: "check",
    usage: "pnpm software-factory skills check [--strict] [--json]",
    packageScripts: [
      {
        name: "skills:check",
        command: "pnpm software-factory skills check",
      },
      {
        name: "skills:check:strict",
        command: "pnpm software-factory skills check --strict",
      },
    ],
  },
  {
    key: "workflows:generate",
    domain: "workflows",
    action: "generate",
    usage: "pnpm software-factory workflows generate",
    packageScripts: [
      {
        name: "workflows:generate",
        command: "pnpm software-factory workflows generate",
      },
    ],
  },
  {
    key: "workflow-memory:add-entry",
    domain: "workflow-memory",
    action: "add-entry",
    usage:
      "pnpm software-factory workflow-memory add-entry --workflow <text> --title <text> --trigger <text> --finding <text> --evidence <text> --follow-up <text> --owner <text> --status <text> [options]",
    packageScripts: [
      {
        name: "workflow-memory:add-entry",
        command: "pnpm software-factory workflow-memory add-entry",
      },
    ],
  },
  {
    key: "workflow-memory:preflight",
    domain: "workflow-memory",
    action: "preflight",
    usage: "pnpm software-factory workflow-memory preflight [--bootstrap] [--cwd <path>] [--memory-path <path>]",
    packageScripts: [
      {
        name: "workflow-memory:preflight",
        command: "pnpm software-factory workflow-memory preflight",
      },
    ],
  },
  {
    key: "workflow-memory:sync",
    domain: "workflow-memory",
    action: "sync",
    usage:
      "pnpm software-factory workflow-memory sync [--remote <name>] [--branch <name>] [--message <text>] [--max-attempts <n>] [--dry-run]",
    packageScripts: [
      {
        name: "workflow-memory:sync",
        command: "pnpm software-factory workflow-memory sync",
      },
    ],
  },
  {
    key: "workflow-memory:retrieve",
    domain: "workflow-memory",
    action: "retrieve",
    usage:
      "pnpm software-factory workflow-memory retrieve [--workflow <name>] [--tags <csv>] [--limit <n>] [--min-score <n>] [--month YYYY-MM] [--has-scenario] [--scenario-skill <name>]",
    packageScripts: [
      {
        name: "workflow-memory:retrieve",
        command: "pnpm software-factory workflow-memory retrieve",
      },
    ],
  },
  {
    key: "workflow-memory:compact",
    domain: "workflow-memory",
    action: "compact",
    usage:
      "pnpm software-factory workflow-memory compact [--archive-closed] [--days <n>] [--dry-run]",
    packageScripts: [
      {
        name: "workflow-memory:compact",
        command: "pnpm software-factory workflow-memory compact",
      },
    ],
  },
  {
    key: "workflow-memory:coverage",
    domain: "workflow-memory",
    action: "coverage",
    usage:
      "pnpm software-factory workflow-memory coverage [--month YYYY-MM] [--min <n>] [--strict] [--json] [--audit-taxonomy]",
    packageScripts: [
      {
        name: "workflow-memory:coverage",
        command: "pnpm software-factory workflow-memory coverage",
      },
      {
        name: "workflow-memory:coverage:strict",
        command: "pnpm software-factory workflow-memory coverage --strict",
      },
    ],
  },
  {
    key: "scenario:validate",
    domain: "scenario",
    action: "validate",
    usage: "pnpm software-factory scenario validate [--strict]",
    packageScripts: [
      {
        name: "scenario:validate",
        command: "pnpm software-factory scenario validate",
      },
      {
        name: "scenario:validate:strict",
        command: "pnpm software-factory scenario validate --strict",
      },
    ],
  },
  {
    key: "scripts:lint",
    domain: "scripts",
    action: "lint",
    usage: "pnpm software-factory scripts lint",
    packageScripts: [
      {
        name: "scripts:lint",
        command: "pnpm software-factory scripts lint",
      },
    ],
  },
  {
    key: "spec:generate",
    domain: "spec",
    action: "generate",
    usage: "pnpm software-factory spec generate",
    packageScripts: [
      {
        name: "spec:generate",
        command: "pnpm software-factory spec generate",
      },
    ],
  },
] as const satisfies readonly UtilityCommandSpec[];

export type UtilityCommandKey = (typeof UTILITY_COMMAND_SPECS)[number]["key"];

export const UTILITY_USAGE_LINES = UTILITY_COMMAND_SPECS.map((entry) => entry.usage);

export const REQUIRED_UTILITY_PACKAGE_SCRIPTS: Record<string, string> = Object.fromEntries(
  UTILITY_COMMAND_SPECS.flatMap((entry) =>
    entry.packageScripts.map((script) => [script.name, script.command] as const),
  ),
);

export const findUtilityCommandSpec = (
  domain: string,
  action: string | undefined,
): UtilityCommandSpec | null => {
  if (!action) {
    return null;
  }

  return (
    UTILITY_COMMAND_SPECS.find((entry) => entry.domain === domain && entry.action === action) ??
    null
  );
};
