import { Command, Prompt } from '@effect/cli';
import { Console, Effect, Schema } from 'effect';
import { LLM } from '@repo/ai';
import { createAILayer } from '../lib/ai-layer';

const GreetingSchema = Schema.Struct({
  greeting: Schema.String,
  fact: Schema.String,
});

const MODELS = [
  { title: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
  { title: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro-preview-06-05' },
] as const;

const modelPrompt = Prompt.select({
  message: 'Select a model',
  choices: MODELS.map((m) => ({
    title: m.title,
    value: m.value,
    description: m.value,
  })),
});

export const testLlm = Command.prompt('llm', modelPrompt, (model) =>
  Effect.gen(function* () {
    yield* Console.log(`\nUsing model: ${model}`);
    yield* Console.log('Generating structured output...\n');

    const aiLayer = yield* createAILayer({ model });

    const result = yield* Effect.gen(function* () {
      const llm = yield* LLM;
      return yield* llm.generate({
        prompt: 'Generate a friendly greeting and an interesting science fact.',
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
).pipe(Command.withDescription('Test LLM connection and structured output'));
