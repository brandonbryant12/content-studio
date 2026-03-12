import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { formatProductPageTitle } from '@/constants';
import { PersonaDetailContainer } from '@/features/personas/components/persona-detail-container';
import { SuspenseBoundary } from '@/shared/components/suspense-boundary';
import { parseAdminEntityDetailSearch } from '@/shared/lib/admin-entity-detail-search';

export const Route = createFileRoute('/_protected/personas/$personaId')({
  validateSearch: parseAdminEntityDetailSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ params, deps }) =>
    queryClient.ensureQueryData(
      apiClient.personas.get.queryOptions({
        input: { id: params.personaId, userId: deps.userId },
      }),
    ),
  component: PersonaPage,
});

function PersonaPage() {
  const { personaId } = Route.useParams();
  const search = Route.useSearch();

  useEffect(() => {
    document.title = formatProductPageTitle('Persona');
  }, []);

  return (
    <SuspenseBoundary resetKeys={[personaId, search.userId]}>
      <PersonaDetailContainer personaId={personaId} userId={search.userId} />
    </SuspenseBoundary>
  );
}
