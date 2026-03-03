const AUTH_TOKEN_STORAGE_KEY = 'content-studio.auth-token';

let inMemoryToken: string | null = null;

const canUseLocalStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const getAuthToken = (): string | null => {
  if (canUseLocalStorage()) {
    const value = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    inMemoryToken = value;
    return value;
  }
  return inMemoryToken;
};

export const setAuthToken = (token: string): void => {
  inMemoryToken = token;
  if (canUseLocalStorage()) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  }
};

export const clearAuthToken = (): void => {
  inMemoryToken = null;
  if (canUseLocalStorage()) {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
};

export const applyAuthToken = (token: string | null): void => {
  if (token) {
    setAuthToken(token);
    return;
  }
  clearAuthToken();
};
