import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..', '..', '..', '..');
const mediaEslintConfigPath = path.join(
  repoRoot,
  'packages/media/eslint.config.js',
);

const lintWithMediaConfig = async (source: string, fileName: string) => {
  const eslint = new ESLint({
    cwd: repoRoot,
    ignore: false,
    overrideConfigFile: mediaEslintConfigPath,
  });

  const tempDir = fs.mkdtempSync(path.join(repoRoot, '.tmp-eslint-layer-'));
  try {
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, source, 'utf-8');

    const [result] = await eslint.lintFiles([filePath]);
    return result;
  } finally {
    fs.rmSync(tempDir, { force: true, recursive: true });
  }
};

describe('repo-custom/no-layer-succeed-construction', () => {
  it('rejects direct factory calls in production files', async () => {
    const result = await lintWithMediaConfig(
      `
        import { Layer } from 'effect';

        const Service = {};
        const makeService = () => ({ ready: true });

        export const BadLayer = Layer.succeed(Service, makeService());
      `,
      'layer-succeed-fixture.ts',
    );

    expect(
      result.messages.some(
        (message) =>
          message.ruleId === 'repo-custom/no-layer-succeed-construction',
      ),
    ).toBe(true);
  });

  it('rejects inline constructors hidden inside Layer.succeed object literals', async () => {
    const result = await lintWithMediaConfig(
      `
        import { Layer } from 'effect';

        class ExampleClient {}
        const Service = {};

        export const BadLayer = Layer.succeed(Service, {
          client: new ExampleClient(),
        });
      `,
      'layer-succeed-object-fixture.ts',
    );

    expect(
      result.messages.some(
        (message) =>
          message.ruleId === 'repo-custom/no-layer-succeed-construction',
      ),
    ).toBe(true);
  });

  it('allows the same pattern in test files', async () => {
    const result = await lintWithMediaConfig(
      `
        import { Layer } from 'effect';

        const Service = {};
        const makeService = () => ({ ready: true });

        export const TestLayer = Layer.succeed(Service, makeService());
      `,
      'layer-succeed-fixture.test.ts',
    );

    expect(
      result.messages.filter(
        (message) =>
          message.ruleId === 'repo-custom/no-layer-succeed-construction',
      ),
    ).toEqual([]);
  });
});
