import { ArrowLeftIcon, TrashIcon, UpdateIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import type { RouterOutput } from '@repo/api/client';
import { PersonaForm, type PersonaFormValues } from './persona-form';
import { PersonaGuidancePanel } from './persona-guidance-panel';
import { PersonaVoiceSection } from './persona-voice-section';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import { getStorageUrl } from '@/shared/lib/storage-url';

type Persona = RouterOutput['personas']['get'];

interface PersonaDetailProps {
  persona: Persona;
  formValues: PersonaFormValues;
  hasChanges: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  isGeneratingAvatar: boolean;
  onFormChange: (values: PersonaFormValues) => void;
  onSave: () => void;
  onDiscard: () => void;
  onDelete: () => void;
  onGenerateAvatar: () => void;
}

export function PersonaDetail({
  persona,
  formValues,
  hasChanges,
  isSaving,
  isDeleting,
  isGeneratingAvatar,
  onFormChange,
  onSave,
  onDiscard,
  onDelete,
  onGenerateAvatar,
}: PersonaDetailProps) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const initials = persona.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="page-container-full">
      {/* Back link */}
      <Link
        to="/personas"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Personas
      </Link>

      {/* Header with avatar */}
      <div className="flex items-start gap-6 mb-8">
        {/* Avatar */}
        <div className="relative group shrink-0">
          <div className="w-20 h-20 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-2xl font-semibold ring-2 ring-rose-500/15 overflow-hidden">
            {persona.avatarStorageKey ? (
              <img
                src={getStorageUrl(persona.avatarStorageKey)}
                alt={persona.name}
                className="w-full h-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={onGenerateAvatar}
            disabled={isGeneratingAvatar}
            className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full p-0 shadow-sm opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            aria-label="Generate avatar"
          >
            {isGeneratingAvatar ? (
              <Spinner className="w-3.5 h-3.5" />
            ) : (
              <UpdateIcon className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0 pt-1">
          <h1 className="text-xl font-semibold text-foreground truncate">
            {persona.name}
          </h1>
          {persona.role && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {persona.role}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {hasChanges && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDiscard}
                disabled={isSaving}
              >
                Discard
              </Button>
              <Button
                size="sm"
                onClick={onSave}
                disabled={isSaving || !formValues.name.trim()}
              >
                {isSaving ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setConfirmDeleteOpen(true)}
            disabled={isDeleting}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            aria-label="Delete persona"
          >
            {isDeleting ? (
              <Spinner className="w-4 h-4" />
            ) : (
              <TrashIcon className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-lg border border-border/60 bg-card p-6">
        <PersonaGuidancePanel />
        <PersonaForm
          values={formValues}
          onChange={onFormChange}
          disabled={isSaving}
        />
      </div>

      {/* Voice Assignment */}
      <PersonaVoiceSection
        voiceId={formValues.voiceId}
        onVoiceChange={(voiceId, voiceName) =>
          onFormChange({ ...formValues, voiceId, voiceName })
        }
        description="Assign a default voice to use whenever this persona is selected in a podcast. Without one, you can still pick a voice per episode."
        isGeneratingAvatar={isGeneratingAvatar}
      />

      {/* Delete confirmation */}
      <ConfirmationDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete Persona"
        description={`Are you sure you want to delete "${persona.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={() => {
          setConfirmDeleteOpen(false);
          onDelete();
        }}
      />
    </div>
  );
}
