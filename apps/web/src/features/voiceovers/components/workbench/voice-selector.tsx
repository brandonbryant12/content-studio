// features/voiceovers/components/workbench/voice-selector.tsx

import { cn } from '@repo/ui/lib/utils';
import { VOICES } from '../../lib/voices';
import { VoiceSymbol } from './voice-symbols';

interface VoiceSelectorProps {
  voice: string;
  onChange: (voice: string) => void;
  disabled?: boolean;
}

/** Short trait descriptor for each voice */
const VOICE_TRAITS: Record<string, string> = {
  Aoede: 'Melodic',
  Kore: 'Youthful',
  Leda: 'Friendly',
  Zephyr: 'Airy',
  Charon: 'Clear',
  Fenrir: 'Bold',
  Puck: 'Lively',
  Orus: 'Warm',
};

/**
 * Voice Ensemble - Card gallery for selecting voices.
 * Replaces dropdown with theatrical voice cards.
 */
export function VoiceSelector({
  voice,
  onChange,
  disabled,
}: VoiceSelectorProps) {
  return (
    <fieldset className="voice-ensemble" disabled={disabled}>
      <legend className="sr-only">Select a voice</legend>
      <div className="voice-ensemble-stage">
        {VOICES.map((v) => {
          const isSelected = voice === v.id;
          return (
            <button
              key={v.id}
              type="button"
              className={cn('voice-card', isSelected && 'voice-card-selected')}
              onClick={() => onChange(v.id)}
              aria-pressed={isSelected}
              disabled={disabled}
            >
              <div className="voice-card-symbol">
                <VoiceSymbol voiceId={v.id} className="w-5 h-5" />
              </div>
              <span className="voice-card-name">{v.name}</span>
              <span className="voice-card-trait">
                {VOICE_TRAITS[v.id] ?? v.description}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
