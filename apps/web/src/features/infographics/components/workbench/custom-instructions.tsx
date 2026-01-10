// features/infographics/components/workbench/custom-instructions.tsx

import { Textarea } from '@repo/ui/components/textarea';

export interface CustomInstructionsProps {
  /** Current instructions value */
  value: string | null;
  /** Callback when instructions change */
  onChange: (instructions: string | null) => void;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Textarea for custom prompt additions.
 * Allows users to provide additional guidance for infographic generation.
 */
export function CustomInstructions({
  value,
  onChange,
  disabled = false,
  placeholder = 'Add any specific instructions for the AI, such as color preferences, emphasis on certain points, or style directions...',
}: CustomInstructionsProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue === '' ? null : newValue);
  };

  return (
    <div className="custom-instructions">
      <label className="custom-instructions-label" htmlFor="custom-instructions">
        Custom Instructions
        <span className="custom-instructions-optional">(optional)</span>
      </label>
      <Textarea
        id="custom-instructions"
        value={value ?? ''}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        className="custom-instructions-textarea"
        rows={3}
      />
      <p className="custom-instructions-hint">
        These instructions will be added to the generation prompt.
      </p>
    </div>
  );
}
