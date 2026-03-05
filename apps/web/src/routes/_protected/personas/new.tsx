import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { PersonaCreateContainer } from '@/features/personas/components/persona-create-container';

export const Route = createFileRoute('/_protected/personas/new')({
  component: PersonaCreatePage,
});

function PersonaCreatePage() {
  useEffect(() => {
    document.title = 'Create Persona - Content Studio';
  }, []);

  return <PersonaCreateContainer />;
}
