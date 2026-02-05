import { ChevronDownIcon, Cross2Icon } from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { useState, useEffect, useRef } from 'react';
import { usePersonas } from '@/features/personas/hooks/use-personas';

interface PersonaSelectorProps {
  value: string | null;
  onChange: (id: string | null) => void;
  role?: 'host' | 'cohost';
  disabled?: boolean;
  label?: string;
}

export function PersonaSelector({
  value,
  onChange,
  role,
  disabled,
  label,
}: PersonaSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: personas = [] } = usePersonas({ role });

  const selectedPersona = personas.find((p) => p.id === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      {label && (
        <span className="text-xs text-muted-foreground mb-1.5 block">
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors text-left ${
          isOpen
            ? 'border-primary bg-primary/5'
            : 'border-border bg-background hover:bg-muted'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex-1 min-w-0">
          {selectedPersona ? (
            <div className="flex items-center gap-2">
              <span className="truncate">{selectedPersona.name}</span>
              <Badge variant={selectedPersona.role === 'host' ? 'purple' : 'default'}>
                {selectedPersona.role === 'host' ? 'Host' : 'Co-host'}
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground">
              {role === 'host'
                ? 'Select host persona...'
                : role === 'cohost'
                  ? 'Select co-host persona...'
                  : 'Select persona...'}
            </span>
          )}
        </div>
        {value && !disabled ? (
          <Cross2Icon
            className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
          />
        ) : (
          <ChevronDownIcon className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-popover shadow-md py-1 max-h-48 overflow-y-auto">
          {personas.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No personas found. Create one first.
            </div>
          ) : (
            personas.map((persona) => (
              <button
                key={persona.id}
                type="button"
                onClick={() => {
                  onChange(persona.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-muted ${
                  value === persona.id ? 'bg-primary/10 text-primary' : ''
                }`}
              >
                <span className="flex-1 truncate">{persona.name}</span>
                <Badge
                  variant={persona.role === 'host' ? 'purple' : 'default'}
                >
                  {persona.role === 'host' ? 'Host' : 'Co-host'}
                </Badge>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
