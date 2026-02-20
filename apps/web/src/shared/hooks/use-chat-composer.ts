import { useCallback, useState } from 'react';

interface UseChatComposerOptions {
  isDisabled: boolean;
  onSendMessage: (text: string) => void;
}

export function useChatComposer({
  isDisabled,
  onSendMessage,
}: UseChatComposerOptions) {
  const [input, setInput] = useState('');

  const trySendText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isDisabled) return false;
      onSendMessage(trimmed);
      return true;
    },
    [isDisabled, onSendMessage],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!trySendText(input)) return;
      setInput('');
    },
    [input, trySendText],
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.nativeEvent.isComposing) return;
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.currentTarget.form?.requestSubmit();
      }
    },
    [],
  );

  return {
    input,
    setInput,
    canSubmit: input.trim().length > 0 && !isDisabled,
    handleSubmit,
    handleInputKeyDown,
    trySendText,
  };
}
