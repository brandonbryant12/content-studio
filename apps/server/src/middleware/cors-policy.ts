interface BearerCorsPolicyInput {
  publicWebUrl: string;
  corsOrigins?: string;
}

type BearerCorsOrigin = string[] | '*';

interface BearerCorsPolicy {
  origin: BearerCorsOrigin;
  credentials: false;
}

function normalizeOrigin(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return value;
  }
}

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

  const normalizedOrigins = new Set<string>([
    normalizeOrigin(input.publicWebUrl),
  ]);
  for (const origin of corsOrigins.split(',')) {
    const trimmed = origin.trim();
    if (trimmed.length === 0 || trimmed === '*') continue;
    normalizedOrigins.add(normalizeOrigin(trimmed));
  }

  return {
    origin: [...normalizedOrigins],
    credentials: false,
  };
};
