import { Effect } from 'effect';
import { describe, it, expect } from 'vitest';
import { InvalidUrlError } from '../../../errors';
import { validateUrl } from '../url-validator';

describe('validateUrl', () => {
  describe('valid URLs', () => {
    it('accepts valid HTTPS URL', async () => {
      const result = await Effect.runPromise(
        validateUrl('https://example.com/page'),
      );
      expect(result).toBeInstanceOf(URL);
      expect(result.href).toBe('https://example.com/page');
    });

    it('accepts valid HTTP URL', async () => {
      const result = await Effect.runPromise(
        validateUrl('http://example.com/page'),
      );
      expect(result).toBeInstanceOf(URL);
      expect(result.href).toBe('http://example.com/page');
    });

    it('accepts URL with query parameters', async () => {
      const result = await Effect.runPromise(
        validateUrl('https://example.com/search?q=test&page=1'),
      );
      expect(result.searchParams.get('q')).toBe('test');
    });

    it('accepts URL with port', async () => {
      const result = await Effect.runPromise(
        validateUrl('https://example.com:8080/path'),
      );
      expect(result.port).toBe('8080');
    });
  });

  describe('non-HTTP schemes rejected', () => {
    it('rejects ftp:// scheme', async () => {
      const result = await Effect.runPromiseExit(
        validateUrl('ftp://example.com/file'),
      );
      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(InvalidUrlError);
        expect((error as InvalidUrlError).message).toContain(
          'Unsupported URL scheme',
        );
      }
    });

    it('rejects file:// scheme', async () => {
      const result = await Effect.runPromiseExit(
        validateUrl('file:///etc/passwd'),
      );
      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(InvalidUrlError);
      }
    });

    it('rejects javascript: scheme', async () => {
      const result = await Effect.runPromiseExit(
        validateUrl('javascript:alert(1)'),
      );
      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(InvalidUrlError);
      }
    });
  });

  describe('private IPs rejected', () => {
    it('rejects 127.0.0.1 (loopback)', async () => {
      const result = await Effect.runPromiseExit(
        validateUrl('http://127.0.0.1/admin'),
      );
      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(InvalidUrlError);
        expect((error as InvalidUrlError).message).toContain('private');
      }
    });

    it('rejects 10.x.x.x (private class A)', async () => {
      const result = await Effect.runPromiseExit(
        validateUrl('http://10.0.0.1/internal'),
      );
      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(InvalidUrlError);
      }
    });

    it('rejects 172.16.x.x (private class B)', async () => {
      const result = await Effect.runPromiseExit(
        validateUrl('http://172.16.0.1/internal'),
      );
      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(InvalidUrlError);
      }
    });

    it('rejects 192.168.x.x (private class C)', async () => {
      const result = await Effect.runPromiseExit(
        validateUrl('http://192.168.1.1/router'),
      );
      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(InvalidUrlError);
      }
    });

    it('rejects 169.254.x.x (link-local)', async () => {
      const result = await Effect.runPromiseExit(
        validateUrl('http://169.254.169.254/latest/meta-data'),
      );
      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(InvalidUrlError);
      }
    });

    it('rejects localhost', async () => {
      const result = await Effect.runPromiseExit(
        validateUrl('http://localhost:3000/api'),
      );
      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(InvalidUrlError);
      }
    });

    it('rejects IPv6 loopback', async () => {
      const result = await Effect.runPromiseExit(
        validateUrl('http://[::1]/admin'),
      );
      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(InvalidUrlError);
      }
    });
  });

  describe('malformed URLs rejected', () => {
    it('rejects completely invalid URL', async () => {
      const result = await Effect.runPromiseExit(validateUrl('not-a-url'));
      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(InvalidUrlError);
        expect((error as InvalidUrlError).message).toContain(
          'Invalid URL format',
        );
      }
    });

    it('rejects empty string', async () => {
      const result = await Effect.runPromiseExit(validateUrl(''));
      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(InvalidUrlError);
      }
    });
  });

  describe('long URLs rejected', () => {
    it('rejects URL exceeding 2048 characters', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2100);
      const result = await Effect.runPromiseExit(validateUrl(longUrl));
      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(InvalidUrlError);
        expect((error as InvalidUrlError).message).toContain('maximum length');
      }
    });
  });
});
