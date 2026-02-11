import { useBlocker } from '@tanstack/react-router';
import { useEffect } from 'react';

interface UseNavigationBlockOptions {
  shouldBlock: boolean;
}

export function useNavigationBlock({ shouldBlock }: UseNavigationBlockOptions) {
  useBlocker({
    shouldBlockFn: () => shouldBlock,
    withResolver: true,
  });

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
