import { useCallback, useState } from 'react';
import type { PersonaFormValues } from './persona-form';
import type { PersonaSynthesis } from '../hooks/use-synthesize-persona';
import { useCreatePersona } from '../hooks/use-persona-mutations';
import {
  EMPTY_PERSONA_FORM_VALUES,
  hasPersonaDraftChanges,
  toOptionalQuotes,
  toOptionalText,
} from '../lib/persona-form-values';
import { PersonaChatContainer } from './persona-chat-container';
import { PersonaCreate } from './persona-create';
import { useNavigationBlock } from '@/shared/hooks';
import { UnsavedChangesDialog } from '@/shared/components/unsaved-changes-dialog';

export function PersonaCreateContainer() {
  const createMutation = useCreatePersona();
  const [formValues, setFormValues] = useState<PersonaFormValues>(
    EMPTY_PERSONA_FORM_VALUES,
  );
  const [assistantOpen, setAssistantOpen] = useState(false);

  const hasChanges = hasPersonaDraftChanges(formValues);

  const navBlocker = useNavigationBlock({ shouldBlock: hasChanges });

  const handleSave = useCallback(() => {
    createMutation.mutate({
      name: formValues.name,
      role: toOptionalText(formValues.role),
      personalityDescription: toOptionalText(formValues.personalityDescription),
      speakingStyle: toOptionalText(formValues.speakingStyle),
      exampleQuotes: toOptionalQuotes(formValues.exampleQuotes),
      voiceId: toOptionalText(formValues.voiceId),
      voiceName: toOptionalText(formValues.voiceName),
    });
  }, [createMutation, formValues]);

  const handleApplyPersona = useCallback((draft: PersonaSynthesis) => {
    setFormValues({
      name: draft.name,
      role: draft.role,
      personalityDescription: draft.personalityDescription,
      speakingStyle: draft.speakingStyle,
      exampleQuotes: [...draft.exampleQuotes],
      voiceId: draft.voiceId,
      voiceName: draft.voiceName,
    });
  }, []);

  return (
    <>
      <PersonaCreate
        formValues={formValues}
        hasChanges={hasChanges}
        isSaving={createMutation.isPending}
        isGeneratingWithAi={assistantOpen}
        onFormChange={setFormValues}
        onSave={handleSave}
        onDiscard={() => setFormValues(EMPTY_PERSONA_FORM_VALUES)}
        onGenerateWithAi={() => setAssistantOpen(true)}
      />
      <PersonaChatContainer
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
        onApplyPersona={handleApplyPersona}
        title="Generate Persona With AI"
        description="Describe the host or spokesperson you want. AI will draft the persona fields, and you can edit everything before saving."
        promptIntro="Start with the audience, client, or repeat use case. Try one of these:"
        confirmActionLabel="Use AI Draft"
        pendingActionLabel="Generating draft..."
        errorMessage="Failed to generate persona draft. Please try again."
        followUpPlaceholder="Add more details or click Use AI Draft..."
      />
      <UnsavedChangesDialog blocker={navBlocker} />
    </>
  );
}
