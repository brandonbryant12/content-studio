// Infographic module - Repositories
export {
  InfographicRepo,
  InfographicRepoLive,
  type InfographicRepoService,
  type InsertInfographic,
  type UpdateInfographic as RepoUpdateInfographic,
  type InsertInfographicVersion,
  type ListOptions as InfographicListOptions,
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
  type CreateInfographicInput,
  type GetInfographicInput,
  type ListInfographicsInput,
  type UpdateInfographicInput,
  type DeleteInfographicInput,
  type GenerateInfographicInput,
  type GetInfographicVersionsInput,
  type GetInfographicJobInput,
} from './use-cases';

// Re-export types from schema
export type {
  Infographic,
  InfographicType,
  InfographicStyle,
  InfographicFormat,
  InfographicStatusType,
  InfographicOutput,
  InfographicVersion,
  InfographicVersionOutput,
  CreateInfographic,
  UpdateInfographic,
} from '@repo/db/schema';
