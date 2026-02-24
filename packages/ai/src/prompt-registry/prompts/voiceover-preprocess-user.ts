import { definePrompt } from '../types';
import { buildCompliance, PROMPT_OWNER } from './shared';

export interface VoiceoverPreprocessUserPromptInput {
  readonly text: string;
  readonly needsTitle: boolean;
}

export const voiceoverPreprocessUserPrompt =
  definePrompt<VoiceoverPreprocessUserPromptInput>({
    id: 'voiceover.preprocess.user',
    version: 1,
    owner: PROMPT_OWNER,
    domain: 'voiceover',
    role: 'user',
    modelType: 'llm',
    riskTier: 'high',
    status: 'active',
    summary: 'Packages source narration text for TTS annotation preprocessing.',
    compliance: buildCompliance({
      userContent: 'required',
      retention: 'resource-bound',
      notes:
        'Carries full source text for transformation and optional title generation.',
    }),
    render: (input) => {
      const lines = [
        'Add TTS annotations to the following text. Return the annotated version in the `annotatedText` field.',
        '',
        '---',
        input.text,
        '---',
      ];

      if (input.needsTitle) {
        lines.push(
          '',
          'Also generate a short, descriptive title (3-6 words) for this text and return it in the `title` field.',
        );
      }

      return lines.join('\n');
    },
  });
