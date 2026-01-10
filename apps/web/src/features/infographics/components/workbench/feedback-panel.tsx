// features/infographics/components/workbench/feedback-panel.tsx

import { InfoCircledIcon } from '@radix-ui/react-icons';
import { Textarea } from '@repo/ui/components/textarea';

export interface FeedbackPanelProps {
  /** Current feedback instructions value */
  value: string | null;
  /** Callback when feedback changes */
  onChange: (feedback: string | null) => void;
  /** Whether the panel is disabled */
  disabled?: boolean;
  /** Whether the infographic has been generated at least once */
  hasGenerated: boolean;
}

/**
 * Feedback panel shown after first generation.
 * Allows users to provide iteration feedback for regeneration.
 */
export function FeedbackPanel({
  value,
  onChange,
  disabled = false,
  hasGenerated,
}: FeedbackPanelProps) {
  // Only show if already generated
  if (!hasGenerated) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue === '' ? null : newValue);
  };

  return (
    <div className="feedback-panel">
      <div className="feedback-panel-header">
        <InfoCircledIcon className="w-4 h-4 text-blue-500" />
        <span className="feedback-panel-title">Iteration Feedback</span>
      </div>

      <p className="feedback-panel-description">
        Not happy with the result? Describe what you'd like to change, and we'll
        regenerate with your feedback in mind.
      </p>

      <Textarea
        value={value ?? ''}
        onChange={handleChange}
        disabled={disabled}
        placeholder="e.g., Make the text larger, use brighter colors, emphasize the first two points more..."
        className="feedback-panel-textarea"
        rows={3}
      />

      <div className="feedback-panel-suggestions">
        <span className="feedback-panel-suggestions-label">Common feedback:</span>
        <div className="feedback-panel-suggestions-list">
          <SuggestionChip
            text="Larger text"
            onClick={() => appendFeedback('Make the text larger and more readable.')}
            disabled={disabled}
          />
          <SuggestionChip
            text="More contrast"
            onClick={() => appendFeedback('Increase contrast between elements.')}
            disabled={disabled}
          />
          <SuggestionChip
            text="Simpler layout"
            onClick={() => appendFeedback('Simplify the layout with less visual clutter.')}
            disabled={disabled}
          />
          <SuggestionChip
            text="More visual"
            onClick={() => appendFeedback('Add more icons and visual elements.')}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );

  function appendFeedback(text: string) {
    const current = value ?? '';
    const separator = current.length > 0 ? ' ' : '';
    onChange(current + separator + text);
  }
}

interface SuggestionChipProps {
  text: string;
  onClick: () => void;
  disabled: boolean;
}

function SuggestionChip({ text, onClick, disabled }: SuggestionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="feedback-panel-suggestion-chip"
    >
      {text}
    </button>
  );
}
