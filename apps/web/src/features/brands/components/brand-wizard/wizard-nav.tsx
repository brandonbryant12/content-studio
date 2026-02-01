// features/brands/components/brand-wizard/wizard-nav.tsx
// Horizontal step navigation for brand wizard

import { CheckIcon } from '@radix-ui/react-icons';
import { Progress } from '@repo/ui/components/progress';
import { cn } from '@repo/ui/lib/utils';
import type { UseWizardStateReturn } from '../../hooks/use-wizard-state';

export interface WizardNavProps {
  /** Wizard state from useWizardState hook */
  wizardState: UseWizardStateReturn;
  /** Optional className for container */
  className?: string;
}

/**
 * Horizontal step navigation for the brand wizard.
 * Shows step numbers, titles, completion status, and overall progress.
 */
export function WizardNav({ wizardState, className }: WizardNavProps) {
  const { currentStep, steps, progress, goToStep } = wizardState;

  return (
    <nav
      className={cn('border-b border-border bg-card/50', className)}
      aria-label="Brand wizard navigation"
    >
      {/* Progress bar */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Brand Builder
          </span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {progress.percentage}% complete
          </span>
        </div>
        <Progress value={progress.percentage} className="h-1.5" />
      </div>

      {/* Step indicators */}
      <div className="px-6 py-3 overflow-x-auto">
        <ol className="flex items-center gap-1 min-w-max">
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isComplete = step.isComplete;
            const Icon = step.icon;

            return (
              <li key={step.key} className="flex items-center">
                <button
                  type="button"
                  onClick={() => goToStep(index)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isActive && 'bg-primary/10 text-primary',
                    !isActive &&
                      isComplete &&
                      'text-muted-foreground hover:bg-muted',
                    !isActive &&
                      !isComplete &&
                      'text-muted-foreground/60 hover:bg-muted/50',
                  )}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`Step ${index + 1}: ${step.title}${isComplete ? ' (completed)' : ''}`}
                >
                  {/* Step number/check circle */}
                  <span
                    className={cn(
                      'flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0',
                      isActive && 'bg-primary text-primary-foreground',
                      !isActive && isComplete && 'bg-green-600 text-white',
                      !isActive &&
                        !isComplete &&
                        'bg-muted text-muted-foreground',
                    )}
                  >
                    {isComplete && !isActive ? (
                      <CheckIcon className="w-3.5 h-3.5" />
                    ) : (
                      index + 1
                    )}
                  </span>

                  {/* Step title - visible on larger screens */}
                  <span className="hidden sm:inline text-sm font-medium">
                    {step.title}
                  </span>

                  {/* Step icon - visible on mobile only */}
                  <Icon className="w-4 h-4 sm:hidden" />
                </button>

                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'w-4 h-px mx-1',
                      isComplete ? 'bg-green-600' : 'bg-border',
                    )}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
