import { Schema } from 'effect';

export class PersonaNotFound extends Schema.TaggedError<PersonaNotFound>()(
  'PersonaNotFound',
  {
    id: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'PERSONA_NOT_FOUND' as const;
  static readonly httpMessage = (e: PersonaNotFound) =>
    e.message ?? `Persona ${e.id} not found`;
  static readonly logLevel = 'silent' as const;
  static getData(e: PersonaNotFound) {
    return { personaId: e.id };
  }
}

export class NotPersonaOwner extends Schema.TaggedError<NotPersonaOwner>()(
  'NotPersonaOwner',
  {
    personaId: Schema.String,
    userId: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 403 as const;
  static readonly httpCode = 'NOT_PERSONA_OWNER' as const;
  static readonly httpMessage = (e: NotPersonaOwner) =>
    e.message ?? 'Only the persona owner can perform this action';
  static readonly logLevel = 'silent' as const;
  static getData(e: NotPersonaOwner) {
    return { personaId: e.personaId };
  }
}
