import { env } from '@/env';

const isAbsoluteHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const encodeStorageKeyPath = (key: string): string =>
  key
    .replace(/^\/+/, '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

/**
 * Convert a storage key to a full URL for serving.
 * Storage objects are served through the backend `/storage/{key}` proxy.
 */
export const getStorageUrl = (keyOrUrl: string): string => {
  if (isAbsoluteHttpUrl(keyOrUrl)) return keyOrUrl;

  if (keyOrUrl.startsWith('/storage/')) {
    return `${env.PUBLIC_SERVER_URL}${keyOrUrl}`;
  }

  return `${env.PUBLIC_SERVER_URL}/storage/${encodeStorageKeyPath(keyOrUrl)}`;
};
