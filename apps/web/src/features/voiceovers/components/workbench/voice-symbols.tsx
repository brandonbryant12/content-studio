/**
 * Voice Symbol Icons
 * Inspired by Greek pottery art for the Oracle Theatre design.
 * Each 24x24 SVG uses currentColor for theming.
 */

interface VoiceSymbolProps {
  className?: string;
}

/** Aoede (muse of song) - Lyre shape */
export function AoedeSymbol({ className }: VoiceSymbolProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 4c-2 0-3 1.5-3 4v8c0 2.5 1.5 4 4 4h6c2.5 0 4-1.5 4-4V8c0-2.5-1-4-3-4" />
      <path d="M8 4c0 2 1 3 4 3s4-1 4-3" />
      <line x1="9" y1="10" x2="9" y2="17" />
      <line x1="12" y1="9" x2="12" y2="17" />
      <line x1="15" y1="10" x2="15" y2="17" />
    </svg>
  );
}

/** Kore (maiden) - Spring flower */
export function KoreSymbol({ className }: VoiceSymbolProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="10" r="2" />
      <path d="M12 8c0-3-2-4-2-4s2-1 2 4" />
      <path d="M14 10c3 0 4-2 4-2s1 2-4 2" />
      <path d="M12 12c0 3 2 4 2 4s-2 1-2-4" />
      <path d="M10 10c-3 0-4-2-4-2s-1 2 4 2" />
      <path d="M14.5 7.5c2-2 4-1.5 4-1.5s0 2-4 1.5" />
      <path d="M9.5 7.5c-2-2-4-1.5-4-1.5s0 2 4 1.5" />
      <line x1="12" y1="14" x2="12" y2="20" />
      <path d="M10 18c0 0 1 2 2 2s2-2 2-2" />
    </svg>
  );
}

/** Leda (queen) - Swan silhouette */
export function LedaSymbol({ className }: VoiceSymbolProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 8c0-2 1-4 4-4 2 0 3 1.5 3 3s-1 3-3 4c-1.5.75-2 2-2 3v4c0 1 1 2 3 2h8" />
      <path d="M18 16c0 2.5-1.5 4-4 4" />
      <path d="M7 18h3" />
      <circle cx="7.5" cy="5.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

/** Zephyr (west wind) - Flowing wind lines */
export function ZephyrSymbol({ className }: VoiceSymbolProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 8h12c2 0 3-1 3-2s-1-2-3-2c-1.5 0-2 1-2 2" />
      <path d="M4 12h14c1.5 0 2.5 1 2.5 2s-1 2-2.5 2c-1 0-1.5-.5-1.5-1.5" />
      <path d="M4 16h8c1.5 0 2.5 1 2.5 2s-1 2-2.5 2c-1 0-1.5-.75-1.5-1.5" />
    </svg>
  );
}

/** Charon (ferryman) - Boat prow */
export function CharonSymbol({ className }: VoiceSymbolProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 16c0 0 2 4 9 4s9-4 9-4" />
      <path d="M3 16c0-2 3-4 9-4s9 2 9 4" />
      <path d="M6 12V8c0-2 2.5-4 6-4" />
      <circle cx="6" cy="7" r="1.5" />
    </svg>
  );
}

/** Fenrir (wolf) - Wolf profile */
export function FenrirSymbol({ className }: VoiceSymbolProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 11c0-3 2-6 6-6l2 3 2-3c4 0 6 3 6 6 0 2-1 4-3 5l1 4h-3l-1-2h-4l-1 2H6l1-4c-2-1-3-3-3-5z" />
      <circle cx="9" cy="10" r="1" fill="currentColor" />
      <circle cx="15" cy="10" r="1" fill="currentColor" />
      <path d="M10 14h4" />
      <path d="M4 7l2 1" />
      <path d="M20 7l-2 1" />
    </svg>
  );
}

/** Puck (trickster) - Spiral */
export function PuckSymbol({ className }: VoiceSymbolProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 21c-5 0-9-4-9-9s4-9 9-9" />
      <path d="M12 17c-2.75 0-5-2.25-5-5s2.25-5 5-5" />
      <path d="M12 13c-.55 0-1-.45-1-1s.45-1 1-1" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <path d="M17 5l2-2m0 0l2 2m-2-2v4" />
    </svg>
  );
}

/** Orus (Horus) - Eye symbol */
export function OrusSymbol({ className }: VoiceSymbolProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <path d="M12 15v5" />
      <path d="M9 17l-2 3" />
    </svg>
  );
}

const SYMBOLS: Record<string, React.ComponentType<VoiceSymbolProps>> = {
  Aoede: AoedeSymbol,
  Kore: KoreSymbol,
  Leda: LedaSymbol,
  Zephyr: ZephyrSymbol,
  Charon: CharonSymbol,
  Fenrir: FenrirSymbol,
  Puck: PuckSymbol,
  Orus: OrusSymbol,
};

/** Map voice ID to symbol component */
export function VoiceSymbol({
  voiceId,
  className,
}: {
  voiceId: string;
  className?: string;
}) {
  const Symbol = SYMBOLS[voiceId];
  if (!Symbol) return null;

  return <Symbol className={className} />;
}
