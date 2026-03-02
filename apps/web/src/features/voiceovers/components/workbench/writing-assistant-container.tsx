import { useCallback, useEffect } from 'react';
import { useWritingAssistantChat } from '../../hooks/use-writing-assistant-chat';
import { WritingAssistantPanel } from './writing-assistant-panel';

interface WritingAssistantContainerProps {
  voiceoverId: string;
  manuscriptText: string;
  onSetManuscriptText: (text: string) => void;
}

function buildAppendedManuscriptText(currentText: string, assistantText: string) {
  const nextSection = assistantText.trim();
  if (!nextSection) return currentText;

  const base = currentText.trimEnd();
  return base.length > 0 ? `${base}\n\n${nextSection}` : nextSection;
}

export function WritingAssistantContainer({
  voiceoverId,
  manuscriptText,
  onSetManuscriptText,
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

  const handleAppendToManuscript = useCallback(
    (assistantText: string) => {
      const nextText = buildAppendedManuscriptText(manuscriptText, assistantText);
      if (nextText === manuscriptText) return;
      onSetManuscriptText(nextText);
    },
    [manuscriptText, onSetManuscriptText],
  );

  const handleReplaceManuscript = useCallback(
    (assistantText: string) => {
      const replacementText = assistantText.trim();
      if (!replacementText) return;
      onSetManuscriptText(replacementText);
    },
    [onSetManuscriptText],
  );

  return (
    <WritingAssistantPanel
      messages={messages}
      isStreaming={isStreaming}
      error={error}
      onSendMessage={handleSendMessage}
      onReset={reset}
      onAppendToManuscript={handleAppendToManuscript}
      onReplaceManuscript={handleReplaceManuscript}
    />
  );
}
