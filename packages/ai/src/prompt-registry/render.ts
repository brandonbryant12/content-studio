import type { PromptDefinition } from './types';

export function renderPrompt(prompt: PromptDefinition<void>): string;
export function renderPrompt<TInput>(
  prompt: PromptDefinition<TInput>,
  input: TInput,
): string;
export function renderPrompt<TInput>(
  prompt: PromptDefinition<TInput>,
  input?: TInput,
): string {
  return prompt.render(input as TInput);
}
