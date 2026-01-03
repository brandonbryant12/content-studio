// Voiceover module - Repositories
export {
  VoiceoverRepo,
  VoiceoverRepoLive,
  VoiceoverCollaboratorRepo,
  VoiceoverCollaboratorRepoLive,
  type VoiceoverRepoService,
  type VoiceoverCollaboratorRepoService,
  type ListOptions as VoiceoverListOptions,
  type UpdateAudioOptions as VoiceoverUpdateAudioOptions,
  type RepoAddVoiceoverCollaboratorInput,
  type UserLookupInfo as VoiceoverUserLookupInfo,
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
  // Collaboration
  addVoiceoverCollaborator,
  removeVoiceoverCollaborator,
  listVoiceoverCollaborators,
  approveVoiceover,
  revokeVoiceoverApproval,
  claimVoiceoverPendingInvites,
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
  // Collaboration types
  type AddVoiceoverCollaboratorInput,
  type AddVoiceoverCollaboratorResult,
  type RemoveVoiceoverCollaboratorInput,
  type ListVoiceoverCollaboratorsInput,
  type ListVoiceoverCollaboratorsResult,
  type ApproveVoiceoverInput,
  type ApproveVoiceoverResult,
  type RevokeVoiceoverApprovalInput,
  type RevokeVoiceoverApprovalResult,
  type ClaimVoiceoverPendingInvitesInput,
  type ClaimVoiceoverPendingInvitesResult,
} from './use-cases';

// Re-export types from schema
export type {
  Voiceover,
  VoiceoverStatus,
  CreateVoiceover,
  UpdateVoiceover,
  VoiceoverOutput,
  VoiceoverListItemOutput,
  VoiceoverCollaborator,
  VoiceoverCollaboratorOutput,
  VoiceoverCollaboratorWithUser,
  VoiceoverCollaboratorWithUserOutput,
} from '@repo/db/schema';
