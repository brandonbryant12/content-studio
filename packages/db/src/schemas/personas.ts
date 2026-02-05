import {
  pgTable,
  text,
  timestamp,
  varchar,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { Schema } from 'effect';
import { user } from './auth';
import {
  createEffectSerializer,
  createBatchEffectSerializer,
  createSyncSerializer,
} from './serialization';
import { type PersonaId, PersonaIdSchema, generatePersonaId } from './brands';

// =============================================================================
// Enums
// =============================================================================

export const personaRoleEnum = pgEnum('persona_role', ['host', 'cohost']);

// =============================================================================
// Table
// =============================================================================

export const persona = pgTable(
  'persona',
  {
    id: varchar('id', { length: 20 })
      .$type<PersonaId>()
      .$default(generatePersonaId)
      .primaryKey(),
    name: text('name').notNull(),
    role: personaRoleEnum('role').notNull(),
    voiceId: text('voiceId'),
    voiceName: text('voiceName'),
    personalityDescription: text('personalityDescription'),
    speakingStyle: text('speakingStyle'),
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
  (table) => [
    index('persona_createdBy_idx').on(table.createdBy),
    index('persona_role_idx').on(table.role),
  ],
);

// =============================================================================
// Input Schemas
// =============================================================================

export const CreatePersonaSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  role: Schema.Union(Schema.Literal('host'), Schema.Literal('cohost')),
  voiceId: Schema.optional(Schema.String),
  voiceName: Schema.optional(Schema.String),
  personalityDescription: Schema.optional(Schema.String),
  speakingStyle: Schema.optional(Schema.String),
});

export const UpdatePersonaSchema = Schema.Struct({
  name: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  ),
  role: Schema.optional(
    Schema.Union(Schema.Literal('host'), Schema.Literal('cohost')),
  ),
  voiceId: Schema.optional(Schema.String),
  voiceName: Schema.optional(Schema.String),
  personalityDescription: Schema.optional(Schema.String),
  speakingStyle: Schema.optional(Schema.String),
});

// =============================================================================
// Persona Role Schema
// =============================================================================

export const PersonaRoleSchema = Schema.Union(
  Schema.Literal('host'),
  Schema.Literal('cohost'),
);

// =============================================================================
// Output Schema
// =============================================================================

export const PersonaOutputSchema = Schema.Struct({
  id: PersonaIdSchema,
  name: Schema.String,
  role: PersonaRoleSchema,
  voiceId: Schema.NullOr(Schema.String),
  voiceName: Schema.NullOr(Schema.String),
  personalityDescription: Schema.NullOr(Schema.String),
  speakingStyle: Schema.NullOr(Schema.String),
  createdBy: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

// =============================================================================
// Types
// =============================================================================

export type Persona = typeof persona.$inferSelect;
export type PersonaRole = Persona['role'];
export type PersonaOutput = typeof PersonaOutputSchema.Type;
export type CreatePersona = typeof CreatePersonaSchema.Type;
export type UpdatePersona = typeof UpdatePersonaSchema.Type;

// =============================================================================
// Transform Functions
// =============================================================================

const personaTransform = (p: Persona): PersonaOutput => ({
  id: p.id,
  name: p.name,
  role: p.role,
  voiceId: p.voiceId ?? null,
  voiceName: p.voiceName ?? null,
  personalityDescription: p.personalityDescription ?? null,
  speakingStyle: p.speakingStyle ?? null,
  createdBy: p.createdBy,
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
});

// =============================================================================
// Serializers
// =============================================================================

export const serializePersonaEffect = createEffectSerializer(
  'persona',
  personaTransform,
);

export const serializePersonasEffect = createBatchEffectSerializer(
  'persona',
  personaTransform,
);

export const serializePersona = createSyncSerializer(personaTransform);
