interface AuthErrorLike {
  code?: unknown;
  status?: unknown;
}

const isAuthErrorLike = (error: unknown): error is AuthErrorLike => {
  return typeof error === 'object' && error !== null;
};

export const getAuthErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (!isAuthErrorLike(error)) {
    return fallback;
  }

  const code = typeof error.code === 'string' ? error.code : undefined;
  const status = typeof error.status === 'number' ? error.status : undefined;

  if (code === 'INVALID_EMAIL_OR_PASSWORD') {
    return 'Invalid email or password.';
  }

  if (code === 'USER_ALREADY_EXISTS') {
    return 'An account with that email already exists.';
  }

  if (status === 429 || code === 'RATE_LIMITED') {
    return 'Too many sign-in attempts. Please try again in a moment.';
  }

  return fallback;
};
