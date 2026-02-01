// features/brands/components/brand-wizard/wizard-container.tsx
// Main orchestrator for the brand wizard flow

import { cn } from '@repo/ui/lib/utils';
import type { RouterOutput } from '@repo/api/client';
import type { ReactNode } from 'react';
import { useWizardState } from '../../hooks/use-wizard-state';
import { WizardNav } from './wizard-nav';
import { WizardStep } from './wizard-step';

type Brand = RouterOutput['brands']['get'];

export interface WizardContainerProps {
  /** Brand data */
  brand: Brand;
  /** Render function for step content */
  renderStep: (
    stepKey: string,
    wizardState: ReturnType<typeof useWizardState>,
  ) => ReactNode;
  /** Callback when wizard is completed */
  onComplete?: () => void;
  /** Optional className for container */
  className?: string;
}

/**
 * Main wizard container that orchestrates the brand builder flow.
 * Manages navigation state, renders step content, and handles completion.
 */
export function WizardContainer({
  brand,
  renderStep,
  onComplete,
  className,
}: WizardContainerProps) {
  const wizardState = useWizardState({ brand });

  const {
    currentStep,
    currentStepDef,
    totalSteps,
    isFirstStep,
    isLastStep,
    nextStep,
    prevStep,
    isStepComplete,
  } = wizardState;

  const handleNext = () => {
    if (isLastStep && onComplete) {
      onComplete();
    } else {
      nextStep();
    }
  };

  const handleSkip = () => {
    nextStep();
  };

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Navigation bar */}
      <WizardNav wizardState={wizardState} />

      {/* Current step */}
      <div className="flex-1 min-h-0">
        <WizardStep
          step={currentStepDef}
          stepNumber={currentStep + 1}
          totalSteps={totalSteps}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          isComplete={isStepComplete(currentStep)}
          onPrev={prevStep}
          onNext={handleNext}
          onSkip={handleSkip}
        >
          {renderStep(currentStepDef.key, wizardState)}
        </WizardStep>
      </div>
    </div>
  );
}

export type { UseWizardStateReturn } from '../../hooks/use-wizard-state';
