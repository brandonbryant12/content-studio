// features/brands/components/brand-inputs/color-picker.tsx

import { Input } from '@repo/ui/components/input';
import { cn } from '@repo/ui/lib/utils';
import { memo, useCallback, useRef, type ChangeEvent } from 'react';

const DEFAULT_PRESETS = [
  { name: 'Royal Blue', hex: '#4F46E5' },
  { name: 'Ocean', hex: '#0EA5E9' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Slate', hex: '#64748B' },
  { name: 'Teal', hex: '#14B8A6' },
];

export interface ColorPreset {
  name: string;
  hex: string;
}

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  presets?: ColorPreset[];
  disabled?: boolean;
}

/**
 * Color picker with swatch display and preset suggestions.
 * Uses native color input for cross-browser compatibility.
 */
export const ColorPicker = memo(function ColorPicker({
  value,
  onChange,
  label,
  presets = DEFAULT_PRESETS,
  disabled,
}: ColorPickerProps) {
  const colorInputRef = useRef<HTMLInputElement>(null);

  const handleSwatchClick = useCallback(() => {
    colorInputRef.current?.click();
  }, []);

  const handleColorChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  const handleHexChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const hex = e.target.value;
      // Allow typing, validate on blur or when valid
      if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        onChange(hex);
      }
    },
    [onChange],
  );

  const handlePresetClick = useCallback(
    (hex: string) => {
      if (!disabled) {
        onChange(hex);
      }
    },
    [onChange, disabled],
  );

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      {/* Color swatch and hex input */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSwatchClick}
          disabled={disabled}
          className={cn(
            'h-11 w-11 rounded-xl border-2 border-border shadow-sm transition-all',
            'hover:border-primary/50 hover:shadow-md',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
          style={{ backgroundColor: value }}
          aria-label="Open color picker"
        >
          <input
            ref={colorInputRef}
            type="color"
            value={value}
            onChange={handleColorChange}
            disabled={disabled}
            className="sr-only"
            aria-hidden="true"
          />
        </button>

        <Input
          type="text"
          value={value}
          onChange={handleHexChange}
          placeholder="#000000"
          maxLength={7}
          disabled={disabled}
          className="w-28 font-mono text-sm"
          aria-label="Hex color value"
        />
      </div>

      {/* Preset colors */}
      {presets.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Suggestions</span>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.hex}
                type="button"
                onClick={() => handlePresetClick(preset.hex)}
                disabled={disabled}
                className={cn(
                  'group flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-all',
                  'hover:border-primary/50 hover:bg-muted/50',
                  value === preset.hex && 'border-primary bg-primary/5',
                  disabled && 'opacity-50 cursor-not-allowed',
                )}
                title={preset.name}
              >
                <span
                  className="h-4 w-4 rounded-md shadow-sm"
                  style={{ backgroundColor: preset.hex }}
                />
                <span className="text-xs text-muted-foreground group-hover:text-foreground">
                  {preset.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
