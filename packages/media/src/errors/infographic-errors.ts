import { Schema } from 'effect';

export class InfographicNotFound extends Schema.TaggedError<InfographicNotFound>()(
  'InfographicNotFound',
  {
    id: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'INFOGRAPHIC_NOT_FOUND' as const;
  static readonly httpMessage = (e: InfographicNotFound) =>
    e.message ?? `Infographic ${e.id} not found`;
  static readonly logLevel = 'silent' as const;
  static getData(e: InfographicNotFound) {
    return { infographicId: e.id };
  }
}

export class NotInfographicOwner extends Schema.TaggedError<NotInfographicOwner>()(
  'NotInfographicOwner',
  {
    infographicId: Schema.String,
    userId: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 403 as const;
  static readonly httpCode = 'NOT_INFOGRAPHIC_OWNER' as const;
  static readonly httpMessage = (e: NotInfographicOwner) =>
    e.message ?? 'Only the infographic owner can perform this action';
  static readonly logLevel = 'silent' as const;
  static getData(e: NotInfographicOwner) {
    return { infographicId: e.infographicId };
  }
}

export class InfographicError extends Schema.TaggedError<InfographicError>()(
  'InfographicError',
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 500 as const;
  static readonly httpCode = 'INTERNAL_ERROR' as const;
  static readonly httpMessage = 'Infographic operation failed';
  static readonly logLevel = 'error-with-stack' as const;
}
