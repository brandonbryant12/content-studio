import { useCallback } from 'react';
import { useResearchChat } from '../hooks/use-research-chat';
import { useStartResearch } from '../hooks/use-start-research';
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
  const startResearchMutation = useStartResearch();

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) chat.reset();
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

  const handleStartResearch = useCallback(
    (query: string, title?: string) => {
      startResearchMutation.mutate(
        { query, title },
        {
          onSuccess: () => handleOpenChange(false),
        },
      );
    },
    [startResearchMutation, handleOpenChange],
  );

  return (
    <ResearchChatDialog
      open={open}
      onOpenChange={handleOpenChange}
      messages={chat.messages}
      isStreaming={chat.isStreaming}
      error={chat.error}
      refinedQuery={chat.refinedQuery}
      onSendMessage={handleSendMessage}
      onStartResearch={handleStartResearch}
      isStartingResearch={startResearchMutation.isPending}
    />
  );
}
