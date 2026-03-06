import { useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';

export function useStartPodcastCreation() {
  const navigate = useNavigate();
  const [isPending, setIsPending] = useState(false);

  const start = useCallback(() => {
    setIsPending(true);
    void Promise.resolve(navigate({ to: '/podcasts/new' })).finally(() => {
      setIsPending(false);
    });
  }, [navigate]);

  return {
    start,
    isPending,
  } as const;
}
