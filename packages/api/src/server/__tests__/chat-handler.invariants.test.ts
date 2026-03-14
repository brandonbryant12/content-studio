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
  it('routes every chat handler through bindEffectProtocol run/stream helpers', () => {
    const source = readChatRouter();
    const handlerCount =
      source.match(/protectedProcedure\.chat\.[A-Za-z0-9_]+\.handler\(/g) ?? [];
    const boundHandlers =
      source.match(
        /bindEffectProtocol\(\{ context, errors \}\)\.(run|stream)\(/g,
      ) ?? [];

    expect(handlerCount.length).toBeGreaterThan(0);
    expect(boundHandlers).toHaveLength(handlerCount.length);
  });

  it('routes do not call runtime.runPromise directly', () => {
    const source = readChatRouter();
    const forbidden = /context\.runtime\.runPromise/;

    expect(source).not.toMatch(forbidden);
  });
});
