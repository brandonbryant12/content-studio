import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { SlideDeckWorkbenchContainer } from '@/features/slides/components/slide-deck-workbench-container';
import { SuspenseBoundary } from '@/shared/components/suspense-boundary';

export const Route = createFileRoute('/_protected/slides/$slideDeckId')({
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      apiClient.slideDecks.get.queryOptions({
        input: { id: params.slideDeckId },
      }),
    ),
  component: SlideDeckDetailPage,
});

function SlideDeckDetailPage() {
  const { slideDeckId } = Route.useParams();

  useEffect(() => {
    document.title = 'Slide Deck - Content Studio';
  }, []);

  return (
    <SuspenseBoundary resetKeys={[slideDeckId]}>
      <SlideDeckWorkbenchContainer slideDeckId={slideDeckId} />
    </SuspenseBoundary>
  );
}
