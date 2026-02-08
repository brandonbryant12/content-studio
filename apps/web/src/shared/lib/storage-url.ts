import { env } from '@/env';

/**
 * Convert a storage key to a full URL for serving.
 * Filesystem storage serves files at {SERVER_URL}/storage/{key}.
 */
export const getStorageUrl = (key: string): string =>
  `${env.PUBLIC_SERVER_URL}/storage/${key}`;
