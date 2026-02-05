import { createFileRoute } from '@tanstack/react-router';
import { PersonaListContainer } from '@/features/personas/components/persona-list-container';

export const Route = createFileRoute('/_protected/personas/')({
  component: PersonasPage,
});

function PersonasPage() {
  return <PersonaListContainer />;
}
