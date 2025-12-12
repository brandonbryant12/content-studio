import { Effect } from 'effect';
import type {
  DocumentTooLargeError,
  UnsupportedDocumentFormat,
} from '@repo/effect/errors';
import {
  validateFileSize,
  validateMimeType,
  parseUploadedFile,
  parseDocumentContent,
  getMimeType,
  extractTitleFromFileName,
  MAX_FILE_SIZE,
  SUPPORTED_MIME_TYPES,
} from '../parsers';

describe('parsers', () => {
  describe('getMimeType', () => {
    it('returns provided mime type when valid', () => {
      const result = getMimeType('test.txt', 'text/plain');
      expect(result).toBe('text/plain');
    });

    it('infers mime type from extension when provided type is octet-stream', () => {
      const result = getMimeType('document.pdf', 'application/octet-stream');
      expect(result).toBe('application/pdf');
    });

    it('infers mime type from extension when not provided', () => {
      const result = getMimeType('document.docx');
      expect(result).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
    });

    it('returns octet-stream for unknown extensions', () => {
      const result = getMimeType('file.xyz');
      expect(result).toBe('application/octet-stream');
    });
  });

  describe('extractTitleFromFileName', () => {
    it('removes extension from filename', () => {
      expect(extractTitleFromFileName('my-document.txt')).toBe('my document');
    });

    it('converts underscores to spaces', () => {
      expect(extractTitleFromFileName('my_great_doc.pdf')).toBe('my great doc');
    });

    it('handles files without extension', () => {
      expect(extractTitleFromFileName('README')).toBe('README');
    });

    it('handles multiple extensions correctly', () => {
      expect(extractTitleFromFileName('file.test.ts')).toBe('file.test');
    });
  });

  describe('validateFileSize', () => {
    it('succeeds for files under limit', async () => {
      const result = await Effect.runPromise(
        validateFileSize('test.txt', 1000),
      );
      expect(result).toBeUndefined();
    });

    it('succeeds for files at limit', async () => {
      const result = await Effect.runPromise(
        validateFileSize('test.txt', MAX_FILE_SIZE),
      );
      expect(result).toBeUndefined();
    });

    it('fails for files over limit', async () => {
      await expect(
        Effect.runPromise(validateFileSize('test.txt', MAX_FILE_SIZE + 1)),
      ).rejects.toThrow();
    });

    it('returns DocumentTooLargeError with correct details', async () => {
      const result = await Effect.runPromiseExit(
        validateFileSize('large.pdf', 20 * 1024 * 1024),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause;
        expect(error._tag).toBe('Fail');
        if (error._tag === 'Fail') {
          const docError = error.error as DocumentTooLargeError;
          expect(docError._tag).toBe('DocumentTooLargeError');
          expect(docError.fileName).toBe('large.pdf');
          expect(docError.fileSize).toBe(20 * 1024 * 1024);
          expect(docError.maxSize).toBe(MAX_FILE_SIZE);
        }
      }
    });
  });

  describe('validateMimeType', () => {
    it.each(Object.keys(SUPPORTED_MIME_TYPES))(
      'accepts supported mime type: %s',
      async (mimeType) => {
        const result = await Effect.runPromise(
          validateMimeType('test', mimeType),
        );
        expect(result).toBe(SUPPORTED_MIME_TYPES[mimeType]);
      },
    );

    it('rejects unsupported mime types', async () => {
      await expect(
        Effect.runPromise(validateMimeType('test.mp3', 'audio/mpeg')),
      ).rejects.toThrow();
    });

    it('returns UnsupportedDocumentFormat with correct details', async () => {
      const result = await Effect.runPromiseExit(
        validateMimeType('video.mp4', 'video/mp4'),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause;
        expect(error._tag).toBe('Fail');
        if (error._tag === 'Fail') {
          const docError = error.error as UnsupportedDocumentFormat;
          expect(docError._tag).toBe('UnsupportedDocumentFormat');
          expect(docError.fileName).toBe('video.mp4');
          expect(docError.mimeType).toBe('video/mp4');
          expect(docError.supportedFormats).toEqual(
            Object.keys(SUPPORTED_MIME_TYPES),
          );
        }
      }
    });
  });

  describe('parseUploadedFile', () => {
    describe('TXT files', () => {
      it('parses plain text content', async () => {
        const content = 'Hello, this is a test document.\nWith multiple lines.';
        const buffer = Buffer.from(content, 'utf-8');

        const result = await Effect.runPromise(
          parseUploadedFile({
            fileName: 'test-document.txt',
            mimeType: 'text/plain',
            data: buffer,
          }),
        );

        expect(result.content).toBe(content);
        expect(result.title).toBe('test document');
        expect(result.source).toBe('upload_txt');
      });

      it('handles empty text files', async () => {
        const buffer = Buffer.from('', 'utf-8');

        const result = await Effect.runPromise(
          parseUploadedFile({
            fileName: 'empty.txt',
            mimeType: 'text/plain',
            data: buffer,
          }),
        );

        expect(result.content).toBe('');
      });

      it('handles unicode content', async () => {
        const content =
          'Hello \u4e16\u754c! \ud83c\udf0d \u00e9\u00e0\u00fc\u00f1';
        const buffer = Buffer.from(content, 'utf-8');

        const result = await Effect.runPromise(
          parseUploadedFile({
            fileName: 'unicode.txt',
            mimeType: 'text/plain',
            data: buffer,
          }),
        );

        expect(result.content).toBe(content);
      });
    });

    it('rejects files that are too large', async () => {
      // Create a buffer just over the size limit
      const buffer = Buffer.alloc(MAX_FILE_SIZE + 1, 'x');

      await expect(
        Effect.runPromise(
          parseUploadedFile({
            fileName: 'huge.txt',
            mimeType: 'text/plain',
            data: buffer,
          }),
        ),
      ).rejects.toThrow();
    });

    it('rejects unsupported file types', async () => {
      const buffer = Buffer.from('binary content', 'utf-8');

      await expect(
        Effect.runPromise(
          parseUploadedFile({
            fileName: 'audio.mp3',
            mimeType: 'audio/mpeg',
            data: buffer,
          }),
        ),
      ).rejects.toThrow();
    });
  });

  describe('parseDocumentContent', () => {
    it('parses text content without validation', async () => {
      const content = 'Test content for parsing';
      const buffer = Buffer.from(content, 'utf-8');

      const result = await Effect.runPromise(
        parseDocumentContent({
          fileName: 'test.txt',
          mimeType: 'text/plain',
          data: buffer,
        }),
      );

      expect(result).toBe(content);
    });

    it('handles unknown mime types by treating as text', async () => {
      const content = 'Unknown format content';
      const buffer = Buffer.from(content, 'utf-8');

      const result = await Effect.runPromise(
        parseDocumentContent({
          fileName: 'file.unknown',
          mimeType: 'application/octet-stream',
          data: buffer,
        }),
      );

      expect(result).toBe(content);
    });
  });
});
