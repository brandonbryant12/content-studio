import { Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { effectSchemaToAISDKJsonSchema } from './schema-adapter';

describe('effectSchemaToAISDKJsonSchema', () => {
  it('bridges Effect schemas into AI SDK jsonSchema inputs', async () => {
    const aiSchema = effectSchemaToAISDKJsonSchema(
      Schema.Struct({
        answer: Schema.String,
        count: Schema.Number,
      }),
    );

    expect(aiSchema.jsonSchema).toMatchObject({
      type: 'object',
      required: ['answer', 'count'],
      properties: {
        answer: { type: 'string' },
        count: { type: 'number' },
      },
    });
  });
});
