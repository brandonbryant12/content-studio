export { createVoiceover, type CreateVoiceoverInput } from './create-voiceover';

export { getVoiceover, type GetVoiceoverInput } from './get-voiceover';

export {
  listVoiceovers,
  type ListVoiceoversInput,
  type ListVoiceoversResult,
} from './list-voiceovers';

export { updateVoiceover, type UpdateVoiceoverInput } from './update-voiceover';

export { deleteVoiceover, type DeleteVoiceoverInput } from './delete-voiceover';

export {
  generateVoiceoverAudio,
  type GenerateVoiceoverAudioInput,
  type GenerateVoiceoverAudioResult,
} from './generate-audio';

export {
  startVoiceoverGeneration,
  type StartVoiceoverGenerationInput,
  type StartVoiceoverGenerationResult,
} from './start-generation';

export {
  getVoiceoverJob,
  type GetVoiceoverJobInput,
  type GetVoiceoverJobResult,
} from './get-job';

// Collaboration use cases
export {
  addVoiceoverCollaborator,
  type AddVoiceoverCollaboratorInput,
  type AddVoiceoverCollaboratorResult,
} from './add-collaborator';

export {
  removeVoiceoverCollaborator,
  type RemoveVoiceoverCollaboratorInput,
} from './remove-collaborator';

export {
  listVoiceoverCollaborators,
  type ListVoiceoverCollaboratorsInput,
  type ListVoiceoverCollaboratorsResult,
} from './list-collaborators';

export {
  approveVoiceover,
  type ApproveVoiceoverInput,
} from './approve-voiceover';

export {
  revokeVoiceoverApproval,
  type RevokeVoiceoverApprovalInput,
} from './revoke-approval';

export {
  claimVoiceoverPendingInvites,
  type ClaimVoiceoverPendingInvitesInput,
  type ClaimVoiceoverPendingInvitesResult,
} from './claim-pending-invites';
