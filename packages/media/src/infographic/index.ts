// Infographic module - Repositories
export {
  InfographicRepo,
  InfographicRepoLive,
  type InfographicRepoService,
  type InsertInfographic,
  type UpdateInfographic as RepoUpdateInfographic,
  type InsertInfographicVersion,
  type ListOptions as InfographicListOptions,
  StylePresetRepo,
  StylePresetRepoLive,
  StylePresetNotFound,
  type StylePresetRepoService,
  type InsertStylePreset,
} from './repos';

// Infographic module - Use Cases
export {
  createInfographic,
  getInfographic,
  listInfographics,
  updateInfographic,
  deleteInfographic,
  generateInfographic,
  getInfographicVersions,
  getInfographicJob,
  approveInfographic,
  revokeInfographicApproval,
  type CreateInfographicInput,
  type GetInfographicInput,
  type ListInfographicsInput,
  type UpdateInfographicInput,
  type DeleteInfographicInput,
  type GenerateInfographicInput,
  type GetInfographicVersionsInput,
  type GetInfographicJobInput,
  type ApproveInfographicInput,
  type RevokeInfographicApprovalInput,
  executeInfographicGeneration,
  type ExecuteGenerationInput,
  type ExecuteGenerationResult,
  listStylePresets,
  createStylePreset,
  type CreateStylePresetInput,
  deleteStylePreset,
  type DeleteStylePresetInput,
} from './use-cases';

// Re-export types from schema
export type {
  Infographic,
  InfographicFormat,
  InfographicStatusType,
  InfographicOutput,
  InfographicVersion,
  InfographicVersionOutput,
  StyleProperty,
} from '@repo/db/schema';
