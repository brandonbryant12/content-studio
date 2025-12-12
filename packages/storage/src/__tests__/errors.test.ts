import { describe, it, expect } from '@jest/globals';
import {
  StorageError,
  StorageNotFoundError,
  StorageUploadError,
} from '../errors';

describe('storage errors', () => {
  describe('StorageError', () => {
    it('should create a tagged error with message', () => {
      const error = new StorageError({ message: 'Storage operation failed' });

      expect(error._tag).toBe('StorageError');
      expect(error.message).toBe('Storage operation failed');
    });

    it('should accept optional cause', () => {
      const originalError = new Error('Connection refused');
      const error = new StorageError({
        message: 'Storage operation failed',
        cause: originalError,
      });

      expect(error.cause).toBe(originalError);
    });
  });

  describe('StorageNotFoundError', () => {
    it('should create a tagged error with key', () => {
      const error = new StorageNotFoundError({ key: 'audio/podcast-123.mp3' });

      expect(error._tag).toBe('StorageNotFoundError');
      expect(error.key).toBe('audio/podcast-123.mp3');
    });
  });

  describe('StorageUploadError', () => {
    it('should create a tagged error with key and message', () => {
      const error = new StorageUploadError({
        key: 'audio/podcast-123.mp3',
        message: 'Insufficient storage space',
      });

      expect(error._tag).toBe('StorageUploadError');
      expect(error.key).toBe('audio/podcast-123.mp3');
      expect(error.message).toBe('Insufficient storage space');
    });

    it('should accept optional cause', () => {
      const originalError = new Error('Disk full');
      const error = new StorageUploadError({
        key: 'audio/podcast-123.mp3',
        message: 'Insufficient storage space',
        cause: originalError,
      });

      expect(error.cause).toBe(originalError);
    });
  });
});
