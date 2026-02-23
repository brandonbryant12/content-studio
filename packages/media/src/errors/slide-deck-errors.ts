import { Schema } from 'effect';

export class SlideDeckNotFound extends Schema.TaggedError<SlideDeckNotFound>()(
  'SlideDeckNotFound',
  {
    id: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'SLIDE_DECK_NOT_FOUND' as const;
  static readonly httpMessage = (e: SlideDeckNotFound) =>
    e.message ?? `Slide deck ${e.id} not found`;
  static readonly logLevel = 'silent' as const;
  static getData(e: SlideDeckNotFound) {
    return { slideDeckId: e.id };
  }
}

export class SlideDeckError extends Schema.TaggedError<SlideDeckError>()(
  'SlideDeckError',
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 500 as const;
  static readonly httpCode = 'INTERNAL_ERROR' as const;
  static readonly httpMessage = 'Slide deck operation failed';
  static readonly logLevel = 'error-with-stack' as const;
}
