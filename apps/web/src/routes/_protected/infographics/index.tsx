import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { formatProductPageTitle } from '@/constants';
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
    document.title = formatProductPageTitle('Infographics');
  }, []);

  return <InfographicListContainer />;
}
