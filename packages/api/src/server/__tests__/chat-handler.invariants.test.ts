import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..', '..', '..', '..', '..');

const chatRouterPath = path.join(
  repoRoot,
  'packages/api/src/server/router/chat.ts',
);

const readChatRouter = () => fs.readFileSync(chatRouterPath, 'utf-8');

describe('chat handler invariants', () => {
  it('routes use handler pipeline helpers for protocol + spans', () => {
    const source = readChatRouter();

    expect(source).toContain('bindEffectProtocol');
    expect(source).toContain('.run(');
    expect(source).toContain('.stream(');
  });

  it('routes do not call runtime.runPromise directly', () => {
    const source = readChatRouter();
    const forbidden = /context\.runtime\.runPromise/;

    expect(source).not.toMatch(forbidden);
  });

  it('routes bind request protocol context for each handler', () => {
    const source = readChatRouter();
    const matches =
      source.match(
        /bindEffectProtocol\(\{ context, errors \}\)\.(run|stream)\(/g,
      ) ?? [];

    expect(matches).toHaveLength(5);
  });
});
