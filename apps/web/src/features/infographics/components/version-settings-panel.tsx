import type { InfographicVersion } from '../hooks/use-infographic-versions';

interface VersionSettingsPanelProps {
  version: InfographicVersion;
}

export function VersionSettingsPanel({ version }: VersionSettingsPanelProps) {
  const hasPrompt = version.prompt && version.prompt.trim().length > 0;
  const hasStyles = version.styleProperties.length > 0;

  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Version {version.versionNumber} Settings
      </p>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Prompt</p>
        {hasPrompt ? (
          <p className="text-sm text-foreground/80 whitespace-pre-wrap break-words leading-relaxed">
            {version.prompt}
          </p>
        ) : (
          <p className="text-xs italic text-muted-foreground/70">
            No prompt recorded
          </p>
        )}
      </div>

      {hasStyles && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Style Properties
          </p>
          <div className="flex flex-wrap gap-1.5">
            {version.styleProperties.map((prop) => (
              <span
                key={prop.key}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-background/60 px-2 py-1 text-xs text-foreground/70"
              >
                {prop.type === 'color' ? (
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full border border-border/40 shrink-0"
                    style={{ backgroundColor: prop.value }}
                    aria-hidden="true"
                  />
                ) : null}
                <span className="font-medium">{prop.key}:</span>
                <span>{prop.value}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
