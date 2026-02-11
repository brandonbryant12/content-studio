// Voiceover module - Repositories
export {
  VoiceoverRepo,
  VoiceoverRepoLive,
  type VoiceoverRepoService,
  type ListOptions as VoiceoverListOptions,
  type UpdateAudioOptions as VoiceoverUpdateAudioOptions,
} from './repos';

// Voiceover module - Use Cases
export {
  createVoiceover,
  getVoiceover,
  listVoiceovers,
  updateVoiceover,
  deleteVoiceover,
  generateVoiceoverAudio,
  startVoiceoverGeneration,
  getVoiceoverJob,
  // Approval
  approveVoiceover,
  revokeVoiceoverApproval,
  // Types
  type CreateVoiceoverInput,
  type GetVoiceoverInput,
  type ListVoiceoversInput,
  type ListVoiceoversResult,
  type UpdateVoiceoverInput,
  type DeleteVoiceoverInput,
  type GenerateVoiceoverAudioInput,
  type GenerateVoiceoverAudioResult,
  type StartVoiceoverGenerationInput,
  type StartVoiceoverGenerationResult,
  type GetVoiceoverJobInput,
  type GetVoiceoverJobResult,
  type ApproveVoiceoverInput,
  type RevokeVoiceoverApprovalInput,
} from './use-cases';

// Re-export types from schema
export type {
  Voiceover,
  VoiceoverStatus,
  CreateVoiceover,
  UpdateVoiceover,
  VoiceoverOutput,
  VoiceoverListItemOutput,
} from '@repo/db/schema';
