import { createInMemoryStorage } from '@repo/storage/testing';
import type { Storage } from '@repo/storage';
import type { Layer } from 'effect';

export const createStorageLayer = (): Layer.Layer<Storage> =>
  createInMemoryStorage().layer;
