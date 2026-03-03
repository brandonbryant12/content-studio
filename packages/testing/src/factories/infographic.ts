import {
  generateInfographicId,
  generateInfographicVersionId,
  type Infographic,
  type InfographicVersion,
  type InfographicId,
  type DocumentId,
  type StyleProperty,
} from '@repo/db/schema';

export interface CreateTestInfographicOptions {
  id?: InfographicId;
  title?: string;
  prompt?: string | null;
  styleProperties?: StyleProperty[];
  format?: Infographic['format'];
  sourceDocumentId?: DocumentId | null;
  imageStorageKey?: string | null;
  thumbnailStorageKey?: string | null;
  status?: Infographic['status'];
  errorMessage?: string | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

let infographicCounter = 0;

export function resetInfographicCounter() {
  infographicCounter = 0;
}

export function createTestInfographic(
  options: CreateTestInfographicOptions = {},
): Infographic {
  infographicCounter++;
  const now = new Date();

  return {
    id: options.id ?? generateInfographicId(),
    title: options.title ?? `Test Infographic ${infographicCounter}`,
    prompt: options.prompt ?? `Test prompt ${infographicCounter}`,
    styleProperties: options.styleProperties ?? [],
    format: options.format ?? 'portrait',
    sourceDocumentId: options.sourceDocumentId ?? null,
    imageStorageKey: options.imageStorageKey ?? null,
    thumbnailStorageKey: options.thumbnailStorageKey ?? null,
    status: options.status ?? 'draft',
    errorMessage: options.errorMessage ?? null,
    approvedBy: options.approvedBy ?? null,
    approvedAt: options.approvedAt ?? null,
    createdBy: options.createdBy ?? 'test-user-id',
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  };
}

export function createReadyInfographic(
  options: Omit<
    CreateTestInfographicOptions,
    'status' | 'imageStorageKey'
  > = {},
): Infographic {
  const id = options.id ?? generateInfographicId();
  return createTestInfographic({
    ...options,
    id,
    status: 'ready',
    imageStorageKey: `infographics/${id}/image.png`,
  });
}

export interface CreateTestInfographicVersionOptions {
  id?: string;
  infographicId?: InfographicId;
  versionNumber?: number;
  prompt?: string | null;
  styleProperties?: StyleProperty[];
  format?: InfographicVersion['format'];
  imageStorageKey?: string;
  thumbnailStorageKey?: string | null;
  createdAt?: Date;
}

let versionCounter = 0;

export function resetInfographicVersionCounter() {
  versionCounter = 0;
}

export function createTestInfographicVersion(
  options: CreateTestInfographicVersionOptions = {},
): InfographicVersion {
  versionCounter++;
  const now = new Date();
  const infographicId =
    options.infographicId ?? ('infg_test0000000001' as InfographicId);

  return {
    id:
      (options.id as InfographicVersion['id']) ??
      generateInfographicVersionId(),
    infographicId,
    versionNumber: options.versionNumber ?? versionCounter,
    prompt: options.prompt ?? `Version prompt ${versionCounter}`,
    styleProperties: options.styleProperties ?? [],
    format: options.format ?? 'portrait',
    imageStorageKey:
      options.imageStorageKey ??
      `infographics/${infographicId}/v${versionCounter}.png`,
    thumbnailStorageKey: options.thumbnailStorageKey ?? null,
    createdAt: options.createdAt ?? now,
  };
}
