import { useEffect, useCallback, useRef } from 'react';

interface KeyboardShortcutOptions {
  /** Key to listen for (e.g., 's', 'Enter', 'Escape') */
  key: string;
  /** Require Cmd (Mac) or Ctrl (Windows) */
  cmdOrCtrl?: boolean;
  /** Require Shift key */
  shift?: boolean;
  /** Require Alt/Option key */
  alt?: boolean;
  /** Callback when shortcut is triggered */
  onTrigger: () => void;
  /** Whether the shortcut is enabled */
  enabled?: boolean;
}

/**
 * Hook for registering keyboard shortcuts.
 * Automatically handles cleanup on unmount.
 */
export function useKeyboardShortcut({
  key,
  cmdOrCtrl = false,
  shift = false,
  alt = false,
  onTrigger,
  enabled = true,
}: KeyboardShortcutOptions) {
  // Use refs for values that shouldn't cause callback recreation
  const enabledRef = useRef(enabled);
  const onTriggerRef = useRef(onTrigger);

  // Keep refs up to date
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  // Stable callback - only changes when key modifiers change
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabledRef.current) return;

      // Check if modifier requirements are met (exact match when specified)
      const cmdCtrlMatch = cmdOrCtrl ? e.metaKey || e.ctrlKey : true;
      const shiftMatch = shift ? e.shiftKey : !e.shiftKey;
      const altMatch = alt ? e.altKey : !e.altKey;

      // Only match if Cmd/Ctrl isn't pressed when not required (to avoid triggering on Cmd+other)
      const noUnwantedModifiers = cmdOrCtrl || (!e.metaKey && !e.ctrlKey);

      if (
        e.key.toLowerCase() === key.toLowerCase() &&
        cmdCtrlMatch &&
        shiftMatch &&
        altMatch &&
        (cmdOrCtrl || noUnwantedModifiers)
      ) {
        e.preventDefault();
        onTriggerRef.current();
      }
    },
    [key, cmdOrCtrl, shift, alt],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
