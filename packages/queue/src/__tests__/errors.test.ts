import { describe, it, expect } from 'vitest';
import { QueueError, JobNotFoundError, JobProcessingError } from '../errors';

describe('queue errors', () => {
  describe('QueueError', () => {
    it('should create a tagged error with message', () => {
      const error = new QueueError({ message: 'Queue operation failed' });

      expect(error._tag).toBe('QueueError');
      expect(error.message).toBe('Queue operation failed');
    });

    it('should accept optional cause', () => {
      const originalError = new Error('Database connection failed');
      const error = new QueueError({
        message: 'Queue operation failed',
        cause: originalError,
      });

      expect(error.cause).toBe(originalError);
    });
  });

  describe('JobNotFoundError', () => {
    it('should create a tagged error with jobId', () => {
      const error = new JobNotFoundError({ jobId: 'job-123' });

      expect(error._tag).toBe('JobNotFoundError');
      expect(error.jobId).toBe('job-123');
    });
  });

  describe('JobProcessingError', () => {
    it('should create a tagged error with jobId and message', () => {
      const error = new JobProcessingError({
        jobId: 'job-456',
        message: 'LLM API rate limited',
      });

      expect(error._tag).toBe('JobProcessingError');
      expect(error.jobId).toBe('job-456');
      expect(error.message).toBe('LLM API rate limited');
    });

    it('should accept optional cause', () => {
      const originalError = new Error('API timeout');
      const error = new JobProcessingError({
        jobId: 'job-456',
        message: 'LLM API rate limited',
        cause: originalError,
      });

      expect(error.cause).toBe(originalError);
    });
  });
});
