import { describe, it, expect } from 'vitest';
import { getErrorMessage } from './errors';

describe('getErrorMessage', () => {
  describe('non-defined errors', () => {
    it('returns error message for standard Error', () => {
      const error = new Error('Something went wrong');
      expect(getErrorMessage(error, 'Fallback')).toBe('Something went wrong');
    });

    it('returns fallback for null', () => {
      expect(getErrorMessage(null, 'Upload failed')).toBe('Upload failed');
    });

    it('returns fallback for undefined', () => {
      expect(getErrorMessage(undefined, 'Upload failed')).toBe('Upload failed');
    });

    it('returns fallback for object without message', () => {
      expect(getErrorMessage({}, 'Upload failed')).toBe('Upload failed');
    });
  });

  describe('DOCUMENT_TOO_LARGE', () => {
    it('formats error with file details', () => {
      const error = {
        code: 'DOCUMENT_TOO_LARGE',
        message: 'File too large',
        data: {
          fileName: 'big-doc.pdf',
          fileSize: 15728640, // 15 MB
          maxSize: 10485760, // 10 MB
        },
      };
      expect(getErrorMessage(error, 'Failed')).toBe(
        'big-doc.pdf (15.0 MB) exceeds 10.0 MB limit',
      );
    });

    it('formats KB sizes', () => {
      const error = {
        code: 'DOCUMENT_TOO_LARGE',
        message: 'File too large',
        data: {
          fileName: 'small.txt',
          fileSize: 5120, // 5 KB
          maxSize: 1024, // 1 KB
        },
      };
      expect(getErrorMessage(error, 'Failed')).toBe(
        'small.txt (5.0 KB) exceeds 1.0 KB limit',
      );
    });
  });

  describe('UNSUPPORTED_FORMAT', () => {
    it('formats error with supported formats', () => {
      const error = {
        code: 'UNSUPPORTED_FORMAT',
        message: 'Unsupported format',
        data: {
          fileName: 'video.mp4',
          mimeType: 'video/mp4',
          supportedFormats: ['pdf', 'txt', 'docx'],
        },
      };
      expect(getErrorMessage(error, 'Failed')).toBe(
        'video/mp4 not supported. Use: pdf, txt, docx',
      );
    });
  });

  describe('RATE_LIMITED', () => {
    it('formats with retry time in seconds', () => {
      const error = {
        code: 'RATE_LIMITED',
        message: 'Too many requests',
        data: { retryAfter: 30000 }, // 30 seconds in ms
      };
      expect(getErrorMessage(error, 'Failed')).toBe(
        'Too many requests. Try again in 30 seconds.',
      );
    });

    it('rounds up partial seconds', () => {
      const error = {
        code: 'RATE_LIMITED',
        message: 'Too many requests',
        data: { retryAfter: 1500 }, // 1.5 seconds
      };
      expect(getErrorMessage(error, 'Failed')).toBe(
        'Too many requests. Try again in 2 seconds.',
      );
    });

    it('formats without retry time', () => {
      const error = {
        code: 'RATE_LIMITED',
        message: 'Too many requests',
        data: {},
      };
      expect(getErrorMessage(error, 'Failed')).toBe(
        'Too many requests. Please wait a moment.',
      );
    });

    it('handles undefined data', () => {
      const error = {
        code: 'RATE_LIMITED',
        message: 'Too many requests',
      };
      expect(getErrorMessage(error, 'Failed')).toBe(
        'Too many requests. Please wait a moment.',
      );
    });
  });

  describe('DOCUMENT_QUOTA_EXCEEDED', () => {
    it('formats with count and limit', () => {
      const error = {
        code: 'DOCUMENT_QUOTA_EXCEEDED',
        message: 'Quota exceeded',
        data: { count: 10, limit: 10 },
      };
      expect(getErrorMessage(error, 'Failed')).toBe(
        "You've reached your document limit (10/10). Upgrade to add more.",
      );
    });
  });

  describe('GENERATION_IN_PROGRESS', () => {
    it('returns static message', () => {
      const error = {
        code: 'GENERATION_IN_PROGRESS',
        message: 'Already generating',
        data: { podcastId: 'pod_123', jobId: 'job_456' },
      };
      expect(getErrorMessage(error, 'Failed')).toBe(
        'This podcast is already being generated. Please wait.',
      );
    });
  });

  describe('not found errors', () => {
    it('formats DOCUMENT_NOT_FOUND', () => {
      const error = {
        code: 'DOCUMENT_NOT_FOUND',
        message: 'Document not found',
        data: { documentId: 'doc_123' },
      };
      expect(getErrorMessage(error, 'Failed')).toBe(
        'Document not found. It may have been deleted.',
      );
    });

    it('formats PODCAST_NOT_FOUND', () => {
      const error = {
        code: 'PODCAST_NOT_FOUND',
        message: 'Podcast not found',
        data: { podcastId: 'pod_123' },
      };
      expect(getErrorMessage(error, 'Failed')).toBe(
        'Podcast not found. It may have been deleted.',
      );
    });

    it('formats SCRIPT_NOT_FOUND', () => {
      const error = {
        code: 'SCRIPT_NOT_FOUND',
        message: 'Script not found',
        data: { podcastId: 'pod_123' },
      };
      expect(getErrorMessage(error, 'Failed')).toBe(
        'Script not found. Try regenerating the podcast.',
      );
    });

    it('formats JOB_NOT_FOUND', () => {
      const error = {
        code: 'JOB_NOT_FOUND',
        message: 'Job not found',
        data: { jobId: 'job_123' },
      };
      expect(getErrorMessage(error, 'Failed')).toBe(
        'Job not found. It may have expired.',
      );
    });
  });

  describe('DOCUMENT_PARSE_ERROR', () => {
    it('formats with filename', () => {
      const error = {
        code: 'DOCUMENT_PARSE_ERROR',
        message: 'Parse error',
        data: { fileName: 'corrupted.pdf' },
      };
      expect(getErrorMessage(error, 'Failed')).toBe(
        'Failed to parse corrupted.pdf. The file may be corrupted.',
      );
    });
  });

  describe('VALIDATION_ERROR', () => {
    it('formats with field name', () => {
      const error = {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        data: { field: 'email' },
      };
      expect(getErrorMessage(error, 'Failed')).toBe('Invalid value for email');
    });

    it('returns error message without field', () => {
      const error = {
        code: 'VALIDATION_ERROR',
        message: 'Title is required',
        data: {},
      };
      expect(getErrorMessage(error, 'Failed')).toBe('Title is required');
    });
  });

  describe('SERVICE_UNAVAILABLE', () => {
    it('returns friendly message', () => {
      const error = {
        code: 'SERVICE_UNAVAILABLE',
        message: 'AI service error',
        data: { model: 'gemini-pro' },
      };
      expect(getErrorMessage(error, 'Failed')).toBe(
        'AI service is temporarily unavailable. Please try again later.',
      );
    });
  });

  describe('unknown error codes', () => {
    it('falls back to error message', () => {
      const error = {
        code: 'SOME_NEW_ERROR',
        message: 'A new error occurred',
        data: {},
      };
      expect(getErrorMessage(error, 'Failed')).toBe('A new error occurred');
    });
  });
});
