// features/brands/components/persona-selector.tsx

import { memo, useCallback, type MouseEvent } from 'react';
import { cn } from '@repo/ui/lib/utils';

export interface PersonaSelectorOption {
  id: string;
  name: string;
  role: string;
  voiceId: string;
  personalityDescription: string;
}

interface PersonaSelectorProps {
  value: string | null;
  onChange: (persona: PersonaSelectorOption | null) => void;
  personas: PersonaSelectorOption[];
  disabled?: boolean;
}

/**
 * Persona selector with card gallery.
 * Displays personas as cards with name, role, and personality.
 * Selection auto-fills voiceId in parent form.
 */
export const PersonaSelector = memo(function PersonaSelector({
  value,
  onChange,
  personas,
  disabled,
}: PersonaSelectorProps) {
  const handleSelect = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      const personaId = e.currentTarget.dataset.personaId;
      if (personaId === '__none__') {
        onChange(null);
        return;
      }
      const persona = personas.find((p) => p.id === personaId);
      if (persona) {
        onChange(persona);
      }
    },
    [onChange, personas],
  );

  if (personas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No personas defined for this brand.
      </p>
    );
  }

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="sr-only">Select a persona</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {/* None option */}
        <button
          type="button"
          data-persona-id="__none__"
          className={cn(
            'relative flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all',
            'hover:border-border hover:bg-muted/50',
            value === null && 'border-primary bg-primary/5',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
          onClick={handleSelect}
          aria-pressed={value === null}
          disabled={disabled}
        >
          <span className="font-medium text-sm text-muted-foreground">
            None
          </span>
          <span className="text-xs text-muted-foreground">
            No persona selected
          </span>
        </button>

        {personas.map((persona) => {
          const isSelected = value === persona.id;
          return (
            <button
              key={persona.id}
              type="button"
              data-persona-id={persona.id}
              className={cn(
                'relative flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all',
                'hover:border-border hover:bg-muted/50',
                isSelected && 'border-primary bg-primary/5',
                disabled && 'opacity-50 cursor-not-allowed',
              )}
              onClick={handleSelect}
              aria-pressed={isSelected}
              disabled={disabled}
            >
              <span className="font-medium text-sm">{persona.name}</span>
              <span className="text-xs text-muted-foreground">
                {persona.role}
              </span>
              <span className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {persona.personalityDescription}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
});
