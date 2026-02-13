import { ImageGen } from '@repo/ai';
import { Storage } from '@repo/storage';
import { Effect } from 'effect';
import { PersonaRepo } from '../repos';

export interface GenerateAvatarInput {
  personaId: string;
}

export const generateAvatar = (input: GenerateAvatarInput) =>
  Effect.gen(function* () {
    const imageGen = yield* ImageGen;
    const storage = yield* Storage;
    const personaRepo = yield* PersonaRepo;

    const p = yield* personaRepo.findById(input.personaId);

    const prompt =
      `Create a professional avatar portrait for a podcast character named "${p.name}". ${p.role ?? ''}. ${p.personalityDescription ?? ''}. Style: clean, modern, digital art portrait suitable for a podcast profile picture.`.trim();

    const { imageData, mimeType } = yield* imageGen.generateImage({
      prompt,
      format: 'square',
    });

    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const storageKey = `personas/${p.id}/avatar.${ext}`;
    yield* storage.upload(storageKey, imageData, mimeType);

    yield* personaRepo.update(p.id, { avatarStorageKey: storageKey });
  }).pipe(
    Effect.catchAll(() => Effect.void),
    Effect.withSpan('useCase.generateAvatar', {
      attributes: { 'persona.id': input.personaId },
    }),
  );
