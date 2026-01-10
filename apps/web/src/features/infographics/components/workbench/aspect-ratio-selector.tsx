// features/infographics/components/workbench/aspect-ratio-selector.tsx

import { ASPECT_RATIOS } from '../../hooks/use-infographic-settings';

export interface AspectRatioSelectorProps {
  /** Currently selected aspect ratio */
  value: string;
  /** Callback when aspect ratio is selected */
  onChange: (ratio: string) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

/**
 * Visual aspect ratio selector with preview shapes.
 * Shows different aspect ratio options with their use cases.
 */
export function AspectRatioSelector({
  value,
  onChange,
  disabled = false,
}: AspectRatioSelectorProps) {
  return (
    <div className="aspect-ratio-selector">
      <label className="aspect-ratio-selector-label">Aspect Ratio</label>
      <div className="aspect-ratio-selector-grid">
        {ASPECT_RATIOS.map((ratio) => (
          <AspectRatioCard
            key={ratio.id}
            ratio={ratio}
            isSelected={value === ratio.id}
            onClick={() => onChange(ratio.id)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

interface AspectRatioCardProps {
  ratio: (typeof ASPECT_RATIOS)[number];
  isSelected: boolean;
  onClick: () => void;
  disabled: boolean;
}

function AspectRatioCard({
  ratio,
  isSelected,
  onClick,
  disabled,
}: AspectRatioCardProps) {
  const className = `aspect-ratio-card ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      aria-pressed={isSelected}
    >
      <AspectRatioPreview ratio={ratio.id} />
      <div className="aspect-ratio-card-content">
        <span className="aspect-ratio-card-name">{ratio.name}</span>
        <span className="aspect-ratio-card-ratio">{ratio.id}</span>
      </div>
    </button>
  );
}

function AspectRatioPreview({ ratio }: { ratio: string }) {
  // Calculate dimensions based on aspect ratio
  // Base height is 24px, width varies
  const baseHeight = 24;
  const parts = ratio.split(':').map(Number);
  const width = parts[0] ?? 1;
  const height = parts[1] ?? 1;
  const aspectValue = width / height;

  // Scale to fit within reasonable bounds
  let previewWidth: number;
  let previewHeight: number;

  if (aspectValue >= 1) {
    // Wider than tall - constrain width
    previewWidth = Math.min(48, baseHeight * aspectValue);
    previewHeight = previewWidth / aspectValue;
  } else {
    // Taller than wide - constrain height
    previewHeight = baseHeight;
    previewWidth = baseHeight * aspectValue;
  }

  return (
    <div className="aspect-ratio-preview-container">
      <div
        className="aspect-ratio-preview-shape"
        style={{
          width: `${previewWidth}px`,
          height: `${previewHeight}px`,
        }}
      />
    </div>
  );
}
