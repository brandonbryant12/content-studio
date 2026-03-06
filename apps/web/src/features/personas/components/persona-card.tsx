import { Checkbox } from '@repo/ui/components/checkbox';
import { Link } from '@tanstack/react-router';
import { memo } from 'react';
import type { RouterOutput } from '@repo/api/client';
import { useImageFallback } from '@/shared/hooks/use-image-fallback';
import { getStorageUrl } from '@/shared/lib/storage-url';

type PersonaListItem = RouterOutput['personas']['list'][number];

interface PersonaCardProps {
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
  const avatar = useImageFallback(
    persona.avatarStorageKey ? getStorageUrl(persona.avatarStorageKey) : null,
  );

  return (
    <div
      role="listitem"
      className="content-card group"
      data-selected={isSelected || undefined}
    >
      {/* Selection checkbox */}
      <div
        className="content-card-checkbox"
        data-visible={isSelected || undefined}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(persona.id)}
          aria-label={`Select ${persona.name}`}
        />
      </div>

      <Link
        to="/personas/$personaId"
        params={{ personaId: persona.id }}
        className="flex flex-col items-center px-5 py-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
      >
        {/* Avatar */}
        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-semibold tracking-tight mb-4 ring-2 ring-primary/10 transition-shadow group-hover:ring-primary/20">
          {avatar.src ? (
            <img
              src={avatar.src}
              alt={persona.name}
              className="w-full h-full rounded-full object-cover"
              onError={avatar.onError}
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
          <span className="inline-flex items-center gap-1 mt-3 px-2 py-0.5 rounded-full bg-muted/60 text-xs text-muted-foreground">
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
          <span className="inline-flex items-center gap-1 mt-3 px-2 py-0.5 rounded-full bg-muted/60 text-xs text-muted-foreground">
            —
          </span>
        )}
      </Link>
    </div>
  );
});
