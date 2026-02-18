import { useBlocker } from '@tanstack/react-router';
import { useCallback, useEffect } from 'react';

interface UseNavigationBlockOptions {
  shouldBlock: boolean;
  confirmMessage?: string;
}

const DEFAULT_CONFIRM_MESSAGE =
  'You have unsaved changes. If you leave this page, your changes will be lost.';

export function useNavigationBlock({
  shouldBlock,
  confirmMessage = DEFAULT_CONFIRM_MESSAGE,
}: UseNavigationBlockOptions) {
  const shouldBlockNavigation = useCallback(() => {
    if (!shouldBlock) return false;
    return !window.confirm(confirmMessage);
  }, [shouldBlock, confirmMessage]);

  useBlocker({
    shouldBlockFn: shouldBlockNavigation,
  });

  useEffect(() => {
    if (!shouldBlock) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [shouldBlock]);
}
