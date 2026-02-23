import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { SvgListContainer } from '@/features/svgs/components/svg-list-container';

export const Route = createFileRoute('/_protected/svgs/')({
  loader: () =>
    queryClient.ensureQueryData(apiClient.svgs.list.queryOptions({ input: {} })),
  component: SvgsPage,
});

function SvgsPage() {
  useEffect(() => {
    document.title = 'SVG Creator - Content Studio';
  }, []);

  return <SvgListContainer />;
}
