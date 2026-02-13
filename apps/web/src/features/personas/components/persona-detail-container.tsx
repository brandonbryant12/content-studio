import { useState, useCallback, useRef, useEffect } from 'react';
import { usePersona } from '../hooks/use-persona';
import {
  useUpdatePersona,
  useDeletePersona,
  useGenerateAvatar,
} from '../hooks/use-persona-mutations';
import { PersonaDetail } from './persona-detail';
import type { PersonaFormValues } from './persona-form';
import type { RouterOutput } from '@repo/api/client';
import { useNavigationBlock } from '@/shared/hooks';

type Persona = RouterOutput['personas']['get'];

function getFormValues(persona: Persona): PersonaFormValues {
  return {
    name: persona.name,
    role: persona.role || '',
    personalityDescription: persona.personalityDescription || '',
    speakingStyle: persona.speakingStyle || '',
    exampleQuotes:
      persona.exampleQuotes.length > 0 ? [...persona.exampleQuotes] : [],
    voiceId: persona.voiceId || '',
    voiceName: persona.voiceName || '',
  };
}

function hasFormChanges(values: PersonaFormValues, persona: Persona): boolean {
  if (values.name !== persona.name) return true;
  if (values.role !== (persona.role || '')) return true;
  if (values.personalityDescription !== (persona.personalityDescription || ''))
    return true;
  if (values.speakingStyle !== (persona.speakingStyle || '')) return true;
  if (values.voiceId !== (persona.voiceId || '')) return true;
  if (values.voiceName !== (persona.voiceName || '')) return true;

  const serverQuotes = persona.exampleQuotes;
  if (values.exampleQuotes.length !== serverQuotes.length) return true;
  return values.exampleQuotes.some((q, i) => q !== serverQuotes[i]);
}

interface PersonaDetailContainerProps {
  personaId: string;
}

export function PersonaDetailContainer({
  personaId,
}: PersonaDetailContainerProps) {
  const { data: persona } = usePersona(personaId);

  const updateMutation = useUpdatePersona(personaId);
  const deleteMutation = useDeletePersona();
  const avatarMutation = useGenerateAvatar(personaId);

  const [formValues, setFormValues] = useState<PersonaFormValues>(() =>
    getFormValues(persona),
  );

  // Reset form when navigating to a different persona
  const personaIdRef = useRef(persona.id);
  if (persona.id !== personaIdRef.current) {
    personaIdRef.current = persona.id;
    setFormValues(getFormValues(persona));
  }

  // Sync from server when data changes externally (SSE, cache invalidation)
  const serverVersionRef = useRef(persona.updatedAt);
  useEffect(() => {
    if (persona.updatedAt !== serverVersionRef.current) {
      serverVersionRef.current = persona.updatedAt;
      setFormValues(getFormValues(persona));
    }
  }, [persona]);

  const hasChanges = hasFormChanges(formValues, persona);

  useNavigationBlock({ shouldBlock: hasChanges });

  const handleSave = useCallback(() => {
    updateMutation.mutate({
      id: personaId,
      name: formValues.name,
      role: formValues.role || undefined,
      personalityDescription: formValues.personalityDescription || undefined,
      speakingStyle: formValues.speakingStyle || undefined,
      exampleQuotes:
        formValues.exampleQuotes.length > 0
          ? formValues.exampleQuotes.filter((q) => q.trim() !== '')
          : undefined,
      voiceId: formValues.voiceId || undefined,
      voiceName: formValues.voiceName || undefined,
    });
  }, [personaId, formValues, updateMutation]);

  const handleDiscard = useCallback(() => {
    setFormValues(getFormValues(persona));
  }, [persona]);

  const handleDelete = useCallback(() => {
    deleteMutation.mutate({ id: personaId });
  }, [deleteMutation, personaId]);

  const handleGenerateAvatar = useCallback(() => {
    avatarMutation.mutate({ id: personaId });
  }, [avatarMutation, personaId]);

  return (
    <PersonaDetail
      persona={persona}
      formValues={formValues}
      hasChanges={hasChanges}
      isSaving={updateMutation.isPending}
      isDeleting={deleteMutation.isPending}
      isGeneratingAvatar={avatarMutation.isPending}
      onFormChange={setFormValues}
      onSave={handleSave}
      onDiscard={handleDiscard}
      onDelete={handleDelete}
      onGenerateAvatar={handleGenerateAvatar}
    />
  );
}
