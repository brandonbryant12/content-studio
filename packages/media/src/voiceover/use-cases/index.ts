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

// Approval use cases
export {
  approveVoiceover,
  type ApproveVoiceoverInput,
} from './approve-voiceover';

export {
  revokeVoiceoverApproval,
  type RevokeVoiceoverApprovalInput,
} from './revoke-approval';
