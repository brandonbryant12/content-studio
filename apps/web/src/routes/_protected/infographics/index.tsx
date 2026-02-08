import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { InfographicListContainer } from '@/features/infographics/components/infographic-list-container';

export const Route = createFileRoute('/_protected/infographics/')({
  loader: () =>
    queryClient.ensureQueryData(
      apiClient.infographics.list.queryOptions({ input: {} }),
    ),
  component: InfographicsPage,
});

function InfographicsPage() {
  useEffect(() => {
    document.title = 'Infographics - Content Studio';
  }, []);

  return <InfographicListContainer />;
}
