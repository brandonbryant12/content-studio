import { describe, expect, it } from 'vitest';
import {
  decryptStoredOAuthToken,
  ensureEncryptedOAuthToken,
} from '../server/oauth-token-crypto';

describe('oauth-token-crypto', () => {
  const authSecret = 'test-auth-secret';

  it('encrypts plaintext tokens and decrypts them on read', async () => {
    const encryptedToken = await ensureEncryptedOAuthToken({
      authSecret,
      token: 'access-token',
    });

    expect(encryptedToken).toBeTypeOf('string');
    expect(encryptedToken).not.toBe('access-token');
    await expect(
      decryptStoredOAuthToken({
        authSecret,
        token: encryptedToken,
      }),
    ).resolves.toBe('access-token');
  });

  it('does not double-encrypt tokens that are already protected', async () => {
    const encryptedToken = await ensureEncryptedOAuthToken({
      authSecret,
      token: 'refresh-token',
    });
    const protectedToken = await ensureEncryptedOAuthToken({
      authSecret,
      token: encryptedToken,
    });

    expect(protectedToken).toBe(encryptedToken);
  });

  it('preserves legacy plaintext rows when decryption is attempted', async () => {
    await expect(
      decryptStoredOAuthToken({
        authSecret,
        token: 'legacy-plaintext-token',
      }),
    ).resolves.toBe('legacy-plaintext-token');
  });
});
