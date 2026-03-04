import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { SourceListContainer } from '@/features/sources/components';

export const Route = createFileRoute('/_protected/sources/')({
  loader: () =>
    queryClient.ensureQueryData(
      apiClient.sources.list.queryOptions({ input: {} }),
    ),
  component: SourcesPage,
});

function SourcesPage() {
  useEffect(() => {
    document.title = 'Sources - Content Studio';
  }, []);

  return <SourceListContainer />;
}
