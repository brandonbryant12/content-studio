// apps/web/src/shared/hooks/use-navigation-block.ts

import { useEffect } from 'react';
import { useBlocker } from '@tanstack/react-router';

interface UseNavigationBlockOptions {
  /** Whether navigation should be blocked */
  shouldBlock: boolean;
  /** Optional message for beforeunload (browser may not display it) */
  message?: string;
}

/**
 * Blocks navigation when there are unsaved changes.
 * Handles both TanStack Router navigation and browser beforeunload.
 */
export function useNavigationBlock({
  shouldBlock,
  message: _message,
}: UseNavigationBlockOptions) {
  // Block TanStack Router navigation
  useBlocker({
    shouldBlockFn: () => shouldBlock,
    withResolver: true,
  });

  // Browser beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (shouldBlock) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [shouldBlock]);
}
