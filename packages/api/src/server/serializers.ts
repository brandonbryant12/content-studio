/**
 * Type-safe serializers for API output.
 *
 * All serializers are co-located with their DB entity definitions in @repo/db/schema.
 * This file re-exports them for convenience.
 *
 * See @repo/db/schema/documents.ts for the canonical pattern.
 */

// Document serializers
export { serializeDocument, type DocumentOutput } from '@repo/db/schema';

// Podcast serializers
export {
  serializePodcast,
  serializePodcastScript,
  serializePodcastFull,
  serializePodcastListItem,
  type PodcastOutput,
  type PodcastScriptOutput,
  type PodcastFullOutput,
  type PodcastListItemOutput,
} from '@repo/db/schema';
