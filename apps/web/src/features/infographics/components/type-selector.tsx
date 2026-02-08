const TYPE_OPTIONS = [
  {
    value: 'key_takeaways',
    label: 'Key Takeaways',
    description: 'Highlight main points',
  },
  {
    value: 'timeline',
    label: 'Timeline',
    description: 'Events in sequence',
  },
  {
    value: 'comparison',
    label: 'Comparison',
    description: 'Side-by-side analysis',
  },
  {
    value: 'stats_dashboard',
    label: 'Stats Dashboard',
    description: 'Data visualization',
  },
] as const;

type InfographicType = (typeof TYPE_OPTIONS)[number]['value'];

interface TypeSelectorProps {
  value: string;
  onChange: (type: InfographicType) => void;
  disabled?: boolean;
}

export function TypeSelector({ value, onChange, disabled }: TypeSelectorProps) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium">Type</legend>
      <div
        className="grid grid-cols-2 gap-2"
        role="radiogroup"
        aria-label="Infographic type"
      >
        {TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-colors text-sm ${
              value === option.value
                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                : 'border-border/60 hover:border-border hover:bg-muted/50'
            } disabled:opacity-50 disabled:pointer-events-none`}
          >
            <span className="font-medium text-xs">{option.label}</span>
            <span className="text-[11px] text-muted-foreground mt-0.5">
              {option.description}
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
