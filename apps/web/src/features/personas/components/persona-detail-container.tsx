import { useState, useCallback } from 'react';
import type { PersonaFormValues } from './persona-form';
import type { RouterOutput } from '@repo/api/client';
import { usePersona } from '../hooks/use-persona';
import {
  useUpdatePersona,
  useDeletePersona,
  useGenerateAvatar,
} from '../hooks/use-persona-mutations';
import { PersonaDetail } from './persona-detail';
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

  // Keep drafts keyed by persona id so route changes don't require effect-based resets.
  const [draftsByPersonaId, setDraftsByPersonaId] = useState<
    Record<string, PersonaFormValues>
  >({});
  const formValues = draftsByPersonaId[persona.id] ?? getFormValues(persona);

  const hasChanges = hasFormChanges(formValues, persona);

  useNavigationBlock({ shouldBlock: hasChanges });

  const clearDraft = useCallback((id: string) => {
    setDraftsByPersonaId((current) => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const handleFormChange = useCallback(
    (values: PersonaFormValues) => {
      setDraftsByPersonaId((current) => ({
        ...current,
        [persona.id]: values,
      }));
    },
    [persona.id],
  );

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
    }, {
      onSuccess: () => clearDraft(persona.id),
    });
  }, [personaId, formValues, updateMutation, clearDraft, persona.id]);

  const handleDiscard = useCallback(() => {
    clearDraft(persona.id);
  }, [clearDraft, persona.id]);

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
      onFormChange={handleFormChange}
      onSave={handleSave}
      onDiscard={handleDiscard}
      onDelete={handleDelete}
      onGenerateAvatar={handleGenerateAvatar}
    />
  );
}
