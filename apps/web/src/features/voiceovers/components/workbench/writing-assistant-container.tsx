import { useCallback, useEffect } from 'react';
import { useWritingAssistantChat } from '../../hooks/use-writing-assistant-chat';
import { WritingAssistantPanel } from './writing-assistant-panel';

interface WritingAssistantContainerProps {
  voiceoverId: string;
}

export function WritingAssistantContainer({
  voiceoverId,
}: WritingAssistantContainerProps) {
  const { messages, sendMessage, isStreaming, error, reset } =
    useWritingAssistantChat();

  useEffect(() => {
    reset();
  }, [voiceoverId, reset]);

  const handleSendMessage = useCallback(
    (text: string) => {
      sendMessage({ text });
    },
    [sendMessage],
  );

  return (
    <WritingAssistantPanel
      messages={messages}
      isStreaming={isStreaming}
      error={error}
      onSendMessage={handleSendMessage}
      onReset={reset}
    />
  );
}
