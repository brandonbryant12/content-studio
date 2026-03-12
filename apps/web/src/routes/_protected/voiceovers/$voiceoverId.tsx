import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { formatProductPageTitle } from '@/constants';
import { VoiceoverDetailContainer } from '@/features/voiceovers/components/voiceover-detail-container';
import { SuspenseBoundary } from '@/shared/components/suspense-boundary';
import { parseAdminEntityDetailSearch } from '@/shared/lib/admin-entity-detail-search';

export const Route = createFileRoute('/_protected/voiceovers/$voiceoverId')({
  validateSearch: parseAdminEntityDetailSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ params, deps }) =>
    queryClient.ensureQueryData(
      apiClient.voiceovers.get.queryOptions({
        input: { id: params.voiceoverId, userId: deps.userId },
      }),
    ),
  component: VoiceoverPage,
});

function VoiceoverPage() {
  const { voiceoverId } = Route.useParams();
  const search = Route.useSearch();

  useEffect(() => {
    document.title = formatProductPageTitle('Voiceover');
  }, []);

  return (
    <SuspenseBoundary resetKeys={[voiceoverId, search.userId]}>
      <VoiceoverDetailContainer
        voiceoverId={voiceoverId}
        userId={search.userId}
      />
    </SuspenseBoundary>
  );
}
