import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { PersonaDetailContainer } from '@/features/personas/components/persona-detail-container';
import { SuspenseBoundary } from '@/shared/components/suspense-boundary';

export const Route = createFileRoute('/_protected/personas/$personaId')({
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      apiClient.personas.get.queryOptions({
        input: { id: params.personaId },
      }),
    ),
  component: PersonaPage,
});

function PersonaPage() {
  const { personaId } = Route.useParams();

  useEffect(() => {
    document.title = 'Persona - Content Studio';
  }, []);

  return (
    <SuspenseBoundary resetKeys={[personaId]}>
      <PersonaDetailContainer personaId={personaId} />
    </SuspenseBoundary>
  );
}
