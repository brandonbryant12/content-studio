import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { cn } from '@repo/ui/lib/utils';
import { useVoicePreviewController } from '@/shared/hooks';
import { VOICES } from '@/shared/lib/voices';

interface PersonaVoiceSectionProps {
  voiceId: string;
  onVoiceChange: (voiceId: string, voiceName: string) => void;
  description: string;
  isGeneratingAvatar?: boolean;
}

export function PersonaVoiceSection({
  voiceId,
  onVoiceChange,
  description,
  isGeneratingAvatar = false,
}: PersonaVoiceSectionProps) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">Voice</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
        {!voiceId && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/10 text-warning text-xs font-medium">
            No voice assigned
          </span>
        )}
      </div>
      <VoiceAssignment
        voiceId={voiceId}
        onVoiceChange={onVoiceChange}
        isGeneratingAvatar={isGeneratingAvatar}
      />
    </div>
  );
}

function VoiceAssignment({
  voiceId,
  onVoiceChange,
  isGeneratingAvatar,
}: {
  voiceId: string;
  onVoiceChange: (voiceId: string, voiceName: string) => void;
  isGeneratingAvatar: boolean;
}) {
  const { playingVoiceId, previewUrls, togglePreview } =
    useVoicePreviewController();

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
        disabled={isGeneratingAvatar}
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
        <span className="text-xs text-muted-foreground">
          {voice.description}
        </span>
        {previewUrls[voice.id] && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              togglePreview(voice.id);
            }}
            className="h-auto px-1 py-0 text-xs text-muted-foreground hover:text-foreground"
          >
            {isPlaying ? (
              <>
                <Spinner className="h-3 w-3" />
                Stop
              </>
            ) : (
              'Preview'
            )}
          </Button>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-warning" />
          Female
        </p>
        <div className="grid grid-cols-4 gap-2">
          {femaleVoices.map(renderVoiceCard)}
        </div>
      </div>
      <div>
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-info" />
          Male
        </p>
        <div className="grid grid-cols-4 gap-2">
          {maleVoices.map(renderVoiceCard)}
        </div>
      </div>
    </div>
  );
}
