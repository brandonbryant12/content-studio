import {
  DocumentParseError,
  DocumentTooLargeError,
  UnsupportedDocumentFormat,
} from '@repo/effect/errors';
import { Effect } from 'effect';
import type { DocumentSource } from '@repo/db/schema';

/**
 * Maximum file size in bytes (10MB).
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Supported MIME types and their corresponding document source.
 */
export const SUPPORTED_MIME_TYPES: Record<string, DocumentSource> = {
  'text/plain': 'upload_txt',
  'application/pdf': 'upload_pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'upload_docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'upload_pptx',
};

/**
 * File extensions mapped to MIME types.
 */
export const EXTENSION_TO_MIME: Record<string, string> = {
  '.txt': 'text/plain',
  '.pdf': 'application/pdf',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pptx':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

/**
 * Result of parsing a document file.
 */
export interface ParsedDocument {
  content: string;
  title: string;
  source: DocumentSource;
  metadata?: Record<string, unknown>;
}

/**
 * Input for file upload parsing.
 */
export interface FileUploadInput {
  fileName: string;
  mimeType: string;
  data: Buffer;
}

/**
 * Get MIME type from file extension if not provided.
 */
export const getMimeType = (
  fileName: string,
  providedMimeType?: string,
): string => {
  if (providedMimeType && providedMimeType !== 'application/octet-stream') {
    return providedMimeType;
  }
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  return (
    EXTENSION_TO_MIME[ext] ?? providedMimeType ?? 'application/octet-stream'
  );
};

/**
 * Validate file size.
 */
export const validateFileSize = (
  fileName: string,
  fileSize: number,
  maxSize: number = MAX_FILE_SIZE,
) =>
  fileSize > maxSize
    ? Effect.fail(
        new DocumentTooLargeError({
          fileName,
          fileSize,
          maxSize,
          message: `File "${fileName}" is ${(fileSize / 1024 / 1024).toFixed(2)}MB, exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit`,
        }),
      )
    : Effect.succeed(undefined);

/**
 * Validate MIME type is supported.
 */
export const validateMimeType = (fileName: string, mimeType: string) =>
  SUPPORTED_MIME_TYPES[mimeType]
    ? Effect.succeed(SUPPORTED_MIME_TYPES[mimeType])
    : Effect.fail(
        new UnsupportedDocumentFormat({
          fileName,
          mimeType,
          supportedFormats: Object.keys(SUPPORTED_MIME_TYPES),
          message: `File type "${mimeType}" is not supported. Supported: TXT, PDF, DOCX, PPTX`,
        }),
      );

/**
 * Extract title from filename (without extension).
 */
export const extractTitleFromFileName = (fileName: string): string => {
  const lastDot = fileName.lastIndexOf('.');
  const name = lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
  // Clean up common separators
  return name.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
};

/**
 * Parse plain text file.
 */
const parseTxt = (
  data: Buffer,
  fileName: string,
): Effect.Effect<ParsedDocument, DocumentParseError> =>
  Effect.try({
    try: () => ({
      content: data.toString('utf-8'),
      title: extractTitleFromFileName(fileName),
      source: 'upload_txt' as const,
    }),
    catch: (cause) =>
      new DocumentParseError({
        fileName,
        message: 'Failed to parse text file',
        cause,
      }),
  });

/**
 * Parse PDF file using pdf-parse.
 */
const parsePdf = (
  data: Buffer,
  fileName: string,
): Effect.Effect<ParsedDocument, DocumentParseError> =>
  Effect.tryPromise({
    try: async () => {
      // Dynamic import to handle ESM/CJS interop
      const pdfParse = (await import('pdf-parse')).default;
      const result = await pdfParse(data);
      return {
        content: result.text,
        title: extractTitleFromFileName(fileName),
        source: 'upload_pdf' as const,
        metadata: {
          pageCount: result.numpages,
          info: result.info,
        },
      };
    },
    catch: (cause) =>
      new DocumentParseError({
        fileName,
        message: 'Failed to parse PDF file',
        cause,
      }),
  });

/**
 * Parse DOCX file using mammoth.
 */
const parseDocx = (
  data: Buffer,
  fileName: string,
): Effect.Effect<ParsedDocument, DocumentParseError> =>
  Effect.tryPromise({
    try: async () => {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer: data });
      return {
        content: result.value,
        title: extractTitleFromFileName(fileName),
        source: 'upload_docx' as const,
        metadata:
          result.messages.length > 0
            ? { warnings: result.messages }
            : undefined,
      };
    },
    catch: (cause) =>
      new DocumentParseError({
        fileName,
        message: 'Failed to parse DOCX file',
        cause,
      }),
  });

