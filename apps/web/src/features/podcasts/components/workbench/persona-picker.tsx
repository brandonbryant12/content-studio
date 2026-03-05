import {
  ChevronDownIcon,
  InfoCircledIcon,
  PersonIcon,
} from '@radix-ui/react-icons';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Button } from '@repo/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/components/tooltip';
import { cn } from '@repo/ui/lib/utils';
import { Link } from '@tanstack/react-router';
import { usePersonaList } from '@/features/personas/hooks';
import {
  PERSONA_PICKER_EMPTY_DESCRIPTION,
  PERSONA_TOOLTIP_HELP,
} from '@/shared/lib/persona-guidance';

interface PersonaPickerProps {
  selectedPersonaId: string | null;
  onSelect: (personaId: string | null, voiceId: string | null) => void;
  disabled?: boolean;
  label?: string;
  conflictVoiceId?: string | null;
}

export function PersonaPicker({
  selectedPersonaId,
  onSelect,
  disabled,
  label = 'Persona',
  conflictVoiceId,
}: PersonaPickerProps) {
  const { data: personas = [] } = usePersonaList();

  const selectedPersona = personas.find((p) => p.id === selectedPersonaId);

  // Use a sentinel value for "none" since Radix Select doesn't support null values
  const NONE_VALUE = '__none__';

  const handleValueChange = (value: string) => {
    if (value === NONE_VALUE) {
      onSelect(null, null);
      return;
    }
    const persona = personas.find((p) => p.id === value);
    if (persona) {
      onSelect(persona.id, persona.voiceId);
    }
  };

  if (personas.length === 0) {
    return (
      <div className="persona-picker-empty flex flex-col items-start gap-3 rounded-xl border border-dashed border-border/70 bg-muted/30 p-4 text-left">
        <PersonIcon className="persona-picker-empty-icon" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">No personas yet</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {PERSONA_PICKER_EMPTY_DESCRIPTION}
          </p>
        </div>
        <Button asChild variant="link" size="sm" className="h-auto px-0">
          <Link to="/personas">Open Personas</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="persona-picker-wrap">
      <div className="flex items-center gap-1.5">
        <span className="persona-picker-label">{label}</span>
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`${label}: what is a persona?`}
              >
                <InfoCircledIcon className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-64 leading-relaxed">
              {PERSONA_TOOLTIP_HELP}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <SelectPrimitive.Root
        value={selectedPersonaId ?? NONE_VALUE}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          className="persona-picker-trigger"
          aria-label={`Select ${label.toLowerCase()}`}
        >
          {selectedPersona ? (
            <div className="persona-picker-selected">
              <div className="persona-picker-avatar">
                {selectedPersona.name.charAt(0)}
              </div>
              <div className="persona-picker-selected-info">
                <span className="persona-picker-selected-name">
                  {selectedPersona.name}
                </span>
                {selectedPersona.role && (
                  <span className="persona-picker-selected-role">
                    {selectedPersona.role}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="persona-picker-placeholder">
              <PersonIcon className="persona-picker-placeholder-icon" />
              <span>No persona</span>
            </div>
          )}
          <SelectPrimitive.Icon>
            <ChevronDownIcon className="persona-picker-chevron" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="persona-picker-dropdown min-w-[var(--radix-select-trigger-width)]"
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.Viewport>
              <SelectPrimitive.Item
                value={NONE_VALUE}
                className={`persona-picker-option ${!selectedPersonaId ? 'selected' : ''}`}
              >
                <div className="persona-picker-option-avatar none">
                  <PersonIcon className="w-3 h-3" />
                </div>
                <SelectPrimitive.ItemText>
                  <span className="persona-picker-option-name">No persona</span>
                </SelectPrimitive.ItemText>
              </SelectPrimitive.Item>

              {personas.map((persona) => (
                <SelectPrimitive.Item
                  key={persona.id}
                  value={persona.id}
                  className={`persona-picker-option ${selectedPersonaId === persona.id ? 'selected' : ''}`}
                >
                  <div className="persona-picker-option-avatar">
                    {persona.name.charAt(0)}
                  </div>
                  <div className="persona-picker-option-details">
                    <SelectPrimitive.ItemText>
                      <span className="persona-picker-option-name">
                        {persona.name}
                      </span>
                    </SelectPrimitive.ItemText>
                    {persona.role && (
                      <span className="persona-picker-option-role">
                        {persona.role}
                      </span>
                    )}
                  </div>
                  {persona.voiceId ? (
                    <span
                      className={cn(
                        'persona-picker-option-voice-badge',
                        conflictVoiceId &&
                          persona.voiceId === conflictVoiceId &&
                          'conflict',
                      )}
                    >
                      {persona.voiceName || persona.voiceId}
                    </span>
                  ) : (
                    <span className="persona-picker-option-voice-badge warning">
                      no voice
                    </span>
                  )}
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}
