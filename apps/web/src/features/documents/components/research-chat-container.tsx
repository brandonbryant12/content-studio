import { useCallback } from 'react';
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

  const handleStartResearch = useCallback(() => {
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
    synthesizeMutation,
    startResearchMutation,
    chat.messages,
    handleOpenChange,
  ]);

  const isStartingResearch =
    synthesizeMutation.isPending || startResearchMutation.isPending;

  return (
    <ResearchChatDialog
      open={open}
      onOpenChange={handleOpenChange}
      messages={chat.messages}
      isStreaming={chat.isStreaming}
      error={chat.error}
      canStartResearch={chat.canStartResearch}
      onSendMessage={handleSendMessage}
      onStartResearch={handleStartResearch}
      isStartingResearch={isStartingResearch}
    />
  );
}
