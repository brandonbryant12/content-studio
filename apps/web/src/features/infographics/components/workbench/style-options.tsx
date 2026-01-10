// features/infographics/components/workbench/style-options.tsx

import type { StyleOptions as StyleOptionsType } from '../../hooks/use-infographic-settings';

export interface StyleOptionsPanelProps {
  /** Current style options */
  value: StyleOptionsType | null;
  /** Callback when options change */
  onChange: (options: StyleOptionsType | null) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
}

// Predefined color schemes
const COLOR_SCHEMES = [
  { id: 'default', name: 'Default', colors: ['#3b82f6', '#10b981', '#f59e0b'] },
  { id: 'corporate', name: 'Corporate', colors: ['#1e40af', '#374151', '#0891b2'] },
  { id: 'vibrant', name: 'Vibrant', colors: ['#ec4899', '#8b5cf6', '#06b6d4'] },
  { id: 'earth', name: 'Earth Tones', colors: ['#78716c', '#65a30d', '#b45309'] },
  { id: 'monochrome', name: 'Monochrome', colors: ['#1f2937', '#4b5563', '#9ca3af'] },
  { id: 'warm', name: 'Warm', colors: ['#dc2626', '#ea580c', '#facc15'] },
  { id: 'cool', name: 'Cool', colors: ['#0ea5e9', '#6366f1', '#14b8a6'] },
  { id: 'pastel', name: 'Pastel', colors: ['#fca5a5', '#c4b5fd', '#a5f3fc'] },
] as const;

// Predefined emphasis options
const EMPHASIS_OPTIONS = [
  { id: 'data', label: 'Data & Numbers' },
  { id: 'icons', label: 'Icons & Imagery' },
  { id: 'text', label: 'Text & Labels' },
  { id: 'flow', label: 'Flow & Connections' },
  { id: 'hierarchy', label: 'Visual Hierarchy' },
  { id: 'whitespace', label: 'White Space' },
] as const;

// Predefined layout options
const LAYOUT_OPTIONS = [
  { id: 'compact', name: 'Compact', description: 'Dense layout, more content' },
  { id: 'balanced', name: 'Balanced', description: 'Standard spacing' },
  { id: 'spacious', name: 'Spacious', description: 'More breathing room' },
] as const;

/**
 * Structured style options component.
 * Allows users to select color scheme, emphasis areas, and layout preferences.
 */
export function StyleOptionsPanel({
  value,
  onChange,
  disabled = false,
}: StyleOptionsPanelProps) {
  const handleColorSchemeChange = (colorScheme: string) => {
    onChange({
      ...value,
      colorScheme: colorScheme === 'default' ? undefined : colorScheme,
    });
  };

  const handleEmphasisToggle = (emphasisId: string) => {
    const currentEmphasis = value?.emphasis ?? [];
    const isSelected = currentEmphasis.includes(emphasisId);

    const newEmphasis = isSelected
      ? currentEmphasis.filter((e) => e !== emphasisId)
      : [...currentEmphasis, emphasisId];

    onChange({
      ...value,
      emphasis: newEmphasis.length > 0 ? newEmphasis : undefined,
    });
  };

  const handleLayoutChange = (layout: string) => {
    onChange({
      ...value,
      layout: layout === 'balanced' ? undefined : layout,
    });
  };

  const currentColorScheme = value?.colorScheme ?? 'default';
  const currentEmphasis = value?.emphasis ?? [];
  const currentLayout = value?.layout ?? 'balanced';

  return (
    <div className="style-options">
      {/* Color Scheme */}
      <div className="style-options-section">
        <label className="style-options-label">Color Scheme</label>
        <div className="style-options-color-grid">
          {COLOR_SCHEMES.map((scheme) => (
            <button
              key={scheme.id}
              type="button"
              onClick={() => handleColorSchemeChange(scheme.id)}
              disabled={disabled}
              className={`style-options-color-card ${currentColorScheme === scheme.id ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
              aria-pressed={currentColorScheme === scheme.id}
            >
              <div className="style-options-color-swatches">
                {scheme.colors.map((color, i) => (
                  <div
                    key={i}
                    className="style-options-color-swatch"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="style-options-color-name">{scheme.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Emphasis Areas */}
      <div className="style-options-section">
        <label className="style-options-label">
          Emphasis
          <span className="style-options-hint-inline">(select any that apply)</span>
        </label>
        <div className="style-options-emphasis-grid">
          {EMPHASIS_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleEmphasisToggle(option.id)}
              disabled={disabled}
              className={`style-options-emphasis-chip ${currentEmphasis.includes(option.id) ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
              aria-pressed={currentEmphasis.includes(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Layout Density */}
      <div className="style-options-section">
        <label className="style-options-label">Layout Density</label>
        <div className="style-options-layout-grid">
          {LAYOUT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleLayoutChange(option.id)}
              disabled={disabled}
              className={`style-options-layout-card ${currentLayout === option.id ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
              aria-pressed={currentLayout === option.id}
            >
              <span className="style-options-layout-name">{option.name}</span>
              <span className="style-options-layout-desc">{option.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
