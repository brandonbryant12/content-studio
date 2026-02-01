// features/brands/components/brand-wizard/wizard-step.tsx
// Wrapper component for individual wizard steps

import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';
import { useEffect, type ReactNode } from 'react';
import type { WizardStep as WizardStepDef } from '../../lib/wizard-steps';
import { WizardOnboarding } from './wizard-onboarding';

export interface WizardStepProps {
  /** Step definition */
  step: WizardStepDef;
  /** Current step index (1-based for display) */
  stepNumber: number;
  /** Total steps for display */
  totalSteps: number;
  /** Whether this is the first step */
  isFirstStep: boolean;
  /** Whether this is the last step */
  isLastStep: boolean;
  /** Whether the step is complete */
  isComplete: boolean;
  /** Navigate to previous step */
  onPrev: () => void;
  /** Navigate to next step */
  onNext: () => void;
  /** Skip this step (optional) */
  onSkip?: () => void;
  /** Step content */
  children: ReactNode;
  /** Optional className for container */
  className?: string;
}

/**
 * Wrapper component for individual wizard steps.
 * Provides consistent header, navigation buttons, and content area.
 */
export function WizardStep({
  step,
  stepNumber,
  totalSteps,
  isFirstStep,
  isLastStep,
  isComplete,
  onPrev,
  onNext,
  onSkip,
  children,
  className,
}: WizardStepProps) {
  const Icon = step.icon;

  // Keyboard shortcut: Cmd/Ctrl+Enter to go to next step
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNext]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Step header */}
      <header className="px-6 py-4 border-b border-border bg-card/30">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Step {stepNumber} of {totalSteps}
                </span>
                {isComplete && (
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    Complete
                  </span>
                )}
              </div>
              <h2 className="text-lg font-semibold text-foreground mt-0.5">
                {step.title}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {step.description}
              </p>
            </div>
          </div>

          {/* Skip button for non-required steps */}
          {onSkip && !isComplete && !isLastStep && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="shrink-0"
            >
              Skip for now
            </Button>
          )}
        </div>
      </header>

      {/* Step content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Show onboarding on first step */}
        {isFirstStep && <WizardOnboarding />}
        {children}
      </div>

      {/* Navigation footer */}
      <footer className="px-6 py-4 border-t border-border bg-card/30">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={onPrev}
            disabled={isFirstStep}
            className="gap-2"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Back
          </Button>

          <Button onClick={onNext} className="gap-2" title="Shortcut: ⌘+Enter">
            {isLastStep ? 'Finish' : 'Next'}
            {!isLastStep && <ChevronRightIcon className="w-4 h-4" />}
          </Button>
        </div>
      </footer>
    </div>
  );
}
