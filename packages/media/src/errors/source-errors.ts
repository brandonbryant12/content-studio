import { Schema } from 'effect';

export class SourceNotFound extends Schema.TaggedError<SourceNotFound>()(
  'SourceNotFound',
  {
    id: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'SOURCE_NOT_FOUND' as const;
  static readonly httpMessage = (e: SourceNotFound) =>
    e.message ?? `Source ${e.id} not found`;
  static readonly logLevel = 'silent' as const;
  static getData(e: SourceNotFound) {
    return { sourceId: e.id };
  }
}

export class SourceError extends Schema.TaggedError<SourceError>()(
  'SourceError',
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 500 as const;
  static readonly httpCode = 'INTERNAL_ERROR' as const;
  static readonly httpMessage = 'Source operation failed';
  static readonly logLevel = 'error-with-stack' as const;
}

export class SourceTooLargeError extends Schema.TaggedError<SourceTooLargeError>()(
  'SourceTooLargeError',
  {
    fileName: Schema.String,
    fileSize: Schema.Number,
    maxSize: Schema.Number,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 413 as const;
  static readonly httpCode = 'SOURCE_TOO_LARGE' as const;
  static readonly httpMessage = (e: SourceTooLargeError) =>
    e.message ?? `File ${e.fileName} exceeds maximum size`;
  static readonly logLevel = 'silent' as const;
  static getData(e: SourceTooLargeError) {
    return { fileName: e.fileName, fileSize: e.fileSize, maxSize: e.maxSize };
  }
}

export class UnsupportedSourceFormat extends Schema.TaggedError<UnsupportedSourceFormat>()(
  'UnsupportedSourceFormat',
  {
    fileName: Schema.String,
    mimeType: Schema.String,
    supportedFormats: Schema.Array(Schema.String),
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 415 as const;
  static readonly httpCode = 'UNSUPPORTED_FORMAT' as const;
  static readonly httpMessage = (e: UnsupportedSourceFormat) =>
    e.message ?? `Format ${e.mimeType} is not supported`;
  static readonly logLevel = 'silent' as const;
  static getData(e: UnsupportedSourceFormat) {
    return {
      fileName: e.fileName,
      mimeType: e.mimeType,
      supportedFormats: [...e.supportedFormats],
    };
  }
}

export class SourceParseError extends Schema.TaggedError<SourceParseError>()(
  'SourceParseError',
  {
    fileName: Schema.String,
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 422 as const;
  static readonly httpCode = 'SOURCE_PARSE_ERROR' as const;
  static readonly httpMessage = (e: SourceParseError) => e.message;
  static readonly logLevel = 'warn' as const;
  static getData(e: SourceParseError) {
    return { fileName: e.fileName };
  }
}

export class SourceContentNotFound extends Schema.TaggedError<SourceContentNotFound>()(
  'SourceContentNotFound',
  {
    id: Schema.String,
    title: Schema.String,
    contentKey: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'SOURCE_CONTENT_NOT_FOUND' as const;
  static readonly httpMessage = (e: SourceContentNotFound) =>
    e.message ?? `Source file "${e.title}" is missing from storage`;
  static readonly logLevel = 'warn' as const;
  static getData(e: SourceContentNotFound) {
    return { sourceId: e.id, title: e.title, contentKey: e.contentKey };
  }
}

export class SourceAlreadyProcessing extends Schema.TaggedError<SourceAlreadyProcessing>()(
  'SourceAlreadyProcessing',
  {
    id: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 409 as const;
  static readonly httpCode = 'SOURCE_ALREADY_PROCESSING' as const;
  static readonly httpMessage = (e: SourceAlreadyProcessing) =>
    e.message ?? `Source ${e.id} is already being processed`;
  static readonly logLevel = 'silent' as const;
  static getData(e: SourceAlreadyProcessing) {
    return { sourceId: e.id };
  }
}
