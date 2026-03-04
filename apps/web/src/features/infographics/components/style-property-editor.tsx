import { Cross2Icon, PlusIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { useCallback } from 'react';
import type { StyleProperty } from '../hooks/use-infographic-settings';

const PROPERTY_TYPES = [
  { value: 'text' as const, label: 'Text', icon: 'Aa' },
  { value: 'color' as const, label: 'Color', icon: '\u25CF' },
  { value: 'number' as const, label: 'Number', icon: '#' },
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

  const changeType = useCallback(
    (index: number, type: StyleProperty['type']) => {
      const current = properties[index]?.type ?? 'text';
      if (current === type) return;
      // Clear value when switching to/from color to avoid invalid data
      const needsClear = current === 'color' || type === 'color';
      updateProperty(index, { type, ...(needsClear ? { value: '' } : {}) });
    },
    [properties, updateProperty],
  );

  return (
    <div className="space-y-2.5">
      {properties.map((prop, index) => (
        <div
          key={`${index}-${prop.key}-${prop.type}`}
          className="rounded-lg border border-border/40 bg-muted/10 p-2 space-y-1.5"
        >
          <div className="flex items-center gap-1.5">
            <Input
              value={prop.key}
              onChange={(e) => updateProperty(index, { key: e.target.value })}
              placeholder="Property"
              disabled={disabled}
              className="h-7 text-xs min-w-0 flex-1 px-2"
            />
            <div className="shrink-0 h-7 inline-flex items-center rounded-md border border-border/60 bg-muted/20 p-0.5">
              {PROPERTY_TYPES.map((option) => {
                const isActive = (prop.type ?? 'text') === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => changeType(index, option.value)}
                    disabled={disabled}
                    className={`h-5.5 min-w-5.5 px-1.5 rounded text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    } disabled:opacity-50 disabled:pointer-events-none`}
                    title={`Set type: ${option.label}`}
                    aria-label={`Set ${prop.key || 'property'} type to ${option.label}`}
                    aria-pressed={isActive}
                  >
                    {option.icon}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => removeProperty(index)}
              disabled={disabled}
              className="shrink-0 w-5.5 h-7 flex items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-50 disabled:pointer-events-none"
              aria-label={`Remove ${prop.key || 'property'}`}
            >
              <Cross2Icon className="w-3.5 h-3.5" />
            </button>
          </div>

          {prop.type === 'color' ? (
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={prop.value || '#000000'}
                onChange={(e) =>
                  updateProperty(index, { value: e.target.value })
                }
                disabled={disabled}
                className="w-7 h-7 rounded border border-border/60 cursor-pointer p-0.5 shrink-0 disabled:opacity-50"
              />
              <Input
                value={prop.value}
                onChange={(e) =>
                  updateProperty(index, { value: e.target.value })
                }
                placeholder="#000000"
                disabled={disabled}
                className="h-7 text-xs min-w-0 flex-1 px-2"
              />
            </div>
          ) : prop.type === 'number' ? (
            <Input
              type="number"
              value={prop.value}
              onChange={(e) => updateProperty(index, { value: e.target.value })}
              placeholder="0"
              disabled={disabled}
              className="h-7 text-xs min-w-0 px-2"
            />
          ) : (
            <Input
              value={prop.value}
              onChange={(e) => updateProperty(index, { value: e.target.value })}
              placeholder="Value"
              disabled={disabled}
              className="h-7 text-xs min-w-0 px-2"
            />
          )}
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
