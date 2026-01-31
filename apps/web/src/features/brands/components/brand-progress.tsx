// features/brands/components/brand-progress.tsx
// Progress indicator for brand completion status

import { CheckCircledIcon, CircleIcon } from '@radix-ui/react-icons';
import { Progress } from '@repo/ui/components/progress';
import { cn } from '@repo/ui/lib/utils';
import type { BrandProgress } from '../hooks/use-brand-progress';

interface BrandProgressProps {
  progress: BrandProgress;
  className?: string;
}

/**
 * Visual progress indicator showing brand completion status.
 * Displays a progress bar and checklist of sections.
 */
export function BrandProgressIndicator({
  progress,
  className,
}: BrandProgressProps) {
  return (
    <div className={cn('p-4 border-b border-border bg-muted/30', className)}>
      {/* Progress bar with percentage */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Brand Profile</span>
        <span className="text-sm text-muted-foreground">
          {progress.percentage}% complete
        </span>
      </div>
      <Progress value={progress.percentage} className="h-2 mb-3" />

      {/* Checklist grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {progress.items.map((item) => (
          <div key={item.key} className="flex items-center gap-2 text-sm">
            {item.completed ? (
              <CheckCircledIcon className="w-4 h-4 text-green-600 shrink-0" />
            ) : (
              <CircleIcon className="w-4 h-4 text-muted-foreground/50 shrink-0" />
            )}
            <span
              className={cn(
                item.completed ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CompactProgressProps {
  progress: BrandProgress;
  className?: string;
}

/**
 * Compact progress bar for inline display.
 */
export function CompactProgress({ progress, className }: CompactProgressProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Progress value={progress.percentage} className="h-2 flex-1" />
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {progress.completedCount}/{progress.totalCount}
      </span>
    </div>
  );
}
