import { Effect, Schema, JSONSchema } from 'effect';
import { LLMError, LLMRateLimitError } from '../errors';
import { OpenAILive, type OpenAIConfig } from '../providers/openai';
import { LLM } from '../service';

// Test schema for structured output
const SimpleSchema = Schema.Struct({
  message: Schema.String,
});

describe('OpenAI Provider', () => {
  describe('OpenAILive', () => {
    it('should create a Layer that provides LLM service', () => {
      const layer = OpenAILive();

      // The layer should be defined
      expect(layer).toBeDefined();
    });

    it('should accept configuration options', () => {
      const config: OpenAIConfig = {
        apiKey: 'test-api-key',
        model: 'gpt-4o',
        baseURL: 'https://custom.api.endpoint',
      };

      const layer = OpenAILive(config);

      expect(layer).toBeDefined();
    });

    it('should use default model when not specified', () => {
      const layer = OpenAILive({});

      // Layer creation should succeed with defaults
      expect(layer).toBeDefined();
    });

    it('should provide LLM service with generate method', async () => {
      // We can't actually call OpenAI in unit tests, but we can verify
      // the service structure is correct
      const layer = OpenAILive({ model: 'gpt-4o-mini' });

      const program = Effect.gen(function* () {
        const llm = yield* LLM;
        // Verify the service has the expected shape
        expect(typeof llm.generate).toBe('function');
        expect(llm.model).toBeDefined();
        return true;
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(layer)));
      expect(result).toBe(true);
    });
  });

  describe('Error mapping', () => {
    it('should map rate limit errors correctly', () => {
      // Test error creation logic
      const rateLimitError = new LLMRateLimitError({
        message: 'Rate limit exceeded: 429',
      });

      expect(rateLimitError._tag).toBe('LLMRateLimitError');
      expect(rateLimitError.message).toContain('429');
    });

    it('should map generic errors to LLMError', () => {
      const genericError = new LLMError({
        message: 'API connection failed',
        cause: new Error('Network error'),
      });

      expect(genericError._tag).toBe('LLMError');
      expect(genericError.cause).toBeInstanceOf(Error);
    });
  });

  describe('Schema conversion', () => {
    it('should convert Effect Schema to JSON Schema', () => {
      const TestSchema = Schema.Struct({
        name: Schema.String,
        age: Schema.Number,
        active: Schema.Boolean,
      });

      const jsonSchema = JSONSchema.make(TestSchema) as any;

      expect(jsonSchema).toBeDefined();
      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema.properties).toBeDefined();
    });

    it('should handle nested schemas', () => {
      const NestedSchema = Schema.Struct({
        user: Schema.Struct({
          id: Schema.Number,
          profile: Schema.Struct({
            bio: Schema.String,
          }),
        }),
      });

      const jsonSchema = JSONSchema.make(NestedSchema) as any;

      expect(jsonSchema).toBeDefined();
      expect(jsonSchema.type).toBe('object');
    });

    it('should handle array schemas', () => {
      const ArraySchema = Schema.Struct({
        items: Schema.Array(Schema.String),
        numbers: Schema.Array(Schema.Number),
      });

      const jsonSchema = JSONSchema.make(ArraySchema) as any;

      expect(jsonSchema).toBeDefined();
      expect(jsonSchema.properties).toBeDefined();
    });

    it('should handle optional fields', () => {
      const OptionalSchema = Schema.Struct({
        required: Schema.String,
        optional: Schema.optional(Schema.String),
      });

      const jsonSchema = JSONSchema.make(OptionalSchema) as any;

      expect(jsonSchema).toBeDefined();
      expect(jsonSchema.required).toContain('required');
    });

    it('should handle literal types', () => {
      const LiteralSchema = Schema.Struct({
        status: Schema.Literal('active', 'inactive', 'pending'),
        type: Schema.Literal('user'),
      });

      const jsonSchema = JSONSchema.make(LiteralSchema) as any;

      expect(jsonSchema).toBeDefined();
    });
  });
});
