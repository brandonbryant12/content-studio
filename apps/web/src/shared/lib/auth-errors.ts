const AUTH_ERROR_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Invalid email or password.',
  USER_ALREADY_EXISTS: 'An account with that email already exists.',
};

const RATE_LIMITED_MESSAGE =
  'Too many sign-in attempts. Please try again in a moment.';

export const getAuthErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (typeof error !== 'object' || error === null) {
    return fallback;
  }

  const errorLike = error as { code?: unknown; status?: unknown };
  const code = typeof errorLike.code === 'string' ? errorLike.code : undefined;
  const status =
    typeof errorLike.status === 'number' ? errorLike.status : undefined;

  if (status === 429 || code === 'RATE_LIMITED') {
    return RATE_LIMITED_MESSAGE;
  }

  return code ? AUTH_ERROR_MESSAGES[code] ?? fallback : fallback;
};
