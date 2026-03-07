const AUTH_ERROR_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Invalid email or password.',
  USER_ALREADY_EXISTS: 'An account with that email already exists.',
  SSO_GROUP_MEMBERSHIP_REQUIRED:
    'Your Microsoft account does not have access to Content Studio.',
  SSO_AUTHORIZATION_FAILED:
    'Microsoft sign-in was denied. Try again or contact your administrator.',
  access_denied:
    'Microsoft sign-in was canceled or denied. Try again with an approved Microsoft account.',
};

const RATE_LIMITED_MESSAGE =
  'Too many sign-in attempts. Please try again in a moment.';

export const MICROSOFT_SSO_AUTH_FLOW = 'microsoft-sso';

const NORMALIZED_SSO_ERROR_TOKENS: Record<string, string> = {
  sso_group_membership_required: 'SSO_GROUP_MEMBERSHIP_REQUIRED',
  microsoft_sso_group_membership_is_required: 'SSO_GROUP_MEMBERSHIP_REQUIRED',
  sso_authorization_failed: 'SSO_AUTHORIZATION_FAILED',
  microsoft_sso_authorization_failed: 'SSO_AUTHORIZATION_FAILED',
  access_denied: 'access_denied',
};

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
  readonly code?: string | null | undefined;
  readonly error?: string | null | undefined;
  readonly error_description?: string | null | undefined;
  readonly message?: string | null | undefined;
}

const SSO_CALLBACK_ERROR_NOTICES: Record<string, AuthCallbackErrorNotice> = {
  SSO_GROUP_MEMBERSHIP_REQUIRED: {
    title: 'Your Microsoft account does not have access',
    description:
      'Use a Microsoft account in the approved Content Studio access group, or contact your administrator for access.',
  },
  SSO_AUTHORIZATION_FAILED: {
    title: 'Microsoft sign-in was denied',
    description:
      "We couldn't verify that this Microsoft account is allowed to access Content Studio. Try again or contact your administrator if you should have access.",
  },
  access_denied: {
    title: 'Microsoft sign-in was canceled or denied',
    description:
      'Try again with your approved Microsoft account. If access should have been granted, contact your administrator.',
  },
};

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

const resolveKnownErrorToken = (
  value: string | undefined,
): string | undefined =>
  value ? NORMALIZED_SSO_ERROR_TOKENS[normalizeErrorToken(value)] : undefined;

const hasMessageFragment = (
  values: ReadonlyArray<string | undefined>,
  fragment: string,
): boolean =>
  values.some((value) => value?.toLowerCase().includes(fragment) ?? false);

const resolveAuthErrorCode = (input: ErrorLike): string | undefined => {
  const code = normalizeString(input.code);
  const error = normalizeString(input.error);
  const errorDescription = normalizeString(input.error_description);
  const message = normalizeString(input.message);

  const directMatch = [code, error].find(
    (value) => value && value in AUTH_ERROR_MESSAGES,
  );
  if (directMatch) {
    return directMatch;
  }

  const normalizedMatch = [code, error, errorDescription, message]
    .map(resolveKnownErrorToken)
    .find((value) => value !== undefined);
  if (normalizedMatch) {
    return normalizedMatch;
  }

  const freeformValues = [errorDescription, message];
  if (hasMessageFragment(freeformValues, 'group membership')) {
    return 'SSO_GROUP_MEMBERSHIP_REQUIRED';
  }

  if (hasMessageFragment(freeformValues, 'authorization failed')) {
    return 'SSO_AUTHORIZATION_FAILED';
  }

  return undefined;
};

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
  const code = resolveAuthErrorCode(errorLike) ?? rawCode;
  const status =
    typeof errorLike.status === 'number' ? errorLike.status : undefined;

  if (status === 429 || code === 'RATE_LIMITED') {
    return RATE_LIMITED_MESSAGE;
  }

  return code ? (AUTH_ERROR_MESSAGES[code] ?? fallback) : fallback;
};

export const getSSOCallbackErrorNotice = (
  input: AuthCallbackErrorInput,
): AuthCallbackErrorNotice | null => {
  const authFlow = normalizeString(input.authFlow);
  const resolvedCode = resolveAuthErrorCode(input);
  const hasKnownSSOError =
    resolvedCode === 'SSO_GROUP_MEMBERSHIP_REQUIRED' ||
    resolvedCode === 'SSO_AUTHORIZATION_FAILED' ||
    resolvedCode === 'access_denied';

  if (!hasKnownSSOError && authFlow !== MICROSOFT_SSO_AUTH_FLOW) {
    return null;
  }

  if (resolvedCode && resolvedCode in SSO_CALLBACK_ERROR_NOTICES) {
    return SSO_CALLBACK_ERROR_NOTICES[resolvedCode] ?? null;
  }

  const rawError =
    normalizeString(input.error_description) ??
    normalizeString(input.message) ??
    normalizeString(input.error);

  if (!rawError) {
    return null;
  }

  return {
    title: 'Microsoft sign-in was denied',
    description:
      "We couldn't complete Microsoft sign-in for this account. Try again with an approved account, or contact your administrator if you should have access.",
  };
};
