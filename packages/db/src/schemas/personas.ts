import {
  pgTable,
  text,
  timestamp,
  varchar,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { Schema } from 'effect';
import { user } from './auth';
import { type PersonaId, PersonaIdSchema, generatePersonaId } from './brands';
import {
  createEffectSerializer,
  createBatchEffectSerializer,
} from './serialization';

export const persona = pgTable(
  'persona',
  {
    id: varchar('id', { length: 20 })
      .$type<PersonaId>()
      .$default(generatePersonaId)
      .primaryKey(),
    name: text('name').notNull(),
    role: text('role'),
    personalityDescription: text('personalityDescription'),
    speakingStyle: text('speakingStyle'),
    exampleQuotes: jsonb('exampleQuotes').$type<string[]>().default([]),
    voiceId: text('voiceId'),
    voiceName: text('voiceName'),
    avatarStorageKey: text('avatarStorageKey'),
    createdBy: text('createdBy')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('createdAt', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updatedAt', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('persona_createdBy_idx').on(table.createdBy)],
);

export const CreatePersonaSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
  role: Schema.optional(Schema.String),
  personalityDescription: Schema.optional(Schema.String),
  speakingStyle: Schema.optional(Schema.String),
  exampleQuotes: Schema.optional(Schema.Array(Schema.String)),
  voiceId: Schema.optional(Schema.String),
  voiceName: Schema.optional(Schema.String),
});

export const UpdatePersonaSchema = Schema.Struct({
  name: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
  ),
  role: Schema.optional(Schema.String),
  personalityDescription: Schema.optional(Schema.String),
  speakingStyle: Schema.optional(Schema.String),
  exampleQuotes: Schema.optional(Schema.Array(Schema.String)),
  voiceId: Schema.optional(Schema.String),
  voiceName: Schema.optional(Schema.String),
  avatarStorageKey: Schema.optional(Schema.NullOr(Schema.String)),
});

export const PersonaOutputSchema = Schema.Struct({
  id: PersonaIdSchema,
  name: Schema.String,
  role: Schema.NullOr(Schema.String),
  personalityDescription: Schema.NullOr(Schema.String),
  speakingStyle: Schema.NullOr(Schema.String),
  exampleQuotes: Schema.Array(Schema.String),
  voiceId: Schema.NullOr(Schema.String),
  voiceName: Schema.NullOr(Schema.String),
  avatarStorageKey: Schema.NullOr(Schema.String),
  createdBy: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export type Persona = typeof persona.$inferSelect;
export type PersonaOutput = typeof PersonaOutputSchema.Type;
export type CreatePersona = typeof CreatePersonaSchema.Type;
export type UpdatePersona = typeof UpdatePersonaSchema.Type;

const personaTransform = (p: Persona): PersonaOutput => ({
  id: p.id,
  name: p.name,
  role: p.role,
  personalityDescription: p.personalityDescription,
  speakingStyle: p.speakingStyle,
  exampleQuotes: p.exampleQuotes ?? [],
  voiceId: p.voiceId,
  voiceName: p.voiceName,
  avatarStorageKey: p.avatarStorageKey,
  createdBy: p.createdBy,
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
});

export const serializePersonaEffect = createEffectSerializer(
  'persona',
  personaTransform,
);

export const serializePersonasEffect = createBatchEffectSerializer(
  'persona',
  personaTransform,
);

export const serializePersona = personaTransform;
