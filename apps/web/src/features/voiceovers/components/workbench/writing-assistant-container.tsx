import { useCallback, useEffect } from 'react';
import type { TranscriptEditProposal } from '../../hooks/use-writing-assistant-chat';
import { useWritingAssistantChat } from '../../hooks/use-writing-assistant-chat';
import { WritingAssistantPanel } from './writing-assistant-panel';

interface WritingAssistantContainerProps {
  voiceoverId: string;
  manuscriptText: string;
  onSetManuscriptText: (text: string) => void;
}

export function WritingAssistantContainer({
  voiceoverId,
  manuscriptText,
  onSetManuscriptText,
}: WritingAssistantContainerProps) {
  const {
    messages,
    sendUserMessage,
    proposals,
    acceptProposal,
    rejectProposal,
    isStreaming,
    error,
    reset,
  } = useWritingAssistantChat(manuscriptText);

  useEffect(() => {
    reset();
  }, [voiceoverId, reset]);

  const handleSendMessage = useCallback(
    (text: string) => {
      void sendUserMessage(text);
    },
    [sendUserMessage],
  );

  const handleAcceptProposal = useCallback(
    (proposal: TranscriptEditProposal) => {
      if (proposal.revisedTranscript !== manuscriptText) {
        onSetManuscriptText(proposal.revisedTranscript);
      }

      void acceptProposal(proposal);
    },
    [acceptProposal, manuscriptText, onSetManuscriptText],
  );

  const handleRejectProposal = useCallback(
    (proposal: TranscriptEditProposal) => {
      void rejectProposal(proposal);
    },
    [rejectProposal],
  );

  return (
    <WritingAssistantPanel
      messages={messages}
      proposals={proposals}
      isStreaming={isStreaming}
      error={error}
      onSendMessage={handleSendMessage}
      onReset={reset}
      onAcceptProposal={handleAcceptProposal}
      onRejectProposal={handleRejectProposal}
    />
  );
}
