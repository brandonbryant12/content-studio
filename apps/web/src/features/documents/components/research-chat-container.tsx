import { useCallback, useEffect, useRef } from 'react';
import { useResearchChat } from '../hooks/use-research-chat';
import { useStartResearch } from '../hooks/use-start-research';
import { useSynthesizeResearch } from '../hooks/use-synthesize-research';
import { ResearchChatDialog } from './research-chat-dialog';

interface ResearchChatContainerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResearchChatContainer({
  open,
  onOpenChange,
}: ResearchChatContainerProps) {
  const chat = useResearchChat();
  const synthesizeMutation = useSynthesizeResearch();
  const startResearchMutation = useStartResearch();
  const autoStartTriggeredRef = useRef(false);

  const isStartingResearch =
    synthesizeMutation.isPending || startResearchMutation.isPending;
  const startError =
    synthesizeMutation.error ?? startResearchMutation.error ?? undefined;

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        autoStartTriggeredRef.current = false;
        chat.reset();
      }
      onOpenChange(isOpen);
    },
    [onOpenChange, chat],
  );

  const handleSendMessage = useCallback(
    (text: string) => {
      chat.sendMessage({ text });
    },
    [chat],
  );

  const handleStartResearch = useCallback(() => {
    if (chat.messages.length === 0 || isStartingResearch) return;
    autoStartTriggeredRef.current = true;

    synthesizeMutation.mutate(chat.messages, {
      onSuccess: ({ query, title }) => {
        startResearchMutation.mutate(
          { query, title },
          {
            onSuccess: () => handleOpenChange(false),
          },
        );
      },
    });
  }, [
    chat.messages,
    isStartingResearch,
    synthesizeMutation,
    startResearchMutation,
    handleOpenChange,
  ]);

  useEffect(() => {
    if (!open || autoStartTriggeredRef.current) return;
    if (!chat.shouldAutoStart || chat.isStreaming || isStartingResearch) return;
    handleStartResearch();
  }, [
    open,
    chat.shouldAutoStart,
    chat.isStreaming,
    isStartingResearch,
    handleStartResearch,
  ]);

  return (
    <ResearchChatDialog
      open={open}
      onOpenChange={handleOpenChange}
      messages={chat.messages}
      isStreaming={chat.isStreaming}
      error={chat.error}
      canStartResearch={chat.canStartResearch}
      autoStartReady={chat.shouldAutoStart}
      startError={startError}
      onSendMessage={handleSendMessage}
      onStartResearch={handleStartResearch}
      isStartingResearch={isStartingResearch}
    />
  );
}
