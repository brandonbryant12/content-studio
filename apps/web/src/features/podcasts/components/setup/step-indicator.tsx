import { CheckIcon } from '@radix-ui/react-icons';

export interface SetupStepDefinition {
  label: string;
  optional?: boolean;
}

interface StepIndicatorProps {
  currentStep: number;
  steps: readonly SetupStepDefinition[];
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  const totalSteps = steps.length;

  return (
    <div
      className="setup-steps"
      role="group"
      aria-label={`Step ${currentStep} of ${totalSteps}`}
    >
      {steps.map((step, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;

        return (
          <div key={step.label} className="setup-step">
            <div className="flex flex-col items-center gap-2">
              <div
                className={`setup-step-dot ${
                  isCompleted ? 'completed' : isCurrent ? 'current' : 'upcoming'
                }`}
                aria-label={`Step ${stepNum}${isCompleted ? ', completed' : isCurrent ? ', current' : ''}`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isCompleted ? <CheckIcon className="w-4 h-4" /> : stepNum}
              </div>
              <div className="hidden min-w-0 flex-col items-center text-center sm:flex">
                <span className="text-xs font-medium text-foreground">
                  {step.label}
                </span>
                {step.optional && (
                  <span className="text-[10px] uppercase tracking-[0.18em] text-warning">
                    Optional
                  </span>
                )}
              </div>
            </div>
            {stepNum < totalSteps && (
              <div
                className={`setup-step-connector ${
                  isCompleted ? 'completed' : 'upcoming'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
