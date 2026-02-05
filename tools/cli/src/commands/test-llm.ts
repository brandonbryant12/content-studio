import { Command, Prompt } from '@effect/cli';
import { Console, Effect, Schema } from 'effect';
import { LLM, type AIProvider } from '@repo/ai';
import { createAILayer } from '../lib/ai-layer';
import { loadEnv } from '../lib/env';

const GreetingSchema = Schema.Struct({
  greeting: Schema.String,
  fact: Schema.String,
});

const PROVIDERS = [
  { title: 'Gemini (Google AI)', value: 'gemini' as const },
  { title: 'Vertex AI (Express)', value: 'vertex' as const },
];

const MODELS = [
  { title: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
  { title: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro-preview-06-05' },
] as const;

const providerPrompt = Prompt.select({
  message: 'Select a provider',
  choices: PROVIDERS.map((p) => ({
    title: p.title,
    value: p.value,
    description: p.value,
  })),
});

const getDefaultKey = (
  provider: AIProvider,
): Effect.Effect<string | undefined> =>
  Effect.gen(function* () {
    const env = yield* loadEnv();
    return provider === 'vertex'
      ? env.GOOGLE_VERTEX_API_KEY
      : env.GEMINI_API_KEY;
  }).pipe(Effect.catchAll(() => Effect.succeed(undefined)));

export const testLlm = Command.make('llm', {}).pipe(
  Command.withHandler(() =>
    Effect.gen(function* () {
      const provider = yield* Prompt.run(providerPrompt);

      const defaultKey = yield* getDefaultKey(provider);
      const apiKey = yield* Prompt.run(
        Prompt.text({
          message: 'API key',
          default: defaultKey,
        }),
      );

      const model = yield* Prompt.run(
        Prompt.select({
          message: 'Select a model',
          choices: MODELS.map((m) => ({
            title: m.title,
            value: m.value,
            description: m.value,
          })),
        }),
      );

      yield* Console.log(`\nUsing ${provider} provider, model: ${model}`);
      yield* Console.log('Generating structured output...\n');

      const aiLayer = createAILayer({ provider, apiKey, model });

      const result = yield* Effect.gen(function* () {
        const llm = yield* LLM;
        return yield* llm.generate({
          prompt:
            'Generate a friendly greeting and an interesting science fact.',
          schema: GreetingSchema,
        });
      }).pipe(Effect.provide(aiLayer));

      yield* Console.log('--- Result ---');
      yield* Console.log(`Greeting: ${result.object.greeting}`);
      yield* Console.log(`Fact: ${result.object.fact}`);
      yield* Console.log('\n--- Token Usage ---');
      yield* Console.log(`  Input:  ${result.usage?.inputTokens ?? 'N/A'}`);
      yield* Console.log(`  Output: ${result.usage?.outputTokens ?? 'N/A'}`);
      yield* Console.log(`  Total:  ${result.usage?.totalTokens ?? 'N/A'}`);
    }),
  ),
  Command.withDescription('Test LLM connection and structured output'),
);
