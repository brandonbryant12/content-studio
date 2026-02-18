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
    <fieldset className="space-y-2" disabled={disabled}>
      <div className="flex items-center justify-between">
        <legend className="text-sm font-medium">Style</legend>
        <PresetPicker
          currentProperties={properties}
          onApplyPreset={onChange}
          disabled={disabled}
        />
      </div>
      <StylePropertyEditor
        properties={properties}
        onChange={onChange}
        disabled={disabled}
      />
    </fieldset>
  );
}
