import { ChevronDownIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { useState, type ReactNode } from 'react';

interface CollectionGuidancePanelProps {
  title: string;
  description: string;
  icon: ReactNode;
  panelClassName: string;
  iconClassName: string;
  collapsible?: boolean;
  children: ReactNode;
}

export function CollectionGuidancePanel({
  title,
  description,
  icon,
  panelClassName,
  iconClassName,
  collapsible = false,
  children,
}: CollectionGuidancePanelProps) {
  const [expanded, setExpanded] = useState(!collapsible);
  const isExpanded = !collapsible || expanded;

  return (
    <section className={panelClassName}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={iconClassName}>{icon}</div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        {collapsible ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1.5 self-start"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={isExpanded}
          >
            How it works
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </Button>
        ) : null}
      </div>
      {isExpanded ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
