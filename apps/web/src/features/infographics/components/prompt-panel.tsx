import { useId } from 'react';

interface PromptPanelProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  disabled?: boolean;
  isEditMode?: boolean;
}

const MAX_PROMPT_LENGTH = 2000;

export function PromptPanel({
  prompt,
  onPromptChange,
  disabled,
  isEditMode,
}: PromptPanelProps) {
  const textareaId = useId();

  const label = isEditMode ? 'Edit Instructions' : 'Prompt';
  const placeholder = isEditMode
    ? 'Describe what to change (e.g., "Make the title larger", "Change the color scheme to blue")...'
    : 'Describe the infographic you want to generate...';

  return (
    <div className="space-y-2">
      <label htmlFor={textareaId} className="text-sm font-medium">
        {label}
      </label>
      {isEditMode && (
        <p className="text-xs text-muted-foreground">
          Your changes will build on the current image
        </p>
      )}
      <textarea
        id={textareaId}
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-[120px] rounded-lg border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y disabled:opacity-50"
        maxLength={MAX_PROMPT_LENGTH}
        disabled={disabled}
        aria-label={label}
      />
      <p className="text-xs text-muted-foreground text-right">
        {prompt.length}/{MAX_PROMPT_LENGTH}
      </p>
    </div>
  );
}
