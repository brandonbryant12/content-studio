import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { PersonaListContainer } from '@/features/personas/components/persona-list-container';

export const Route = createFileRoute('/_protected/personas/')({
  loader: () =>
    queryClient.ensureQueryData(
      apiClient.personas.list.queryOptions({ input: {} }),
    ),
  component: PersonasPage,
});

function PersonasPage() {
  useEffect(() => {
    document.title = 'Personas - Content Studio';
  }, []);

  return <PersonaListContainer />;
}
