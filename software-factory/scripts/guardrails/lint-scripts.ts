import { checkScriptGuardrails } from './script-guardrails';
import { Effect } from "effect";

const runScriptGuardrailsLintPromise = async (): Promise<number> => {
  const issues = await checkScriptGuardrails();

  if (issues.length === 0) {
    console.log('Script lint guardrails passed.');
    return 0;
  }

  console.error(`Script lint guardrails failed with ${issues.length} issue(s):`);
  for (const issue of issues) {
    const location = issue.path ? `${issue.path}: ` : '';
    console.error(`- [${issue.code}] ${location}${issue.message}`);
  }

  return 1;
};

export const runScriptGuardrailsLint = (): Effect.Effect<number, Error> =>
  Effect.tryPromise({
    try: () => runScriptGuardrailsLintPromise(),
    catch: (error) => (error instanceof Error ? error : new Error(String(error))),
  });
