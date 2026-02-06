import { CheckIcon } from '@radix-ui/react-icons';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div
      className="setup-steps"
      role="group"
      aria-label={`Step ${currentStep} of ${totalSteps}`}
    >
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;

        return (
          <div key={stepNum} className="setup-step">
            <div
              className={`setup-step-dot ${
                isCompleted ? 'completed' : isCurrent ? 'current' : 'upcoming'
              }`}
              aria-label={`Step ${stepNum}${isCompleted ? ', completed' : isCurrent ? ', current' : ''}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {isCompleted ? <CheckIcon className="w-4 h-4" /> : stepNum}
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
