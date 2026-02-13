import { Schema } from 'effect';

/**
 * Generate a random base32 string using Crockford's alphabet.
 * Uses Web Crypto API for cross-platform compatibility.
 */
const generateRandomBase32 = (length: number = 16): string => {
  const alphabet = '0123456789abcdefghjkmnpqrstvwxyz';
  const bytes = new Uint8Array(Math.ceil((length * 5) / 8));
  globalThis.crypto.getRandomValues(bytes);
  let result = '';
  let buffer = 0;
  let bitsLeft = 0;

  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bitsLeft += 8;

    while (bitsLeft >= 5) {
      bitsLeft -= 5;
      result += alphabet[(buffer >> bitsLeft) & 0x1f];
    }
  }

  return result.slice(0, length);
};

// Podcast ID

export const PodcastIdSchema = Schema.String.pipe(
  Schema.pattern(/^pod_[0-9a-hjkmnp-tv-z]{16}$/, {
    message: () => 'Invalid podcast ID format',
  }),
  Schema.brand('PodcastId'),
);

export type PodcastId = typeof PodcastIdSchema.Type;

export const generatePodcastId = (): PodcastId =>
  `pod_${generateRandomBase32()}` as PodcastId;

// Document ID

export const DocumentIdSchema = Schema.String.pipe(
  Schema.pattern(/^doc_[0-9a-hjkmnp-tv-z]{16}$/, {
    message: () => 'Invalid document ID format',
  }),
  Schema.brand('DocumentId'),
);

export type DocumentId = typeof DocumentIdSchema.Type;

export const generateDocumentId = (): DocumentId =>
  `doc_${generateRandomBase32()}` as DocumentId;

// Job ID

export const JobIdSchema = Schema.String.pipe(
  Schema.pattern(/^job_[0-9a-hjkmnp-tv-z]{16}$/, {
    message: () => 'Invalid job ID format',
  }),
  Schema.brand('JobId'),
);

export type JobId = typeof JobIdSchema.Type;

export const generateJobId = (): JobId =>
  `job_${generateRandomBase32()}` as JobId;

// User ID

export const UserIdSchema = Schema.String.pipe(Schema.brand('UserId'));

export type UserId = typeof UserIdSchema.Type;

// Project ID

export const ProjectIdSchema = Schema.String.pipe(
  Schema.pattern(/^prj_[0-9a-hjkmnp-tv-z]{16}$/, {
    message: () => 'Invalid project ID format',
  }),
  Schema.brand('ProjectId'),
);

export type ProjectId = typeof ProjectIdSchema.Type;

export const generateProjectId = (): ProjectId =>
  `prj_${generateRandomBase32()}` as ProjectId;

// Voiceover ID

export const VoiceoverIdSchema = Schema.String.pipe(
  Schema.pattern(/^voc_[0-9a-hjkmnp-tv-z]{16}$/, {
    message: () => 'Invalid voiceover ID format',
  }),
  Schema.brand('VoiceoverId'),
);

export type VoiceoverId = typeof VoiceoverIdSchema.Type;

export const generateVoiceoverId = (): VoiceoverId =>
  `voc_${generateRandomBase32()}` as VoiceoverId;

// Infographic ID

export const InfographicIdSchema = Schema.String.pipe(
  Schema.pattern(/^inf_[0-9a-hjkmnp-tv-z]{16}$/, {
    message: () => 'Invalid infographic ID format',
  }),
  Schema.brand('InfographicId'),
);

export type InfographicId = typeof InfographicIdSchema.Type;

export const generateInfographicId = (): InfographicId =>
  `inf_${generateRandomBase32()}` as InfographicId;

// Activity Log ID

export const ActivityLogIdSchema = Schema.String.pipe(
  Schema.pattern(/^act_[0-9a-hjkmnp-tv-z]{16}$/, {
    message: () => 'Invalid activity log ID format',
  }),
  Schema.brand('ActivityLogId'),
);

export type ActivityLogId = typeof ActivityLogIdSchema.Type;

export const generateActivityLogId = (): ActivityLogId =>
  `act_${generateRandomBase32()}` as ActivityLogId;

// Persona ID

export const PersonaIdSchema = Schema.String.pipe(
  Schema.pattern(/^per_[0-9a-hjkmnp-tv-z]{16}$/, {
    message: () => 'Invalid persona ID format',
  }),
  Schema.brand('PersonaId'),
);

export type PersonaId = typeof PersonaIdSchema.Type;

export const generatePersonaId = (): PersonaId =>
  `per_${generateRandomBase32()}` as PersonaId;

// Infographic Version ID

export const InfographicVersionIdSchema = Schema.String.pipe(
  Schema.pattern(/^inv_[0-9a-hjkmnp-tv-z]{16}$/, {
    message: () => 'Invalid infographic version ID format',
  }),
  Schema.brand('InfographicVersionId'),
);

export type InfographicVersionId = typeof InfographicVersionIdSchema.Type;

export const generateInfographicVersionId = (): InfographicVersionId =>
  `inv_${generateRandomBase32()}` as InfographicVersionId;
