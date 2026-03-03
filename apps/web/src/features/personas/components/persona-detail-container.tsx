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
const toFormText = (value: string | null) => value ?? '';
const toOptionalText = (value: string) => (value === '' ? undefined : value);
const toOptionalQuotes = (quotes: string[]) => {
  const filtered = quotes.filter((quote) => quote.trim() !== '');
  return filtered.length > 0 ? filtered : undefined;
};
const haveSameQuotes = (left: string[], right: string[]) =>
  left.length === right.length &&
  left.every((quote, index) => quote === right[index]);

function getFormValues(persona: Persona): PersonaFormValues {
  return {
    name: persona.name,
    role: toFormText(persona.role),
    personalityDescription: toFormText(persona.personalityDescription),
    speakingStyle: toFormText(persona.speakingStyle),
    exampleQuotes:
      persona.exampleQuotes.length > 0 ? [...persona.exampleQuotes] : [],
    voiceId: toFormText(persona.voiceId),
    voiceName: toFormText(persona.voiceName),
  };
}

function hasFormChanges(values: PersonaFormValues, persona: Persona): boolean {
  const initialValues = getFormValues(persona);
  if (values.name !== initialValues.name) return true;
  if (values.role !== initialValues.role) return true;
  if (values.personalityDescription !== initialValues.personalityDescription)
    return true;
  if (values.speakingStyle !== initialValues.speakingStyle) return true;
  if (values.voiceId !== initialValues.voiceId) return true;
  if (values.voiceName !== initialValues.voiceName) return true;
  return !haveSameQuotes(values.exampleQuotes, initialValues.exampleQuotes);
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
