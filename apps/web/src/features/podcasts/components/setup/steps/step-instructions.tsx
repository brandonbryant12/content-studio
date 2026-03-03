import {
  INSTRUCTION_CHAR_LIMIT,
  INSTRUCTION_PRESETS,
  getInstructionPresetLabel,
} from '@/features/podcasts/lib/instruction-presets';

interface StepInstructionsProps {
  instructions: string;
  onInstructionsChange: (instructions: string) => void;
}

export function StepInstructions({
  instructions,
  onInstructionsChange,
}: StepInstructionsProps) {
  const activePreset = getInstructionPresetLabel(instructions);

  const handlePresetClick = (preset: (typeof INSTRUCTION_PRESETS)[number]) => {
    if (activePreset === preset.label) {
      onInstructionsChange('');
      return;
    }

    onInstructionsChange(preset.value);
  };

  const handleTextChange = (value: string) => {
    onInstructionsChange(value.slice(0, INSTRUCTION_CHAR_LIMIT));
  };

  return (
    <div className="setup-content">
      <div className="setup-step-header">
        <p className="setup-step-eyebrow">Step 3 of 3</p>
        <h2 className="setup-step-title">Custom Instructions</h2>
        <p className="setup-step-description">
          Add any special instructions for the AI. This step is optional.
        </p>
      </div>

      {/* Preset buttons */}
      <div className="setup-preset-group">
        {INSTRUCTION_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => handlePresetClick(preset)}
            className={`setup-preset-btn ${activePreset === preset.label ? 'active' : ''}`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom instructions textarea */}
      <div className="setup-field">
        <textarea
          value={instructions}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Add any specific instructions for the AI when generating your podcast script..."
          rows={5}
          className="setup-textarea"
          aria-label="Custom instructions for podcast generation"
        />
        <p className="setup-char-count">
          {instructions.length} / {INSTRUCTION_CHAR_LIMIT}
        </p>
      </div>

      <p className="setup-hint text-center mt-4">
        You can always edit these settings later in the workbench.
      </p>
    </div>
  );
}
