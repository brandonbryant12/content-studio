import type { VoiceoverStatusType } from '../lib/status';

/** Voiceover data for list display */
export interface VoiceoverListItem {
  id: string;
  title: string;
  text: string;
  voice: string;
  voiceName: string | null;
  audioUrl: string | null;
  createdAt: string;
  status: VoiceoverStatusType;
  duration: number | null;
  approvedBy: string | null;
}
