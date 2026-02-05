import { createFileRoute } from '@tanstack/react-router';
import { AudienceListContainer } from '@/features/audiences/components/audience-list-container';

export const Route = createFileRoute('/_protected/audiences/')({
  component: AudiencesPage,
});

function AudiencesPage() {
  return <AudienceListContainer />;
}
