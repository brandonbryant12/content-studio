const LOCAL_TRUSTED_ORIGIN_PATTERNS = [
  'http://localhost:*',
  'http://127.0.0.1:*',
  'http://[::1]:*',
];

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

export const buildAuthTrustedOrigins = ({
  publicWebUrl,
  corsOrigins,
  nodeEnv,
}: {
  publicWebUrl: string;
  corsOrigins?: string;
  nodeEnv?: string;
}): string[] => {
  const origins = new Set<string>();
  const publicWebOrigin = normalizeOrigin(publicWebUrl);
  const isLocalDevelopment =
    nodeEnv !== 'production' && isLocalOrigin(publicWebOrigin);

  if (corsOrigins?.trim() === '*' && isLocalDevelopment) {
    for (const pattern of LOCAL_TRUSTED_ORIGIN_PATTERNS) {
      origins.add(pattern);
    }
    return [...origins];
  }

  if (isLocalDevelopment && !corsOrigins) {
    for (const pattern of LOCAL_TRUSTED_ORIGIN_PATTERNS) {
      origins.add(pattern);
    }
    return [...origins];
  }

  if (!corsOrigins) {
    return [];
  }

  for (const origin of corsOrigins.split(',')) {
    const trimmed = origin.trim();
    if (trimmed.length === 0 || trimmed === '*') continue;
    origins.add(normalizeOrigin(trimmed));
  }

  return [...origins];
};
