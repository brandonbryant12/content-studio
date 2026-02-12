import { CheckIcon } from '@radix-ui/react-icons';
import { Spinner } from '@repo/ui/components/spinner';
import { VersionStatus, type VersionStatusType } from '../../lib/status';

interface GenerationStatusProps {
  status: VersionStatusType | undefined;
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
  status: VersionStatusType | undefined,
  isSavingSettings: boolean,
  isPendingGeneration: boolean,
): Step {
  if (isSavingSettings) return 'saving';
  if (isPendingGeneration || status === VersionStatus.GENERATING_SCRIPT) {
    return 'script';
  }
  if (
    status === VersionStatus.SCRIPT_READY ||
    status === VersionStatus.GENERATING_AUDIO
  ) {
    return 'audio';
  }
  if (status === VersionStatus.READY) return 'complete';
  return 'script';
}

const STEP_ORDER: Step[] = ['saving', 'script', 'audio', 'complete'];

function getStepState(
  step: Step,
  activeStep: Step,
): 'completed' | 'active' | 'pending' {
  const stepIndex = STEP_ORDER.indexOf(step);
  const activeIndex = STEP_ORDER.indexOf(activeStep);

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

  return (
    <div className="generation-status" role="status" aria-live="polite">
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
        {STEP_ORDER.map((step, index) => {
          const state = getStepState(step, activeStep);
          const isLast = index === STEP_ORDER.length - 1;

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
