import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { SlideDeckListContainer } from '@/features/slides/components/slide-deck-list-container';

export const Route = createFileRoute('/_protected/slides/')({
  loader: () =>
    queryClient.ensureQueryData(
      apiClient.slideDecks.list.queryOptions({ input: {} }),
    ),
  component: SlidesPage,
});

function SlidesPage() {
  useEffect(() => {
    document.title = 'Slide Decks - Content Studio';
  }, []);

  return <SlideDeckListContainer />;
}
