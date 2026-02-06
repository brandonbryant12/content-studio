import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { VoiceoverListContainer } from '@/features/voiceovers/components/voiceover-list-container';

export const Route = createFileRoute('/_protected/voiceovers/')({
  loader: () =>
    queryClient.ensureQueryData(
      apiClient.voiceovers.list.queryOptions({ input: {} }),
    ),
  component: VoiceoversPage,
});

function VoiceoversPage() {
  useEffect(() => {
    document.title = 'Voiceovers - Content Studio';
  }, []);

  return <VoiceoverListContainer />;
}
