import { definePrompt } from '../types';
import { buildCompliance, PROMPT_OWNER } from './shared';

export interface PersonaAvatarImageUserPromptInput {
  readonly name: string;
  readonly role?: string | null;
  readonly personalityDescription?: string | null;
}

export const personaAvatarImageUserPrompt =
  definePrompt<PersonaAvatarImageUserPromptInput>({
    id: 'persona.avatar-image.user',
    version: 1,
    owner: PROMPT_OWNER,
    domain: 'persona',
    role: 'user',
    modelType: 'image-gen',
    riskTier: 'medium',
    status: 'active',
    summary:
      'Creates persona avatar generation instructions from persona profile data.',
    compliance: buildCompliance({
      userContent: 'required',
      retention: 'resource-bound',
      notes:
        'May include user-authored persona descriptors for profile image generation.',
    }),
    render: (input) =>
      `Create a professional avatar portrait for a podcast character named "${input.name}". ${input.role ?? ''}. ${input.personalityDescription ?? ''}. Style: clean, modern, digital art portrait suitable for a podcast profile picture.`.trim(),
  });
