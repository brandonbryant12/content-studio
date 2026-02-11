import { cn } from '@repo/ui/lib/utils';
import { memo, useCallback, type MouseEvent, type KeyboardEvent } from 'react';

import { VOICES } from '../../lib/voices';
import { VoiceSymbol } from './voice-symbols';
import { useVoicePreview, useVoices } from '@/shared/hooks';

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
export const VoiceSelector = memo(function VoiceSelector({
  voice,
  onChange,
  disabled,
}: VoiceSelectorProps) {
  const { data: voicesData } = useVoices();
  const { playingVoiceId, play, stop } = useVoicePreview();

  // Build a map of voiceId -> previewUrl from the API
  const previewUrls = voicesData
    ? Object.fromEntries(
        voicesData
          .filter((v) => v.previewUrl)
          .map((v) => [v.id, v.previewUrl!]),
      )
    : {};

  const handleVoiceSelect = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const voiceId = e.currentTarget.dataset.voiceId;
      if (voiceId) onChange(voiceId);
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const voiceId = e.currentTarget.dataset.voiceId;
        if (voiceId) onChange(voiceId);
      }
    },
    [onChange],
  );

  const handlePreview = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      const voiceId = e.currentTarget.dataset.voiceId;
      if (!voiceId) return;

      if (playingVoiceId === voiceId) {
        stop();
      } else {
        const url = previewUrls[voiceId];
        if (url) play(voiceId, url);
      }
    },
    [playingVoiceId, previewUrls, play, stop],
  );

  return (
    <fieldset className="voice-ensemble" disabled={disabled}>
      <legend className="sr-only">Select a voice</legend>
      <div className="voice-ensemble-stage" role="radiogroup">
        {VOICES.map((v) => {
          const isSelected = voice === v.id;
          return (
            <div
              key={v.id}
              role="radio"
              tabIndex={disabled ? -1 : 0}
              data-voice-id={v.id}
              className={cn('voice-card', isSelected && 'voice-card-selected')}
              onClick={handleVoiceSelect}
              onKeyDown={handleKeyDown}
              aria-checked={isSelected}
              aria-disabled={disabled}
              aria-label={`${v.name} — ${VOICE_TRAITS[v.id] ?? v.description}`}
            >
              <div className="voice-card-symbol">
                <VoiceSymbol voiceId={v.id} className="w-5 h-5" />
              </div>
              <span className="voice-card-name">{v.name}</span>
              <span className="voice-card-trait">
                {VOICE_TRAITS[v.id] ?? v.description}
              </span>
              <button
                type="button"
                className={cn(
                  'voice-preview-btn',
                  playingVoiceId === v.id && 'playing',
                )}
                data-voice-id={v.id}
                onClick={handlePreview}
                aria-label={
                  playingVoiceId === v.id
                    ? `Stop ${v.name} preview`
                    : `Preview ${v.name} voice`
                }
                disabled={disabled || !previewUrls[v.id]}
                tabIndex={disabled ? -1 : 0}
              >
                {playingVoiceId === v.id ? (
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="voice-preview-icon"
                    aria-hidden="true"
                  >
                    <path d="M5.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75A.75.75 0 0 0 7.25 3h-1.5ZM12.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75a.75.75 0 0 0-.75-.75h-1.5Z" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="voice-preview-icon"
                    aria-hidden="true"
                  >
                    <path d="M10.5 3.75a.75.75 0 0 0-1.264-.546L5.203 7H3.006a.75.75 0 0 0-.75.75v4.5c0 .414.336.75.75.75h2.197l4.033 3.796A.75.75 0 0 0 10.5 16.25V3.75Z" />
                    <path d="M13.26 7.174a.75.75 0 0 1 1.06-.026 4.501 4.501 0 0 1 0 5.704.75.75 0 1 1-1.086-1.034 3.001 3.001 0 0 0 0-3.644.75.75 0 0 1 .026-1Z" />
                  </svg>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
});
