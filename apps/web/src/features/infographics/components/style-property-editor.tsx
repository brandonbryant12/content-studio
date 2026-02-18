import { Cross2Icon, PlusIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { useCallback } from 'react';
import type { StyleProperty } from '../hooks/use-infographic-settings';

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  text: 'T',
  color: 'C',
  number: '#',
};

const PROPERTY_TYPE_CYCLE: Array<StyleProperty['type']> = [
  'text',
  'color',
  'number',
];

interface StylePropertyEditorProps {
  properties: StyleProperty[];
  onChange: (properties: StyleProperty[]) => void;
  disabled?: boolean;
}

export function StylePropertyEditor({
  properties,
  onChange,
  disabled,
}: StylePropertyEditorProps) {
  const updateProperty = useCallback(
    (index: number, patch: Partial<StyleProperty>) => {
      const next = properties.map((p, i) =>
        i === index ? { ...p, ...patch } : p,
      );
      onChange(next);
    },
    [properties, onChange],
  );

  const removeProperty = useCallback(
    (index: number) => {
      onChange(properties.filter((_, i) => i !== index));
    },
    [properties, onChange],
  );

  const addProperty = useCallback(() => {
    onChange([...properties, { key: '', value: '', type: 'text' }]);
  }, [properties, onChange]);

  const cycleType = useCallback(
    (index: number) => {
      const current = properties[index]?.type ?? 'text';
      const currentIdx = PROPERTY_TYPE_CYCLE.indexOf(current);
      const nextType =
        PROPERTY_TYPE_CYCLE[(currentIdx + 1) % PROPERTY_TYPE_CYCLE.length];
      updateProperty(index, { type: nextType });
    },
    [properties, updateProperty],
  );

  return (
    <div className="space-y-2">
      {properties.map((prop, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <Input
            value={prop.key}
            onChange={(e) => updateProperty(index, { key: e.target.value })}
            placeholder="Property"
            disabled={disabled}
            className="h-8 text-xs flex-[2] min-w-0 px-2"
          />

          <button
            type="button"
            onClick={() => cycleType(index)}
            disabled={disabled}
            className="shrink-0 w-6 h-8 flex items-center justify-center rounded border border-border/60 text-[10px] font-bold text-muted-foreground hover:bg-muted/50 disabled:opacity-50 disabled:pointer-events-none"
            title={`Type: ${prop.type ?? 'text'} (click to cycle)`}
          >
            {PROPERTY_TYPE_LABELS[prop.type ?? 'text']}
          </button>

          {prop.type === 'color' ? (
            <div className="flex items-center gap-1 flex-[3] min-w-0">
              <input
                type="color"
                value={prop.value || '#000000'}
                onChange={(e) =>
                  updateProperty(index, { value: e.target.value })
                }
                disabled={disabled}
                className="w-8 h-8 rounded border border-border/60 cursor-pointer p-0.5 shrink-0 disabled:opacity-50"
              />
              <Input
                value={prop.value}
                onChange={(e) =>
                  updateProperty(index, { value: e.target.value })
                }
                placeholder="#000000"
                disabled={disabled}
                className="h-8 text-xs min-w-0 px-2"
              />
            </div>
          ) : prop.type === 'number' ? (
            <Input
              type="number"
              value={prop.value}
              onChange={(e) => updateProperty(index, { value: e.target.value })}
              placeholder="0"
              disabled={disabled}
              className="h-8 text-xs flex-[3] min-w-0 px-2"
            />
          ) : (
            <Input
              value={prop.value}
              onChange={(e) => updateProperty(index, { value: e.target.value })}
              placeholder="Value"
              disabled={disabled}
              className="h-8 text-xs flex-[3] min-w-0 px-2"
            />
          )}

          <button
            type="button"
            onClick={() => removeProperty(index)}
            disabled={disabled}
            className="shrink-0 w-6 h-8 flex items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-50 disabled:pointer-events-none"
            aria-label={`Remove ${prop.key || 'property'}`}
          >
            <Cross2Icon className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addProperty}
        disabled={disabled}
        className="w-full text-xs h-7"
      >
        <PlusIcon className="w-3.5 h-3.5 mr-1" />
        Add Property
      </Button>
    </div>
  );
}
