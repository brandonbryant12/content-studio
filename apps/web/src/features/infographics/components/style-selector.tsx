const STYLE_OPTIONS = [
  { value: 'modern_minimal', label: 'Modern Minimal', color: 'bg-slate-400' },
  { value: 'bold_colorful', label: 'Bold & Colorful', color: 'bg-rose-400' },
  { value: 'corporate', label: 'Corporate', color: 'bg-blue-400' },
  { value: 'playful', label: 'Playful', color: 'bg-amber-400' },
  { value: 'dark_mode', label: 'Dark Mode', color: 'bg-zinc-700' },
  { value: 'editorial', label: 'Editorial', color: 'bg-emerald-400' },
] as const;

type InfographicStyle = (typeof STYLE_OPTIONS)[number]['value'];

interface StyleSelectorProps {
  value: string;
  onChange: (style: InfographicStyle) => void;
  disabled?: boolean;
}

export function StyleSelector({
  value,
  onChange,
  disabled,
}: StyleSelectorProps) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium">Style</legend>
      <div
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-label="Style preset"
      >
        {STYLE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              value === option.value
                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                : 'border-border/60 hover:border-border hover:bg-muted/50'
            } disabled:opacity-50 disabled:pointer-events-none`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${option.color}`}
              aria-hidden="true"
            />
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
