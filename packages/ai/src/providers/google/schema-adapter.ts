import { jsonSchema } from 'ai';
import { JSONSchema, type Schema } from 'effect';

type AISDKJsonSchemaInput = Parameters<typeof jsonSchema>[0];

export const effectSchemaToAISDKJsonSchema = <T>(schema: Schema.Schema<T>) => {
  const effectJsonSchema = JSONSchema.make(schema);

  // Effect and AI SDK both target JSON Schema draft-07, but their libraries do
  // not share a single structural type. Keep the cast isolated here.
  return jsonSchema<T>(effectJsonSchema as AISDKJsonSchemaInput);
};
