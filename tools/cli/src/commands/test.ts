import { Command } from '@effect/cli';
import { testLlm } from './test-llm';
import { testTts } from './test-tts';
import { testStorage } from './test-storage';

export const test = Command.make('test', {}).pipe(
  Command.withDescription('Test integrations (LLM, TTS, Storage)'),
  Command.withSubcommands([testLlm, testTts, testStorage]),
);
