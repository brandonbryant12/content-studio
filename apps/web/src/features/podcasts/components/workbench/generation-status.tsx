import { CheckIcon } from '@radix-ui/react-icons';
import { Spinner } from '@repo/ui/components/spinner';
import type { VersionStatus } from '../../lib/status';

interface GenerationStatusProps {
  status: VersionStatus | undefined;
  isSavingSettings: boolean;
  isPendingGeneration: boolean;
}

type Step = 'saving' | 'script' | 'audio' | 'complete';

interface StepConfig {
  label: string;
  activeLabel: string;
}

const STEPS: Record<Step, StepConfig> = {
  saving: { label: 'Save', activeLabel: 'Saving settings...' },
  script: { label: 'Script', activeLabel: 'Writing script...' },
  audio: { label: 'Audio', activeLabel: 'Generating audio...' },
  complete: { label: 'Done', activeLabel: 'Complete!' },
};

function getActiveStep(
  status: VersionStatus | undefined,
  isSavingSettings: boolean,
  isPendingGeneration: boolean,
): Step {
  if (isSavingSettings) return 'saving';
  if (
    isPendingGeneration ||
    status === 'drafting' ||
    status === 'generating_script'
  ) {
    return 'script';
  }
  if (status === 'script_ready' || status === 'generating_audio')
    return 'audio';
  if (status === 'ready') return 'complete';
  return 'script';
}

function getStepState(
  step: Step,
  activeStep: Step,
): 'completed' | 'active' | 'pending' {
  const order: Step[] = ['saving', 'script', 'audio', 'complete'];
  const stepIndex = order.indexOf(step);
  const activeIndex = order.indexOf(activeStep);

  if (stepIndex < activeIndex) return 'completed';
  if (stepIndex === activeIndex) return 'active';
  return 'pending';
}

export function GenerationStatus({
  status,
  isSavingSettings,
  isPendingGeneration,
}: GenerationStatusProps) {
  const activeStep = getActiveStep(
    status,
    isSavingSettings,
    isPendingGeneration,
  );
  const stepConfig = STEPS[activeStep];
  const steps: Step[] = ['saving', 'script', 'audio', 'complete'];

  return (
    <div className="generation-status">
      {/* Active Step Message */}
      <div className="generation-status-header">
        {activeStep !== 'complete' ? (
          <Spinner className="generation-status-spinner" />
        ) : (
          <div className="generation-status-check">
            <CheckIcon className="w-4 h-4" />
          </div>
        )}
        <div className="generation-status-text">
          <p className="generation-status-title">{stepConfig.activeLabel}</p>
          {activeStep !== 'complete' && (
            <p className="generation-status-subtitle">This may take a minute</p>
          )}
        </div>
      </div>

      {/* Step Indicators */}
      <div className="generation-steps">
        {steps.map((step, index) => {
          const state = getStepState(step, activeStep);
          const isLast = index === steps.length - 1;

          return (
            <div key={step} className="generation-step">
              {/* Step Dot */}
              <div className={`generation-step-indicator ${state}`}>
                {state === 'completed' ? (
                  <CheckIcon className="w-2.5 h-2.5" />
                ) : state === 'active' ? (
                  <div className="generation-step-pulse" />
                ) : null}
              </div>

              {/* Step Label */}
              <span className={`generation-step-label ${state}`}>
                {STEPS[step].label}
              </span>

              {/* Connector */}
              {!isLast && (
                <div className={`generation-step-connector ${state}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
