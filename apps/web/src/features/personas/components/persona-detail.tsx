import { ArrowLeftIcon, TrashIcon, UpdateIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { cn } from '@repo/ui/lib/utils';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import type { RouterOutput } from '@repo/api/client';
import { VOICES } from '@/features/podcasts/hooks/use-podcast-settings';
import { PersonaForm, type PersonaFormValues } from './persona-form';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import { useVoicePreview, useVoices } from '@/shared/hooks';

type Persona = RouterOutput['personas']['get'];

export interface PersonaDetailProps {
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
    <div className="page-container-narrow">
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
                src={persona.avatarStorageKey}
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
        <PersonaForm
          values={formValues}
          onChange={onFormChange}
          disabled={isSaving}
        />
      </div>

      {/* Voice Assignment */}
      <div className="rounded-lg border border-border/60 bg-card p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-foreground">Voice</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Assign a voice to use when this persona speaks in podcasts.
            </p>
          </div>
          {!formValues.voiceId && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/10 text-warning text-[11px] font-medium">
              No voice assigned
            </span>
          )}
        </div>
        <VoiceAssignment
          voiceId={formValues.voiceId}
          onVoiceChange={(voiceId, voiceName) =>
            onFormChange({ ...formValues, voiceId, voiceName })
          }
        />
      </div>

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

function VoiceAssignment({
  voiceId,
  onVoiceChange,
}: {
  voiceId: string;
  onVoiceChange: (voiceId: string, voiceName: string) => void;
}) {
  const { data: voicesData } = useVoices();
  const { playingVoiceId, play, stop } = useVoicePreview();

  const previewUrls = voicesData
    ? Object.fromEntries(
        voicesData
          .filter((v) => v.previewUrl)
          .map((v) => [v.id, v.previewUrl!]),
      )
    : {};

  const handlePreview = (id: string) => {
    if (playingVoiceId === id) {
      stop();
    } else {
      const url = previewUrls[id];
      if (url) play(id, url);
    }
  };

  const femaleVoices = VOICES.filter((v) => v.gender === 'female');
  const maleVoices = VOICES.filter((v) => v.gender === 'male');

  const renderVoiceCard = (voice: (typeof VOICES)[number]) => {
    const isSelected = voiceId === voice.id;
    const isPlaying = playingVoiceId === voice.id;
    return (
      <button
        key={voice.id}
        type="button"
        onClick={() => onVoiceChange(voice.id, voice.name)}
        className={cn(
          'flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all text-center',
          isSelected
            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
            : 'border-border/60 hover:border-border hover:bg-muted/50',
        )}
      >
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold',
            voice.gender === 'female'
              ? 'bg-warning/20 text-warning'
              : 'bg-info/20 text-info',
          )}
        >
          {voice.name.charAt(0)}
        </div>
        <span className="text-xs font-medium">{voice.name}</span>
        <span className="text-[10px] text-muted-foreground">
          {voice.description}
        </span>
        {previewUrls[voice.id] && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePreview(voice.id);
            }}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            aria-label={
              isPlaying ? `Stop ${voice.name} preview` : `Preview ${voice.name}`
            }
          >
            {isPlaying ? 'Stop' : 'Preview'}
          </button>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
          Female
        </p>
        <div className="grid grid-cols-4 gap-2">
          {femaleVoices.map(renderVoiceCard)}
        </div>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
          Male
        </p>
        <div className="grid grid-cols-4 gap-2">
          {maleVoices.map(renderVoiceCard)}
        </div>
      </div>
    </div>
  );
}
