interface BearerCorsPolicyInput {
  publicWebUrl: string;
  corsOrigins?: string;
}

type BearerCorsOrigin = string[] | '*';

interface BearerCorsPolicy {
  origin: BearerCorsOrigin;
  credentials: false;
}

interface AuthCorsPolicy {
  origin: string[];
  credentials: true;
}

function normalizeOrigin(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return value;
  }
}

const getAllowedOrigins = (input: BearerCorsPolicyInput): string[] => {
  const normalizedOrigins = new Set<string>([
    normalizeOrigin(input.publicWebUrl),
  ]);

  for (const origin of input.corsOrigins?.split(',') ?? []) {
    const trimmed = origin.trim();
    if (trimmed.length === 0 || trimmed === '*') continue;
    normalizedOrigins.add(normalizeOrigin(trimmed));
  }

  return [...normalizedOrigins];
};

export const createBearerCorsPolicy = (
  input: BearerCorsPolicyInput,
): BearerCorsPolicy => {
  const corsOrigins = input.corsOrigins?.trim();

  if (!corsOrigins || corsOrigins === '*') {
    return {
      origin: '*',
      credentials: false,
    };
  }

  return {
    origin: getAllowedOrigins(input),
    credentials: false,
  };
};

export const createAuthCorsPolicy = (
  input: BearerCorsPolicyInput,
): AuthCorsPolicy => ({
  origin: getAllowedOrigins(input),
  credentials: true,
});