/**
 * Parse PPTX file.
 */
const parsePptx = (
  data: Buffer,
  fileName: string,
): Effect.Effect<ParsedDocument, DocumentParseError> =>
  Effect.tryPromise({
    try: async () => {
      const pptxParser = await import('pptx-parser');
      const parse = pptxParser.default || pptxParser;
      const slides = await parse(data);

      // Extract text from all slides
      const content = slides
        .map((slide: { text?: string }, index: number) => {
          const slideText = slide.text || '';
          return `--- Slide ${index + 1} ---\n${slideText}`;
        })
        .join('\n\n');

      return {
        content,
        title: extractTitleFromFileName(fileName),
        source: 'upload_pptx' as const,
        metadata: {
          slideCount: slides.length,
        },
      };
    },
    catch: (cause) =>
      new DocumentParseError({
        fileName,
        message: 'Failed to parse PPTX file',
        cause,
      }),
  });

/**
 * Parse an uploaded file and extract its content.
 *
 * Validates:
 * - File size (max 10MB)
 * - File format (TXT, PDF, DOCX, PPTX)
 *
 * Returns parsed content with title and source type.
 */
export const parseUploadedFile = (
  input: FileUploadInput,
): Effect.Effect<
  ParsedDocument,
  DocumentTooLargeError | UnsupportedDocumentFormat | DocumentParseError
> =>
  Effect.gen(function* () {
    const { fileName, data } = input;
    const mimeType = getMimeType(fileName, input.mimeType);

    // Validate file size
    yield* validateFileSize(fileName, data.length);

    // Validate and get document source type
    const source = yield* validateMimeType(fileName, mimeType);

    // Parse based on type
    switch (source) {
      case 'upload_txt':
        return yield* parseTxt(data, fileName);
      case 'upload_pdf':
        return yield* parsePdf(data, fileName);
      case 'upload_docx':
        return yield* parseDocx(data, fileName);
      case 'upload_pptx':
        return yield* parsePptx(data, fileName);
      default:
        // Should never reach here due to validation
        return yield* Effect.fail(
          new UnsupportedDocumentFormat({
            fileName,
            mimeType,
            supportedFormats: Object.keys(SUPPORTED_MIME_TYPES),
          }),
        );
    }
  }).pipe(
    Effect.withSpan('documents.parseUploadedFile', {
      attributes: { 'file.name': input.fileName },
    }),
  );

/**
 * Parse document content without validation (for on-demand parsing of already-stored files).
 *
 * Use this when re-parsing files that were already validated during upload.
 * Only throws DocumentParseError on parsing failures.
 */
export const parseDocumentContent = (
  input: FileUploadInput,
): Effect.Effect<string, DocumentParseError> =>
  Effect.gen(function* () {
    const { fileName, data } = input;
    const mimeType = getMimeType(fileName, input.mimeType);
    const source = SUPPORTED_MIME_TYPES[mimeType];

    // Parse based on type - fallback to treating as text if unknown
    switch (source) {
      case 'upload_txt':
        return (yield* parseTxt(data, fileName)).content;
      case 'upload_pdf':
        return (yield* parsePdf(data, fileName)).content;
      case 'upload_docx':
        return (yield* parseDocx(data, fileName)).content;
      case 'upload_pptx':
        return (yield* parsePptx(data, fileName)).content;
      default:
        // Unknown type - try treating as text
        return data.toString('utf-8');
    }
  }).pipe(
    Effect.withSpan('documents.parseDocumentContent', {
      attributes: { 'file.name': input.fileName },
    }),
  );
