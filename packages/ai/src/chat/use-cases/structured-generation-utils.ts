import { Effect, type Schema } from 'effect';
import type { LLMService } from '../../llm/service';

interface StructuredGenerationAttempt {
  readonly prompt: string;
  readonly temperature: number;
  readonly maxTokens: number;
}

interface StructuredGenerationWithFallbackInput<T> {
  readonly llm: LLMService;
  readonly system: string;
  readonly schema: Schema.Schema<T>;
  readonly primary: StructuredGenerationAttempt;
  readonly fallback: StructuredGenerationAttempt;
}

export function generateStructuredWithFallback<T>({
  llm,
  system,
  schema,
  primary,
  fallback,
}: StructuredGenerationWithFallbackInput<T>) {
  const generate = (attempt: StructuredGenerationAttempt) =>
    llm.generate({
      system,
      prompt: attempt.prompt,
      schema,
      temperature: attempt.temperature,
      maxTokens: attempt.maxTokens,
    });

  return generate(primary).pipe(
    Effect.catchTag('LLMError', () => generate(fallback)),
  );
}
