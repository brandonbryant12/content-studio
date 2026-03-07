import { ImageGen, personaAvatarImageUserPrompt, renderPrompt } from '@repo/ai';
import { Storage } from '@repo/storage';
import { Effect } from 'effect';
import { defineAuthedUseCase } from '../../shared';
import { PersonaRepo } from '../repos';

export interface GenerateAvatarInput {
  personaId: string;
}

export const generateAvatar = defineAuthedUseCase<GenerateAvatarInput>()({
  name: 'useCase.generateAvatar',
  span: ({ input }) => ({
    resourceId: input.personaId,
    attributes: { 'persona.id': input.personaId },
  }),
  run: ({ input, user }) =>
    Effect.gen(function* () {
      const imageGen = yield* ImageGen;
      const storage = yield* Storage;
      const personaRepo = yield* PersonaRepo;

      const p = yield* personaRepo.findByIdForUser(input.personaId, user.id);

      const prompt = renderPrompt(personaAvatarImageUserPrompt, {
        name: p.name,
        role: p.role,
        personalityDescription: p.personalityDescription,
      });

      const { imageData, mimeType } = yield* imageGen.generateImage({
        prompt,
        format: 'square',
      });

      const ext = mimeType.includes('png') ? 'png' : 'jpg';
      const storageKey = `personas/${p.id}/avatar.${ext}`;
      yield* storage.upload(storageKey, imageData, mimeType);

      yield* personaRepo.update(p.id, { avatarStorageKey: storageKey });
    }),
});
