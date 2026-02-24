import { Db } from '@repo/db/effect';
import { generateInfographicStylePresetId } from '@repo/db/schema';
import { createTestUser, resetAllFactories, withTestUser } from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { InfographicStylePreset, StyleProperty } from '@repo/db/schema';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { createMockStylePresetRepo } from '../../../test-utils/mock-style-preset-repo';
import { sanitizeStyleProperties } from '../../style-properties';
import { createStylePreset } from '../create-style-preset';

const createStylePresetRecord = (data: {
  name: string;
  properties: StyleProperty[];
  isBuiltIn?: boolean;
  createdBy?: string;
}): InfographicStylePreset => {
  const now = new Date();
  return {
    id: generateInfographicStylePresetId(),
    name: data.name,
    properties: data.properties,
    isBuiltIn: data.isBuiltIn ?? false,
    createdBy: data.createdBy ?? null,
    createdAt: now,
    updatedAt: now,
  };
};

describe('createStylePreset', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('sanitizes properties and persists the preset for the user', async () => {
    const user = createTestUser();
    const insertSpy = vi.fn();

    const repo = createMockStylePresetRepo({
      insert: (data) =>
        Effect.gen(function* () {
          yield* Db;
          insertSpy(data);
          return createStylePresetRecord({
            name: data.name,
            properties: data.properties,
            isBuiltIn: data.isBuiltIn,
            createdBy: data.createdBy,
          });
        }),
    });

    const inputProperties: StyleProperty[] = [
      { key: '  Primary Color ', value: ' #fff ', type: 'color' },
      { key: '', value: 'ignored', type: 'text' },
      { key: 'Font', value: ' Inter ', type: 'text' },
    ];

    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromise(
      withTestUser(user)(
        createStylePreset({
          name: 'My Preset',
          properties: inputProperties,
        }).pipe(Effect.provide(layers)),
      ),
    );

    const expected = sanitizeStyleProperties(inputProperties);
    expect(result.name).toBe('My Preset');
    expect(insertSpy).toHaveBeenCalledTimes(1);
    const insertData = insertSpy.mock.calls[0]![0];
    expect(insertData.properties).toEqual(expected);
    expect(insertData.createdBy).toBe(user.id);
    expect(insertData.isBuiltIn).toBe(false);
  });
});
