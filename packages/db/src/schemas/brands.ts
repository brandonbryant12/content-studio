/**
 * Branded ID Types
 *
 * Provides type-safe, readable ID types for domain entities.
 * IDs use prefixes (e.g., `pod_xxx`, `doc_xxx`) for better debugging
 * and API ergonomics.
 *
 * Pattern: {prefix}_{base32-encoded-random}
 * - Prefixes: pod_, doc_, job_, col_, prj_
 * - Base32 encoding (lowercase, no padding) for URL-safe, readable IDs
 */
import { Schema } from 'effect';

// =============================================================================
// ID Generation Helper
// =============================================================================

/**
 * Generate a random base32 string (16 chars = 80 bits of entropy).
 * Uses Crockford's base32 alphabet (lowercase) for readability.
 * Uses Web Crypto API for cross-platform compatibility (Node.js + browser).
 */
const generateRandomBase32 = (length: number = 16): string => {
  const alphabet = '0123456789abcdefghjkmnpqrstvwxyz'; // Crockford's base32 (no i, l, o, u)
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

// =============================================================================
// Podcast ID
// =============================================================================

export const PodcastIdSchema = Schema.String.pipe(
  Schema.pattern(/^pod_[0-9a-hjkmnp-tv-z]{16}$/, {
    message: () => 'Invalid podcast ID format',
  }),
  Schema.brand('PodcastId'),
);

export type PodcastId = typeof PodcastIdSchema.Type;

export const generatePodcastId = (): PodcastId =>
  `pod_${generateRandomBase32()}` as PodcastId;

// =============================================================================
// Document ID
// =============================================================================

export const DocumentIdSchema = Schema.String.pipe(
  Schema.pattern(/^doc_[0-9a-hjkmnp-tv-z]{16}$/, {
    message: () => 'Invalid document ID format',
  }),
  Schema.brand('DocumentId'),
);

export type DocumentId = typeof DocumentIdSchema.Type;

export const generateDocumentId = (): DocumentId =>
  `doc_${generateRandomBase32()}` as DocumentId;

// =============================================================================
// Job ID
// =============================================================================

export const JobIdSchema = Schema.String.pipe(
  Schema.pattern(/^job_[0-9a-hjkmnp-tv-z]{16}$/, {
    message: () => 'Invalid job ID format',
  }),
  Schema.brand('JobId'),
);

export type JobId = typeof JobIdSchema.Type;

export const generateJobId = (): JobId =>
  `job_${generateRandomBase32()}` as JobId;

// =============================================================================
// User ID (from auth - likely stays as UUID from better-auth)
// =============================================================================

export const UserIdSchema = Schema.String.pipe(Schema.brand('UserId'));

export type UserId = typeof UserIdSchema.Type;

// =============================================================================
// Project ID
// =============================================================================

export const ProjectIdSchema = Schema.String.pipe(
  Schema.pattern(/^prj_[0-9a-hjkmnp-tv-z]{16}$/, {
    message: () => 'Invalid project ID format',
  }),
  Schema.brand('ProjectId'),
);

export type ProjectId = typeof ProjectIdSchema.Type;

export const generateProjectId = (): ProjectId =>
  `prj_${generateRandomBase32()}` as ProjectId;

// =============================================================================
// Collaborator ID
// =============================================================================

export const CollaboratorIdSchema = Schema.String.pipe(
  Schema.pattern(/^col_[0-9a-hjkmnp-tv-z]{16}$/, {
    message: () => 'Invalid collaborator ID format',
  }),
  Schema.brand('CollaboratorId'),
);

export type CollaboratorId = typeof CollaboratorIdSchema.Type;

export const generateCollaboratorId = (): CollaboratorId =>
  `col_${generateRandomBase32()}` as CollaboratorId;

// =============================================================================
// Voiceover ID
// =============================================================================

export const VoiceoverIdSchema = Schema.String.pipe(
  Schema.pattern(/^voc_[0-9a-hjkmnp-tv-z]{16}$/, {
    message: () => 'Invalid voiceover ID format',
  }),
  Schema.brand('VoiceoverId'),
);

export type VoiceoverId = typeof VoiceoverIdSchema.Type;

export const generateVoiceoverId = (): VoiceoverId =>
  `voc_${generateRandomBase32()}` as VoiceoverId;

// =============================================================================
// Voiceover Collaborator ID
// =============================================================================

export const VoiceoverCollaboratorIdSchema = Schema.String.pipe(
  Schema.pattern(/^vcl_[0-9a-hjkmnp-tv-z]{16}$/, {
    message: () => 'Invalid voiceover collaborator ID format',
  }),
  Schema.brand('VoiceoverCollaboratorId'),
);

export type VoiceoverCollaboratorId = typeof VoiceoverCollaboratorIdSchema.Type;

export const generateVoiceoverCollaboratorId = (): VoiceoverCollaboratorId =>
  `vcl_${generateRandomBase32()}` as VoiceoverCollaboratorId;

// =============================================================================
// Persona ID
// =============================================================================

export const PersonaIdSchema = Schema.String.pipe(
  Schema.pattern(/^per_[0-9a-hjkmnp-tv-z]{16}$/, {
    message: () => 'Invalid persona ID format',
  }),
  Schema.brand('PersonaId'),
);

export type PersonaId = typeof PersonaIdSchema.Type;

export const generatePersonaId = (): PersonaId =>
  `per_${generateRandomBase32()}` as PersonaId;

// =============================================================================
// Audience Segment ID
// =============================================================================

export const AudienceSegmentIdSchema = Schema.String.pipe(
  Schema.pattern(/^aud_[0-9a-hjkmnp-tv-z]{16}$/, {
    message: () => 'Invalid audience segment ID format',
  }),
  Schema.brand('AudienceSegmentId'),
);

export type AudienceSegmentId = typeof AudienceSegmentIdSchema.Type;

export const generateAudienceSegmentId = (): AudienceSegmentId =>
  `aud_${generateRandomBase32()}` as AudienceSegmentId;
