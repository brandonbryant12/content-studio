import { Link } from '@tanstack/react-router';
import { memo } from 'react';
import type { RouterOutput } from '@repo/api/client';
import { Checkbox } from '@repo/ui/components/checkbox';

type PersonaListItem = RouterOutput['personas']['list'][number];

export interface PersonaCardProps {
  persona: PersonaListItem;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

export const PersonaCard = memo(function PersonaCard({
  persona,
  isSelected,
  onToggleSelect,
}: PersonaCardProps) {
  const initials = persona.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-200 ${
        isSelected
          ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
          : 'border-border/60 bg-card hover:border-border hover:shadow-sm'
      }`}
    >
      {/* Selection checkbox */}
      <div className="absolute top-3 left-3 z-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(persona.id)}
          aria-label={`Select ${persona.name}`}
          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=checked]:opacity-100 transition-opacity"
        />
      </div>

      <Link
        to="/personas/$personaId"
        params={{ personaId: persona.id }}
        className="flex flex-col items-center px-5 py-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
      >
        {/* Avatar */}
        <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-lg font-semibold tracking-tight mb-4 ring-2 ring-rose-500/10 transition-shadow group-hover:ring-rose-500/20">
          {persona.avatarStorageKey ? (
            <img
              src={persona.avatarStorageKey}
              alt={persona.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>

        {/* Name */}
        <h3 className="text-sm font-semibold text-foreground text-center truncate w-full">
          {persona.name}
        </h3>

        {/* Role */}
        {persona.role && (
          <p className="text-xs text-muted-foreground mt-1 text-center truncate w-full">
            {persona.role}
          </p>
        )}

        {/* Voice */}
        {persona.voiceName ? (
          <span className="inline-flex items-center gap-1 mt-3 px-2 py-0.5 rounded-full bg-muted/60 text-[11px] text-muted-foreground">
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
              />
            </svg>
            {persona.voiceName}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 mt-3 px-2 py-0.5 rounded-full bg-warning/10 text-[11px] text-warning font-medium">
            No voice
          </span>
        )}
      </Link>
    </div>
  );
});
