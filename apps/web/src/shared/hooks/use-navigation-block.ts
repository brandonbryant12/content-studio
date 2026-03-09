import { useBlocker } from '@tanstack/react-router';
import { useEffect } from 'react';

interface UseNavigationBlockOptions {
  shouldBlock: boolean;
}

export interface NavigationBlocker {
  isBlocked: boolean;
  proceed: () => void;
  reset: () => void;
}

const IDLE_BLOCKER: NavigationBlocker = {
  isBlocked: false,
  proceed: () => {},
  reset: () => {},
};

export function useNavigationBlock({
  shouldBlock,
}: UseNavigationBlockOptions): NavigationBlocker {
  const resolver = useBlocker({
    shouldBlockFn: () => shouldBlock,
    withResolver: true,
  });

  // Browser-level protection for tab close / hard refresh
  useEffect(() => {
    if (!shouldBlock) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [shouldBlock]);

  if (resolver.status === 'blocked') {
    return {
      isBlocked: true,
      proceed: resolver.proceed,
      reset: resolver.reset,
    };
  }

  return IDLE_BLOCKER;
}
