import { MixerHorizontalIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Link } from '@tanstack/react-router';
import { PersonaForm, type PersonaFormValues } from './persona-form';
import { PersonaGuidancePanel } from './persona-guidance-panel';
import { PersonaSaveBar } from './persona-save-bar';
import { PersonaVoiceSection } from './persona-voice-section';

interface PersonaCreateProps {
  formValues: PersonaFormValues;
  hasChanges: boolean;
  isSaving: boolean;
  isGeneratingWithAi: boolean;
  onFormChange: (values: PersonaFormValues) => void;
  onSave: () => void;
  onDiscard: () => void;
  onGenerateWithAi: () => void;
}

export function PersonaCreate({
  formValues,
  hasChanges,
  isSaving,
  isGeneratingWithAi,
  onFormChange,
  onSave,
  onDiscard,
  onGenerateWithAi,
}: PersonaCreateProps) {
  return (
    <div className="page-container-full">
      <Link
        to="/personas"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        Back to Personas
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="max-w-2xl">
          <p className="page-eyebrow">New Persona</p>
          <h1 className="page-title">
            {formValues.name.trim() || 'New Persona'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Start with a blank persona or let AI draft one for you, then review
            every field before saving.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={onGenerateWithAi}
            disabled={isSaving || isGeneratingWithAi}
          >
            <MixerHorizontalIcon className="w-4 h-4" />
            {isGeneratingWithAi ? 'Opening AI…' : 'Generate With AI'}
          </Button>
          {hasChanges && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDiscard}
              disabled={isSaving}
            >
              Clear
            </Button>
          )}
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving || !formValues.name.trim()}
          >
            {isSaving ? 'Saving…' : 'Save Persona'}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border/60 bg-card p-6">
        <div className="mb-5 rounded-xl border border-sky-200/60 bg-sky-50/70 p-4 dark:border-sky-500/20 dark:bg-sky-500/5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Prefer a head start?
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Use AI to draft the persona from a short conversation, then edit
                the result before you save anything.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerateWithAi}
              disabled={isSaving || isGeneratingWithAi}
            >
              Generate With AI
            </Button>
          </div>
        </div>

        <PersonaGuidancePanel />
        <PersonaForm
          values={formValues}
          onChange={onFormChange}
          disabled={isSaving}
        />
      </div>

      <PersonaVoiceSection
        voiceId={formValues.voiceId}
        onVoiceChange={(voiceId, voiceName) =>
          onFormChange({ ...formValues, voiceId, voiceName })
        }
        description="Set an optional default voice now, or leave it blank and choose a voice later when a podcast uses this persona."
      />

      <PersonaSaveBar
        formValues={formValues}
        isSaving={isSaving}
        hasChanges={hasChanges}
        onSave={onSave}
        onDiscard={onDiscard}
        saveLabel="Save Persona"
        savingLabel="Saving..."
        discardLabel="Clear"
      />
    </div>
  );
}
