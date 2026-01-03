// features/voiceovers/components/voiceover-icon.tsx

import { SpeakerLoudIcon } from '@radix-ui/react-icons';
import { cn } from '@repo/ui/lib/utils';
import { isGeneratingStatus, type VoiceoverStatusType } from '../lib/status';

interface VoiceoverIconProps {
  status?: VoiceoverStatusType;
  className?: string;
}

export function VoiceoverIcon({ status, className }: VoiceoverIconProps) {
  const isGenerating = isGeneratingStatus(status);

  return (
    <div
      className={cn(
        'shrink-0 w-10 h-10 flex items-center justify-center rounded-lg',
        isGenerating
          ? 'bg-purple-100 dark:bg-purple-900/20'
          : 'bg-muted',
        className,
      )}
    >
      <SpeakerLoudIcon
        className={cn(
          'w-5 h-5',
          isGenerating
            ? 'text-purple-600 dark:text-purple-400'
            : 'text-muted-foreground',
        )}
      />
    </div>
  );
}
