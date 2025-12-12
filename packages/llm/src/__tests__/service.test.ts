import { Effect, Layer, Schema } from 'effect';
import { LLMError, LLMRateLimitError } from '../errors';
import {
  LLM,
  type LLMService,
  type GenerateResult,
  type GenerateOptions,
} from '../service';

// Test schema
const GreetingSchema = Schema.Struct({
  greeting: Schema.String,
  language: Schema.String,
});

type Greeting = Schema.Schema.Type<typeof GreetingSchema>;

// Mock LLM service for testing
const createMockLLMService = (
  mockGenerate: (
    options: GenerateOptions<any>,
  ) => Effect.Effect<GenerateResult<any>, LLMError | LLMRateLimitError>,
): LLMService => ({
  model: {} as LLMService['model'],
  generate: mockGenerate as any,
});

describe('LLM Service', () => {
  describe('LLM Context.Tag', () => {
    it('should have the correct tag identifier', () => {
      expect(LLM.key).toBe('@repo/llm/LLM');
    });
  });

  describe('generate', () => {
    it('should return typed object from schema', async () => {
      const mockResult: GenerateResult<Greeting> = {
        object: { greeting: 'Hello', language: 'English' },
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
      };

      const mockService = createMockLLMService(() =>
        Effect.succeed(mockResult),
      );
      const MockLLMLive = Layer.succeed(LLM, mockService);

      const program = Effect.gen(function* () {
        const llm = yield* LLM;
        return yield* llm.generate({
          prompt: 'Say hello',
          schema: GreetingSchema,
        });
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(MockLLMLive)),
      );

      expect(result.object).toEqual({ greeting: 'Hello', language: 'English' });
      expect(result.usage).toEqual({
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
      });
    });

    it('should pass system prompt to generate', async () => {
      let capturedOptions: any = null;

      const mockService = createMockLLMService((options) => {
        capturedOptions = options;
        return Effect.succeed({
          object: { greeting: 'Hola', language: 'Spanish' },
        });
      });
      const MockLLMLive = Layer.succeed(LLM, mockService);

      const program = Effect.gen(function* () {
        const llm = yield* LLM;
        return yield* llm.generate({
          system: 'You are a translator',
          prompt: 'Say hello in Spanish',
          schema: GreetingSchema,
        });
      });

      await Effect.runPromise(program.pipe(Effect.provide(MockLLMLive)));

      expect(capturedOptions?.system).toBe('You are a translator');
      expect(capturedOptions?.prompt).toBe('Say hello in Spanish');
    });

    it('should pass temperature and maxTokens options', async () => {
      let capturedOptions: any = null;

      const mockService = createMockLLMService((options) => {
        capturedOptions = options;
        return Effect.succeed({
          object: { greeting: 'Hi', language: 'English' },
        });
      });
      const MockLLMLive = Layer.succeed(LLM, mockService);

      const program = Effect.gen(function* () {
        const llm = yield* LLM;
        return yield* llm.generate({
          prompt: 'Say hi',
          schema: GreetingSchema,
          temperature: 0.5,
          maxTokens: 100,
        });
      });

      await Effect.runPromise(program.pipe(Effect.provide(MockLLMLive)));

      expect(capturedOptions?.temperature).toBe(0.5);
      expect(capturedOptions?.maxTokens).toBe(100);
    });

    it('should handle LLMError failures', async () => {
      const mockService = createMockLLMService(() =>
        Effect.fail(new LLMError({ message: 'API error occurred' })),
      );
      const MockLLMLive = Layer.succeed(LLM, mockService);

      const program = Effect.gen(function* () {
        const llm = yield* LLM;
        return yield* llm.generate({
          prompt: 'Say hello',
          schema: GreetingSchema,
        });
      });

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(MockLLMLive)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause;
        expect(error._tag).toBe('Fail');
      }
    });

    it('should handle LLMRateLimitError failures', async () => {
      const mockService = createMockLLMService(() =>
        Effect.fail(new LLMRateLimitError({ message: 'Rate limit exceeded' })),
      );
      const MockLLMLive = Layer.succeed(LLM, mockService);

      const program = Effect.gen(function* () {
        const llm = yield* LLM;
        return yield* llm.generate({
          prompt: 'Say hello',
          schema: GreetingSchema,
        });
      });

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(MockLLMLive)),
      );

      expect(result._tag).toBe('Failure');
    });

    it('should work with complex nested schemas', async () => {
      const ComplexSchema = Schema.Struct({
        title: Schema.String,
        items: Schema.Array(
          Schema.Struct({
            id: Schema.Number,
            name: Schema.String,
            tags: Schema.Array(Schema.String),
          }),
        ),
        metadata: Schema.Struct({
          createdAt: Schema.String,
          version: Schema.Number,
        }),
      });

      type ComplexType = Schema.Schema.Type<typeof ComplexSchema>;

      const mockResult: GenerateResult<ComplexType> = {
        object: {
          title: 'Test',
          items: [{ id: 1, name: 'Item 1', tags: ['a', 'b'] }],
          metadata: { createdAt: '2024-01-01', version: 1 },
        },
      };

      const mockService = createMockLLMService(() =>
        Effect.succeed(mockResult),
      );
      const MockLLMLive = Layer.succeed(LLM, mockService);

      const program = Effect.gen(function* () {
        const llm = yield* LLM;
        return yield* llm.generate({
          prompt: 'Generate complex data',
          schema: ComplexSchema,
        });
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(MockLLMLive)),
      );

      expect(result.object.title).toBe('Test');
      expect(result.object.items).toHaveLength(1);
      expect(result.object.items[0]?.tags).toEqual(['a', 'b']);
      expect(result.object.metadata.version).toBe(1);
    });

    it('should return undefined usage when not provided', async () => {
      const mockResult: GenerateResult<Greeting> = {
        object: { greeting: 'Hello', language: 'English' },
        // No usage provided
      };

      const mockService = createMockLLMService(() =>
        Effect.succeed(mockResult),
      );
      const MockLLMLive = Layer.succeed(LLM, mockService);

      const program = Effect.gen(function* () {
        const llm = yield* LLM;
        return yield* llm.generate({
          prompt: 'Say hello',
          schema: GreetingSchema,
        });
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(MockLLMLive)),
      );

      expect(result.object).toEqual({ greeting: 'Hello', language: 'English' });
      expect(result.usage).toBeUndefined();
    });
  });
});
