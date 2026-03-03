import { useEffect } from 'react';
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
  const { messages, sendUserMessage, isStreaming, error, reset } =
    useWritingAssistantChat(manuscriptText, onSetManuscriptText);

  useEffect(() => {
    reset();
  }, [voiceoverId, reset]);

  return (
    <WritingAssistantPanel
      messages={messages}
      isStreaming={isStreaming}
      error={error}
      onSendMessage={sendUserMessage}
      onReset={reset}
    />
  );
}
