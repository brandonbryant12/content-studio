import { useState, useCallback } from 'react';
import type { PersonaFormValues } from './persona-form';
import { usePersona } from '../hooks/use-persona';
import {
  useUpdatePersona,
  useDeletePersona,
  useGenerateAvatar,
} from '../hooks/use-persona-mutations';
import {
  getPersonaFormValues,
  hasPersonaFormChanges,
  toOptionalQuotes,
  toOptionalText,
} from '../lib/persona-form-values';
import { PersonaDetail } from './persona-detail';
import { useNavigationBlock } from '@/shared/hooks';

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
  const formValues =
    draftsByPersonaId[persona.id] ?? getPersonaFormValues(persona);

  const hasChanges = hasPersonaFormChanges(formValues, persona);

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
    updateMutation.mutate(
      {
        id: personaId,
        name: formValues.name,
        role: toOptionalText(formValues.role),
        personalityDescription: toOptionalText(
          formValues.personalityDescription,
        ),
        speakingStyle: toOptionalText(formValues.speakingStyle),
        exampleQuotes: toOptionalQuotes(formValues.exampleQuotes),
        voiceId: toOptionalText(formValues.voiceId),
        voiceName: toOptionalText(formValues.voiceName),
      },
      {
        onSuccess: () => clearDraft(persona.id),
      },
    );
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
