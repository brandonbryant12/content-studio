// features/brands/hooks/use-wizard-state.ts
// Hook to manage wizard navigation state with URL persistence

import { useCallback, useMemo } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import type { RouterOutput } from '@repo/api/client';
import {
  WIZARD_STEPS,
  getStepByIndex,
  calculateWizardProgress,
} from '../lib/wizard-steps';

type Brand = RouterOutput['brands']['get'];

export interface UseWizardStateOptions {
  /** Brand data used to derive step completion */
  brand: Brand;
}

export interface UseWizardStateReturn {
  /** Current step index (0-based) */
  currentStep: number;
  /** Current step definition */
  currentStepDef: (typeof WIZARD_STEPS)[number];
  /** Total number of steps */
  totalSteps: number;
  /** Whether we're on the first step */
  isFirstStep: boolean;
  /** Whether we're on the last step */
  isLastStep: boolean;
  /** Navigate to a specific step by index */
  goToStep: (index: number) => void;
  /** Navigate to next step */
  nextStep: () => void;
  /** Navigate to previous step */
  prevStep: () => void;
  /** Navigate to step by key */
  goToStepByKey: (key: string) => void;
  /** Get completion status for a step */
  isStepComplete: (index: number) => boolean;
  /** Progress stats */
  progress: {
    completedSteps: number;
    totalSteps: number;
    percentage: number;
  };
  /** All steps with computed completion status */
  steps: Array<{
    key: string;
    title: string;
    description: string;
    icon: (typeof WIZARD_STEPS)[number]['icon'];
    isComplete: boolean;
    inputType: (typeof WIZARD_STEPS)[number]['inputType'];
  }>;
}

/**
 * Manage wizard navigation state.
 * Persists current step in URL search params for deep linking.
 */
export function useWizardState({
  brand,
}: UseWizardStateOptions): UseWizardStateReturn {
  // Get step from URL search params
  const search = useSearch({ strict: false }) as { step?: string };
  const navigate = useNavigate();

  // Parse current step from URL or default to 0
  const currentStep = useMemo(() => {
    if (!search.step) return 0;
    const parsed = parseInt(search.step, 10);
    if (isNaN(parsed) || parsed < 0 || parsed >= WIZARD_STEPS.length) {
      return 0;
    }
    return parsed;
  }, [search.step]);

  const currentStepDef = WIZARD_STEPS[currentStep];
  const totalSteps = WIZARD_STEPS.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  // Navigation functions
  const goToStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= WIZARD_STEPS.length) return;
      navigate({
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          step: index.toString(),
        }),
        replace: true,
      });
    },
    [navigate],
  );

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      goToStep(currentStep + 1);
    }
  }, [currentStep, totalSteps, goToStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, goToStep]);

  const goToStepByKey = useCallback(
    (key: string) => {
      const index = WIZARD_STEPS.findIndex((step) => step.key === key);
      if (index !== -1) {
        goToStep(index);
      }
    },
    [goToStep],
  );

  // Step completion check
  const isStepComplete = useCallback(
    (index: number) => {
      const step = getStepByIndex(index);
      return step ? step.isComplete(brand) : false;
    },
    [brand],
  );

  // Progress calculation
  const progress = useMemo(() => calculateWizardProgress(brand), [brand]);

  // Steps with completion status
  const steps = useMemo(
    () =>
      WIZARD_STEPS.map((step) => ({
        key: step.key,
        title: step.title,
        description: step.description,
        icon: step.icon,
        isComplete: step.isComplete(brand),
        inputType: step.inputType,
      })),
    [brand],
  );

  return {
    currentStep,
    currentStepDef,
    totalSteps,
    isFirstStep,
    isLastStep,
    goToStep,
    nextStep,
    prevStep,
    goToStepByKey,
    isStepComplete,
    progress,
    steps,
  };
}
