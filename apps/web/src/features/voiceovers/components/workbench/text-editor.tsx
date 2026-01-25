// features/voiceovers/components/workbench/text-editor.tsx

import { cn } from '@repo/ui/lib/utils';

interface TextEditorProps {
  text: string;
  onChange: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_CHARACTERS = 5000;

/**
 * Character count ring - circular progress indicator.
 */
function CharacterCountRing({ count, max }: { count: number; max: number }) {
  const percentage = Math.min((count / max) * 100, 100);
  const isWarning = percentage > 80;
  const isError = percentage >= 100;

  // Circle math: circumference = 2 * PI * r
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

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
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
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
}

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
  return (
    <div className={cn('manuscript', disabled && 'manuscript-disabled')}>
      <textarea
        className="manuscript-content"
        value={text}
        onChange={(e) => onChange(e.target.value)}
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
