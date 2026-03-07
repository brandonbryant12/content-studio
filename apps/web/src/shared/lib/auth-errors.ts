const AUTH_ERROR_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Invalid email or password.',
  USER_ALREADY_EXISTS: 'An account with that email already exists.',
};

const RATE_LIMITED_MESSAGE =
  'Too many sign-in attempts. Please try again in a moment.';
const MICROSOFT_SSO_FAILURE_MESSAGE =
  "We couldn't complete Microsoft sign-in. Try again, and if you still need access to Content Studio, contact your administrator.";

export const MICROSOFT_SSO_AUTH_FLOW = 'microsoft-sso';

const MICROSOFT_SSO_ERROR_TOKENS = new Set([
  'sso_group_membership_required',
  'microsoft_sso_group_membership_is_required',
  'sso_authorization_failed',
  'microsoft_sso_authorization_failed',
  'access_denied',
]);

interface ErrorLike {
  code?: unknown;
  error?: unknown;
  error_description?: unknown;
  message?: unknown;
  authFlow?: unknown;
  status?: unknown;
}

export interface AuthCallbackErrorNotice {
  readonly title: string;
  readonly description: string;
}

export interface AuthCallbackErrorInput {
  readonly authFlow?: string | null | undefined;
  readonly error?: string | null | undefined;
  readonly error_description?: string | null | undefined;
  readonly message?: string | null | undefined;
}

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeErrorToken = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const isMicrosoftSSOFailureValue = (value: string | undefined): boolean =>
  value ? MICROSOFT_SSO_ERROR_TOKENS.has(normalizeErrorToken(value)) : false;

const isMicrosoftSSOFailure = (input: ErrorLike): boolean =>
  [
    normalizeString(input.code),
    normalizeString(input.error),
    normalizeString(input.error_description),
    normalizeString(input.message),
  ].some(isMicrosoftSSOFailureValue);

export const getAuthErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (typeof error !== 'object' || error === null) {
    return fallback;
  }

  const errorLike = error as ErrorLike;
  const rawCode =
    normalizeString(errorLike.code) ?? normalizeString(errorLike.error);
  const status =
    typeof errorLike.status === 'number' ? errorLike.status : undefined;

  if (status === 429 || rawCode === 'RATE_LIMITED') {
    return RATE_LIMITED_MESSAGE;
  }

  if (isMicrosoftSSOFailure(errorLike)) {
    return MICROSOFT_SSO_FAILURE_MESSAGE;
  }

  return rawCode ? (AUTH_ERROR_MESSAGES[rawCode] ?? fallback) : fallback;
};

export const getSSOCallbackErrorNotice = (
  input: AuthCallbackErrorInput,
): AuthCallbackErrorNotice | null => {
  const authFlow = normalizeString(input.authFlow);
  if (authFlow !== MICROSOFT_SSO_AUTH_FLOW) {
    return null;
  }

  const failureDetail =
    normalizeString(input.error_description) ??
    normalizeString(input.message) ??
    normalizeString(input.error);
  if (!failureDetail) {
    return null;
  }

  return {
    title: 'Microsoft sign-in failed',
    description: MICROSOFT_SSO_FAILURE_MESSAGE,
  };
};
