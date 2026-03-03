interface CredentialedCorsPolicyInput {
  publicWebUrl: string;
  corsOrigins?: string;
  nodeEnv?: string;
}

type CredentialedCorsOrigin = string[] | ((origin: string) => string | null);

interface CredentialedCorsPolicy {
  origin: CredentialedCorsOrigin;
  credentials: true;
}

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

function normalizeOrigin(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return value;
  }
}

function isLocalOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return LOCAL_HOSTNAMES.has(hostname);
  } catch {
    return false;
  }
}

export const createCredentialedCorsPolicy = (
  input: CredentialedCorsPolicyInput,
): CredentialedCorsPolicy => {
  const publicWebOrigin = normalizeOrigin(input.publicWebUrl);
  const corsOrigins = input.corsOrigins?.trim();
  const isLocalDevelopment =
    input.nodeEnv !== 'production' && isLocalOrigin(publicWebOrigin);

  if (corsOrigins === '*') {
    if (!isLocalDevelopment) {
      throw new Error(
        'CORS_ORIGINS=* is only allowed for credentialed CORS in local development.',
      );
    }

    return {
      origin: (origin) => {
        const normalizedOrigin = normalizeOrigin(origin);
        return isLocalOrigin(normalizedOrigin) ? normalizedOrigin : null;
      },
      credentials: true,
    };
  }

  if (isLocalDevelopment && !corsOrigins) {
    return {
      origin: (origin) => {
        const normalizedOrigin = normalizeOrigin(origin);
        return isLocalOrigin(normalizedOrigin) ? normalizedOrigin : null;
      },
      credentials: true,
    };
  }

  const normalizedOrigins = new Set<string>([publicWebOrigin]);
  if (corsOrigins) {
    for (const origin of corsOrigins.split(',')) {
      const trimmed = origin.trim();
      if (trimmed.length === 0) continue;
      normalizedOrigins.add(normalizeOrigin(trimmed));
    }
  }

  return {
    origin: [...normalizedOrigins],
    credentials: true,
  };
};
