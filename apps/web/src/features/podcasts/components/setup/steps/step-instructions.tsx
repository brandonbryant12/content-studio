import { useState } from 'react';

const PRESETS = [
  {
    label: 'Conversational',
    value:
      'Keep the tone casual and conversational, like two friends chatting.',
  },
  {
    label: 'Key takeaways',
    value:
      'Focus on extracting and highlighting the key takeaways and main insights.',
  },
  {
    label: 'Educational',
    value:
      'Make it educational and informative, explaining concepts clearly for beginners.',
  },
  {
    label: 'Add humor',
    value:
      'Include light humor and make the discussion entertaining and engaging.',
  },
  {
    label: 'Deep dive',
    value:
      'Go in-depth on the topic, exploring nuances and providing detailed analysis.',
  },
  {
    label: 'Quick summary',
    value:
      'Keep it concise and to the point, covering only the essential information.',
  },
];

const MAX_CHARS = 1000;

interface StepInstructionsProps {
  instructions: string;
  onInstructionsChange: (instructions: string) => void;
}

export function StepInstructions({
  instructions,
  onInstructionsChange,
}: StepInstructionsProps) {
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const handlePresetClick = (preset: (typeof PRESETS)[number]) => {
    if (activePreset === preset.label) {
      // Deselect preset
      setActivePreset(null);
      onInstructionsChange('');
    } else {
      // Select preset
      setActivePreset(preset.label);
      onInstructionsChange(preset.value);
    }
  };

  const handleTextChange = (value: string) => {
    // If user manually edits, clear preset selection
    const matchingPreset = PRESETS.find((p) => p.value === value);
    setActivePreset(matchingPreset?.label ?? null);
    onInstructionsChange(value.slice(0, MAX_CHARS));
  };

  return (
    <div className="setup-content">
      <div className="setup-step-header">
        <p className="setup-step-eyebrow">Step 4 of 4</p>
        <h2 className="setup-step-title">Custom Instructions</h2>
        <p className="setup-step-description">
          Add any special instructions for the AI. This step is optional.
        </p>
      </div>

      {/* Preset buttons */}
      <div className="setup-preset-group">
        {PRESETS.map((preset) => (
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
        />
        <p className="setup-char-count">
          {instructions.length} / {MAX_CHARS}
        </p>
      </div>

      <p className="setup-hint text-center mt-4">
        You can always edit these settings later in the workbench.
      </p>
    </div>
  );
}
