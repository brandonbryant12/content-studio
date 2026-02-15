import { Schema } from 'effect';

export class DocumentNotFound extends Schema.TaggedError<DocumentNotFound>()(
  'DocumentNotFound',
  {
    id: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'DOCUMENT_NOT_FOUND' as const;
  static readonly httpMessage = (e: DocumentNotFound) =>
    e.message ?? `Document ${e.id} not found`;
  static readonly logLevel = 'silent' as const;
  static getData(e: DocumentNotFound) {
    return { documentId: e.id };
  }
}

export class DocumentError extends Schema.TaggedError<DocumentError>()(
  'DocumentError',
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 500 as const;
  static readonly httpCode = 'INTERNAL_ERROR' as const;
  static readonly httpMessage = 'Document operation failed';
  static readonly logLevel = 'error-with-stack' as const;
}

export class DocumentTooLargeError extends Schema.TaggedError<DocumentTooLargeError>()(
  'DocumentTooLargeError',
  {
    fileName: Schema.String,
    fileSize: Schema.Number,
    maxSize: Schema.Number,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 413 as const;
  static readonly httpCode = 'DOCUMENT_TOO_LARGE' as const;
  static readonly httpMessage = (e: DocumentTooLargeError) =>
    e.message ?? `File ${e.fileName} exceeds maximum size`;
  static readonly logLevel = 'silent' as const;
  static getData(e: DocumentTooLargeError) {
    return { fileName: e.fileName, fileSize: e.fileSize, maxSize: e.maxSize };
  }
}

export class UnsupportedDocumentFormat extends Schema.TaggedError<UnsupportedDocumentFormat>()(
  'UnsupportedDocumentFormat',
  {
    fileName: Schema.String,
    mimeType: Schema.String,
    supportedFormats: Schema.Array(Schema.String),
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 415 as const;
  static readonly httpCode = 'UNSUPPORTED_FORMAT' as const;
  static readonly httpMessage = (e: UnsupportedDocumentFormat) =>
    e.message ?? `Format ${e.mimeType} is not supported`;
  static readonly logLevel = 'silent' as const;
  static getData(e: UnsupportedDocumentFormat) {
    return {
      fileName: e.fileName,
      mimeType: e.mimeType,
      supportedFormats: [...e.supportedFormats],
    };
  }
}

export class DocumentParseError extends Schema.TaggedError<DocumentParseError>()(
  'DocumentParseError',
  {
    fileName: Schema.String,
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 422 as const;
  static readonly httpCode = 'DOCUMENT_PARSE_ERROR' as const;
  static readonly httpMessage = (e: DocumentParseError) => e.message;
  static readonly logLevel = 'warn' as const;
  static getData(e: DocumentParseError) {
    return { fileName: e.fileName };
  }
}

export class DocumentContentNotFound extends Schema.TaggedError<DocumentContentNotFound>()(
  'DocumentContentNotFound',
  {
    id: Schema.String,
    title: Schema.String,
    contentKey: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'DOCUMENT_CONTENT_NOT_FOUND' as const;
  static readonly httpMessage = (e: DocumentContentNotFound) =>
    e.message ?? `Document file "${e.title}" is missing from storage`;
  static readonly logLevel = 'warn' as const;
  static getData(e: DocumentContentNotFound) {
    return { documentId: e.id, title: e.title, contentKey: e.contentKey };
  }
}

export class DocumentAlreadyProcessing extends Schema.TaggedError<DocumentAlreadyProcessing>()(
  'DocumentAlreadyProcessing',
  {
    id: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 409 as const;
  static readonly httpCode = 'DOCUMENT_ALREADY_PROCESSING' as const;
  static readonly httpMessage = (e: DocumentAlreadyProcessing) =>
    e.message ?? `Document ${e.id} is already being processed`;
  static readonly logLevel = 'silent' as const;
  static getData(e: DocumentAlreadyProcessing) {
    return { documentId: e.id };
  }
}
