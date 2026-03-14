import { useWritingAssistantChat as useSharedWritingAssistantChat } from '@/shared/hooks/use-writing-assistant-chat';

const VOICEOVER_CONFIRMATION_MESSAGE =
  'I updated the script in the editor. Review the new draft and tell me what to adjust next.';

export function useWritingAssistantChat(
  draft: string,
  onApplyDraftEdit: (nextDraft: string) => void,
) {
  return useSharedWritingAssistantChat({
    documentKind: 'voiceover',
    draft,
    onApplyDraftEdit,
    confirmationMessage: VOICEOVER_CONFIRMATION_MESSAGE,
  });
}
