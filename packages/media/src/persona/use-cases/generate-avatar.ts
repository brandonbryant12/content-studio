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

    const traits = [p.role, p.personalityDescription]
      .filter(Boolean)
      .join('. ');
    const prompt =
      `Cartoon headshot portrait of a person named "${p.name}". ${traits}. Style: friendly cartoon illustration, head and shoulders only, clean solid-color background, warm lighting, expressive face. NOT photorealistic, NOT full body.`.trim();

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
