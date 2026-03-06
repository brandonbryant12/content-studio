import { symmetricDecrypt, symmetricEncrypt } from 'better-auth/crypto';

const tryDecryptStoredToken = async ({
  authSecret,
  token,
}: {
  authSecret: string;
  token: string;
}): Promise<string | null> => {
  try {
    return await symmetricDecrypt({
      key: authSecret,
      data: token,
    });
  } catch {
    return null;
  }
};

export const decryptStoredOAuthToken = async ({
  authSecret,
  token,
}: {
  authSecret: string;
  token: string | null | undefined;
}): Promise<string | null> => {
  if (!token) return null;

  return (
    (await tryDecryptStoredToken({
      authSecret,
      token,
    })) ?? token
  );
};

export const ensureEncryptedOAuthToken = async ({
  authSecret,
  token,
}: {
  authSecret: string;
  token: string | null | undefined;
}): Promise<string | null | undefined> => {
  if (!token) return token;

  const decryptedToken = await tryDecryptStoredToken({
    authSecret,
    token,
  });
  if (decryptedToken !== null) {
    return token;
  }

  return symmetricEncrypt({
    key: authSecret,
    data: token,
  });
};
