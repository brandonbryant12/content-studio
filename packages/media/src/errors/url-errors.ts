import { Schema } from 'effect';

export class UrlFetchError extends Schema.TaggedError<UrlFetchError>()(
  'UrlFetchError',
  {
    url: Schema.String,
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 422 as const;
  static readonly httpCode = 'URL_FETCH_ERROR' as const;
  static readonly httpMessage = (e: UrlFetchError) => e.message;
  static readonly logLevel = 'warn' as const;
  static getData(e: UrlFetchError) {
    return { url: e.url };
  }
}

export class InvalidUrlError extends Schema.TaggedError<InvalidUrlError>()(
  'InvalidUrlError',
  {
    url: Schema.String,
    message: Schema.String,
  },
) {
  static readonly httpStatus = 400 as const;
  static readonly httpCode = 'INVALID_URL' as const;
  static readonly httpMessage = (e: InvalidUrlError) => e.message;
  static readonly logLevel = 'silent' as const;
  static getData(e: InvalidUrlError) {
    return { url: e.url };
  }
}
