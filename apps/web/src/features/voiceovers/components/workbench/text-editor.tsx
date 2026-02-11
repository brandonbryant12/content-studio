import { cn } from '@repo/ui/lib/utils';
import { memo, useCallback, type ChangeEvent } from 'react';

interface TextEditorProps {
  text: string;
  onChange: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_CHARACTERS = 5000;

// Hoisted constants for circle math - avoid recalculation on every render
const RING_RADIUS = 12;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Character count ring - circular progress indicator.
 */
const CharacterCountRing = memo(function CharacterCountRing({
  count,
  max,
}: {
  count: number;
  max: number;
}) {
  const percentage = Math.min((count / max) * 100, 100);
  const isWarning = percentage > 80;
  const isError = percentage >= 100;

  const strokeDashoffset =
    RING_CIRCUMFERENCE - (percentage / 100) * RING_CIRCUMFERENCE;

  return (
    <div className="manuscript-count">
      <svg
        className="manuscript-count-ring"
        width="32"
        height="32"
        viewBox="0 0 32 32"
        aria-hidden="true"
      >
        {/* Background circle */}
        <circle
          cx="16"
          cy="16"
          r={RING_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx="16"
          cy="16"
          r={RING_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          className={cn(
            'transition-all duration-300',
            isError
              ? 'text-destructive'
              : isWarning
                ? 'text-warning'
                : 'text-warning/60',
          )}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
          }}
        />
      </svg>
      <span
        className={cn(
          'manuscript-count-text',
          isError && 'text-destructive',
          isWarning && !isError && 'text-warning',
        )}
      >
        {count.toLocaleString()}
      </span>
    </div>
  );
});

/**
 * Manuscript - theatrical text editor with serif typography.
 * Designed for entering voiceover scripts.
 */
export function TextEditor({
  text,
  onChange,
  disabled,
  placeholder = 'Speak, and the Oracle shall give voice to your words...',
}: TextEditorProps) {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  return (
    <div className={cn('manuscript', disabled && 'manuscript-disabled')}>
      <textarea
        className="manuscript-content"
        value={text}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={MAX_CHARACTERS}
        aria-label="Voiceover script"
      />
      <div className="manuscript-footer">
        <CharacterCountRing count={text.length} max={MAX_CHARACTERS} />
      </div>
    </div>
  );
}
