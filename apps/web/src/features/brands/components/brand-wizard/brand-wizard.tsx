// features/brands/components/brand-wizard/brand-wizard.tsx
// Main brand wizard component that orchestrates the step-based editing experience

import { memo, useCallback, Suspense } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { RouterOutput } from '@repo/api/client';
import { cn } from '@repo/ui/lib/utils';
import { WizardProvider } from '../../context';
import { WizardContainer } from './wizard-container';
import {
  LazyStepBasics,
  LazyStepMission,
  LazyStepValues,
  LazyStepColors,
  LazyStepVoice,
  LazyStepPersonas,
  LazyStepSegments,
  LazyStepReview,
  StepLoadingFallback,
  ReviewLoadingFallback,
} from '../brand-steps';
import type { UseWizardStateReturn } from '../../hooks/use-wizard-state';

type Brand = RouterOutput['brands']['get'];

interface BrandWizardProps {
  /** Brand data to edit */
  brand: Brand;
  /** Optional className for container */
  className?: string;
}

/**
 * Brand wizard component that replaces BrandBuilder.
 * Provides a step-based editing experience with AI assistance.
 * Wrapped in WizardProvider for centralized state management.
 * Uses lazy loading with Suspense for better initial load performance.
 */
export const BrandWizard = memo(function BrandWizard({
  brand,
  className,
}: BrandWizardProps) {
  const navigate = useNavigate();

  const handleComplete = useCallback(() => {
    // Navigate to brand detail in view mode by removing step param
    navigate({
      to: '/brands/$brandId',
      params: { brandId: brand.id },
      search: { step: undefined },
      replace: true,
    });
  }, [brand.id, navigate]);

  const renderStep = useCallback(
    (stepKey: string, wizardState: UseWizardStateReturn) => {
      // Auto-progress to next step when AI completes an update
      const onStepComplete = wizardState.isLastStep ? undefined : wizardState.nextStep;
      
      switch (stepKey) {
        case 'basics':
          return (
            <Suspense fallback={<StepLoadingFallback />}>
              <LazyStepBasics brand={brand} onStepComplete={onStepComplete} />
            </Suspense>
          );
        case 'mission':
          return (
            <Suspense fallback={<StepLoadingFallback />}>
              <LazyStepMission brand={brand} onStepComplete={onStepComplete} />
            </Suspense>
          );
        case 'values':
          return (
            <Suspense fallback={<StepLoadingFallback />}>
              <LazyStepValues brand={brand} onStepComplete={onStepComplete} />
            </Suspense>
          );
        case 'colors':
          return (
            <Suspense fallback={<StepLoadingFallback />}>
              <LazyStepColors brand={brand} onStepComplete={onStepComplete} />
            </Suspense>
          );
        case 'voice':
          return (
            <Suspense fallback={<StepLoadingFallback />}>
              <LazyStepVoice brand={brand} onStepComplete={onStepComplete} />
            </Suspense>
          );
        case 'personas':
          return (
            <Suspense fallback={<StepLoadingFallback />}>
              <LazyStepPersonas brand={brand} onStepComplete={onStepComplete} />
            </Suspense>
          );
        case 'segments':
          return (
            <Suspense fallback={<StepLoadingFallback />}>
              <LazyStepSegments brand={brand} onStepComplete={onStepComplete} />
            </Suspense>
          );
        case 'review':
          return (
            <Suspense fallback={<ReviewLoadingFallback />}>
              <LazyStepReview brand={brand} onFinish={handleComplete} />
            </Suspense>
          );
        default:
          return null;
      }
    },
    [brand, handleComplete],
  );

  return (
    <WizardProvider brand={brand}>
      <WizardContainer
        brand={brand}
        renderStep={renderStep}
        onComplete={handleComplete}
        className={cn('h-full', className)}
      />
    </WizardProvider>
  );
});
