import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { formatProductPageTitle } from '@/constants';
import { VoiceoverDetailContainer } from '@/features/voiceovers/components/voiceover-detail-container';
import { SuspenseBoundary } from '@/shared/components/suspense-boundary';

export const Route = createFileRoute('/_protected/voiceovers/$voiceoverId')({
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      apiClient.voiceovers.get.queryOptions({
        input: { id: params.voiceoverId },
      }),
    ),
  component: VoiceoverPage,
});

function VoiceoverPage() {
  const { voiceoverId } = Route.useParams();

  useEffect(() => {
    document.title = formatProductPageTitle('Voiceover');
  }, []);

  return (
    <SuspenseBoundary resetKeys={[voiceoverId]}>
      <VoiceoverDetailContainer voiceoverId={voiceoverId} />
    </SuspenseBoundary>
  );
}
