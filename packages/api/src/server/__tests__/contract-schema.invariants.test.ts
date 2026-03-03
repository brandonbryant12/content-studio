import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..', '..', '..', '..', '..');
const schemaValidationPath = path.join(
  repoRoot,
  'packages/api/src/contracts/__tests__/schema-validation.test.ts',
);

const readSchemaValidation = () =>
  fs.readFileSync(schemaValidationPath, 'utf-8');

describe('contract schema test invariants', () => {
  it('keeps schema-validation tests matrix-driven instead of per-route blocks', () => {
    const source = readSchemaValidation();

    expect(source).toContain('const idSchemaCases');
    expect(source).toContain('const contractCases');
    expect(source).toContain('for (const schemaCase of idSchemaCases)');
    expect(source).toContain('for (const contractCase of contractCases)');

    const itCount = source.match(/\bit\(/g) ?? [];
    expect(
      itCount.length,
      'schema-validation tests should stay compact and matrix-driven.',
    ).toBeLessThanOrEqual(8);

    const perRouteDescribeBlocks =
      source.match(/describe\('(?:documents|podcasts|voiceovers)\./g) ?? [];
    expect(
      perRouteDescribeBlocks,
      'Do not use one describe block per route for UUID/brand checks.',
    ).toEqual([]);
  });
});
