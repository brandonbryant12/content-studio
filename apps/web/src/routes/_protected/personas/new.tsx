import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { formatProductPageTitle } from '@/constants';
import { PersonaCreateContainer } from '@/features/personas/components/persona-create-container';

export const Route = createFileRoute('/_protected/personas/new')({
  component: PersonaCreatePage,
});

function PersonaCreatePage() {
  useEffect(() => {
    document.title = formatProductPageTitle('Create Persona');
  }, []);

  return <PersonaCreateContainer />;
}
