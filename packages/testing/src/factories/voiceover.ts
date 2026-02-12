import {
  generateVoiceoverId,
  type VoiceoverId,
  type Voiceover,
  type VoiceoverStatus,
} from '@repo/db/schema';

export interface CreateTestVoiceoverOptions {
  id?: VoiceoverId;
  title?: string;
  text?: string;
  voice?: string;
  voiceName?: string | null;
  audioUrl?: string | null;
  duration?: number | null;
  status?: VoiceoverStatus;
  errorMessage?: string | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

let voiceoverCounter = 0;

export function createTestVoiceover(
  options: CreateTestVoiceoverOptions = {},
): Voiceover {
  voiceoverCounter++;
  const now = new Date();

  return {
    id: options.id ?? generateVoiceoverId(),
    title: options.title ?? `Test Voiceover ${voiceoverCounter}`,
    text: options.text ?? 'This is test voiceover text.',
    voice: options.voice ?? 'Charon',
    voiceName: options.voiceName ?? 'Charon',
    audioUrl: options.audioUrl ?? null,
    duration: options.duration ?? null,
    status: options.status ?? 'drafting',
    errorMessage: options.errorMessage ?? null,
    approvedBy: options.approvedBy ?? null,
    approvedAt: options.approvedAt ?? null,
    createdBy: options.createdBy ?? 'test-user-id',
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  };
}

export function resetVoiceoverCounter() {
  voiceoverCounter = 0;
}
