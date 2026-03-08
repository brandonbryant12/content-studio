import { Command } from '@effect/cli';
import { downloadVoices } from './download-voices';
import { uploadVoicePreviews } from './upload-voice-previews';

export const seed = Command.make('seed', {}).pipe(
  Command.withDescription('Seed data (voice previews, etc.)'),
  Command.withSubcommands([downloadVoices, uploadVoicePreviews]),
);
