// routes/_protected/voiceovers/$voiceoverId.tsx
// Thin route file - delegates to feature container

import { createFileRoute } from '@tanstack/react-router';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { SuspenseBoundary } from '@/shared/components/suspense-boundary';
import { VoiceoverDetailContainer } from '@/features/voiceovers/components/voiceover-detail-container';

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

  return (
    <SuspenseBoundary resetKeys={[voiceoverId]}>
      <VoiceoverDetailContainer voiceoverId={voiceoverId} />
    </SuspenseBoundary>
  );
}
