import { CheckCircledIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import type { PersonaFormValues } from './persona-form';

interface PersonaSaveBarProps {
  formValues: PersonaFormValues;
  isSaving: boolean;
  hasChanges: boolean;
  onSave: () => void;
  onDiscard: () => void;
  saveLabel: string;
  savingLabel: string;
  discardLabel: string;
}

function getFilledFieldCount(values: PersonaFormValues): {
  filled: number;
  total: number;
} {
  const fields = [
    values.name.trim(),
    values.role.trim(),
    values.personalityDescription.trim(),
    values.speakingStyle.trim(),
    values.exampleQuotes.some((q) => q.trim()),
    values.voiceId,
  ];
  const filled = fields.filter(Boolean).length;
  return { filled, total: fields.length };
}

export function PersonaSaveBar({
  formValues,
  isSaving,
  hasChanges,
  onSave,
  onDiscard,
  saveLabel,
  savingLabel,
  discardLabel,
}: PersonaSaveBarProps) {
  const canSave = formValues.name.trim() && hasChanges;
  if (!canSave) return null;

  const { filled, total } = getFilledFieldCount(formValues);
  const isComplete = filled === total;

  return (
    <div
      className="persona-save-bar"
      role="toolbar"
      aria-label="Save persona"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircledIcon className="w-4 h-4 text-success" />
          ) : (
            <FieldRing filled={filled} total={total} />
          )}
          <span className="text-sm text-muted-foreground tabular-nums">
            {isComplete ? (
              'All fields filled'
            ) : (
              <>
                {filled} of {total} fields
              </>
            )}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDiscard}
          disabled={isSaving}
        >
          {discardLabel}
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving || !formValues.name.trim()}
        >
          {isSaving ? (
            <>
              <Spinner className="w-3.5 h-3.5 mr-1.5" />
              {savingLabel}
            </>
          ) : (
            saveLabel
          )}
        </Button>
      </div>
    </div>
  );
}

function FieldRing({ filled, total }: { filled: number; total: number }) {
  const radius = 7;
  const circumference = 2 * Math.PI * radius;
  const progress = (filled / total) * circumference;

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      className="shrink-0"
      aria-hidden="true"
    >
      <circle
        cx="9"
        cy="9"
        r={radius}
        fill="none"
        strokeWidth="2"
        className="stroke-muted/40"
      />
      <circle
        cx="9"
        cy="9"
        r={radius}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        className="stroke-primary"
        strokeDasharray={circumference}
        strokeDashoffset={circumference - progress}
        transform="rotate(-90 9 9)"
        style={{ transition: 'stroke-dashoffset 300ms ease' }}
      />
    </svg>
  );
}
