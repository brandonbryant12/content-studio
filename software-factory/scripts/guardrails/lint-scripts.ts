#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runScript } from '../lib/effect-script';
import { checkScriptGuardrails } from './script-guardrails';

export async function main(argv: string[] = process.argv.slice(2)) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('Usage:\n  pnpm software-factory scripts lint');
    return;
  }

  const issues = await checkScriptGuardrails();

  if (issues.length === 0) {
    console.log('Script lint guardrails passed.');
    return;
  }

  console.error(`Script lint guardrails failed with ${issues.length} issue(s):`);
  for (const issue of issues) {
    const location = issue.path ? `${issue.path}: ` : '';
    console.error(`- [${issue.code}] ${location}${issue.message}`);
  }

  process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runScript(main);
}
