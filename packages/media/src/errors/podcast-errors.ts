import { Schema } from 'effect';

export class PodcastNotFound extends Schema.TaggedError<PodcastNotFound>()(
  'PodcastNotFound',
  {
    id: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'PODCAST_NOT_FOUND' as const;
  static readonly httpMessage = (e: PodcastNotFound) =>
    e.message ?? `Podcast ${e.id} not found`;
  static readonly logLevel = 'silent' as const;
  static getData(e: PodcastNotFound) {
    return { podcastId: e.id };
  }
}

export class ScriptNotFound extends Schema.TaggedError<ScriptNotFound>()(
  'ScriptNotFound',
  {
    podcastId: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'SCRIPT_NOT_FOUND' as const;
  static readonly httpMessage = (e: ScriptNotFound) =>
    e.message ?? `Script for podcast ${e.podcastId} not found`;
  static readonly logLevel = 'silent' as const;
  static getData(e: ScriptNotFound) {
    return { podcastId: e.podcastId };
  }
}

export class PodcastError extends Schema.TaggedError<PodcastError>()(
  'PodcastError',
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 500 as const;
  static readonly httpCode = 'INTERNAL_ERROR' as const;
  static readonly httpMessage = 'Podcast operation failed';
  static readonly logLevel = 'error-with-stack' as const;
}

export class NotPodcastOwner extends Schema.TaggedError<NotPodcastOwner>()(
  'NotPodcastOwner',
  {
    podcastId: Schema.String,
    userId: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 403 as const;
  static readonly httpCode = 'NOT_PODCAST_OWNER' as const;
  static readonly httpMessage = (e: NotPodcastOwner) =>
    e.message ?? 'Only the podcast owner can perform this action';
  static readonly logLevel = 'silent' as const;
  static getData(e: NotPodcastOwner) {
    return { podcastId: e.podcastId };
  }
}
