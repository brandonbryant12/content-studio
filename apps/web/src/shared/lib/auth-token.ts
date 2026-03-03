let inMemoryToken: string | null = null;

export const getAuthToken = (): string | null => {
  return inMemoryToken;
};

export const setAuthToken = (token: string): void => {
  inMemoryToken = token;
};

export const clearAuthToken = (): void => {
  inMemoryToken = null;
};

export const applyAuthToken = (token: string | null): void => {
  if (token) {
    setAuthToken(token);
    return;
  }
  clearAuthToken();
};
