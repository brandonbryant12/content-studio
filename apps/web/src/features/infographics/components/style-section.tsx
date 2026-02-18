import type { StyleProperty } from '../hooks/use-infographic-settings';
import { PresetPicker } from './preset-picker';
import { StylePropertyEditor } from './style-property-editor';

interface StyleSectionProps {
  properties: StyleProperty[];
  onChange: (properties: StyleProperty[]) => void;
  disabled?: boolean;
}

export function StyleSection({
  properties,
  onChange,
  disabled,
}: StyleSectionProps) {
  return (
    <fieldset className="space-y-4" disabled={disabled}>
      <legend className="text-sm font-medium">Style</legend>

      <PresetPicker
        currentProperties={properties}
        onApplyPreset={onChange}
        disabled={disabled}
      />

      <div>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Properties
        </p>
        <StylePropertyEditor
          properties={properties}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
    </fieldset>
  );
}
