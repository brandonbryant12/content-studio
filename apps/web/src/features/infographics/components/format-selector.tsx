const FORMAT_OPTIONS = [
  { value: 'portrait', label: 'Portrait', aspect: 'aspect-[9/16]' },
  { value: 'square', label: 'Square', aspect: 'aspect-square' },
  { value: 'landscape', label: 'Landscape', aspect: 'aspect-video' },
  { value: 'og_card', label: 'OG Card', aspect: 'aspect-[1200/630]' },
] as const;

type InfographicFormat = (typeof FORMAT_OPTIONS)[number]['value'];

interface FormatSelectorProps {
  value: string;
  onChange: (format: InfographicFormat) => void;
  disabled?: boolean;
}

export function FormatSelector({
  value,
  onChange,
  disabled,
}: FormatSelectorProps) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium">Format</legend>
      <div className="flex gap-2" role="radiogroup" aria-label="Image format">
        {FORMAT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-colors min-w-[60px] ${
              value === option.value
                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                : 'border-border/60 hover:border-border hover:bg-muted/50'
            } disabled:opacity-50 disabled:pointer-events-none`}
          >
            <div
              className={`w-6 ${option.aspect} rounded-sm border border-current opacity-50`}
              aria-hidden="true"
            />
            <span className="text-[11px] font-medium">{option.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
