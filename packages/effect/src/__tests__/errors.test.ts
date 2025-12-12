import { describe, it, expect } from '@jest/globals';
import { Effect, Exit } from 'effect';
import {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ExternalServiceError,
} from '../errors';

describe('errors', () => {
  describe('NotFoundError', () => {
    it('should create a tagged error with entity and id', () => {
      const error = new NotFoundError({ entity: 'User', id: '123' });

      expect(error._tag).toBe('NotFoundError');
      expect(error.entity).toBe('User');
      expect(error.id).toBe('123');
    });

    it('should fail an Effect with NotFoundError', async () => {
      const effect = Effect.fail(
        new NotFoundError({ entity: 'Document', id: '456' }),
      );

      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).entity).toBe('Document');
      }
    });
  });

  describe('ValidationError', () => {
    it('should create a tagged error with field and message', () => {
      const error = new ValidationError({
        field: 'email',
        message: 'Invalid email format',
      });

      expect(error._tag).toBe('ValidationError');
      expect(error.field).toBe('email');
      expect(error.message).toBe('Invalid email format');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create a tagged error with message', () => {
      const error = new UnauthorizedError({ message: 'Invalid token' });

      expect(error._tag).toBe('UnauthorizedError');
      expect(error.message).toBe('Invalid token');
    });
  });

  describe('ForbiddenError', () => {
    it('should create a tagged error with message', () => {
      const error = new ForbiddenError({ message: 'Access denied' });

      expect(error._tag).toBe('ForbiddenError');
      expect(error.message).toBe('Access denied');
    });

    it('should accept optional resource field', () => {
      const error = new ForbiddenError({
        message: 'Access denied',
        resource: '/admin',
      });

      expect(error.resource).toBe('/admin');
    });

    it('should work without optional resource field', () => {
      const error = new ForbiddenError({ message: 'Access denied' });

      expect(error.resource).toBeUndefined();
    });
  });

  describe('ExternalServiceError', () => {
    it('should create a tagged error with service and message', () => {
      const error = new ExternalServiceError({
        service: 'OpenAI',
        message: 'Rate limit exceeded',
      });

      expect(error._tag).toBe('ExternalServiceError');
      expect(error.service).toBe('OpenAI');
      expect(error.message).toBe('Rate limit exceeded');
    });

    it('should accept optional cause field', () => {
      const originalError = new Error('Network failure');
      const error = new ExternalServiceError({
        service: 'GoogleTTS',
        message: 'Failed to generate audio',
        cause: originalError,
      });

      expect(error.cause).toBe(originalError);
    });
  });
});
