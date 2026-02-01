// features/brands/components/brand-wizard/brand-wizard.tsx
// Main brand wizard component that orchestrates the step-based editing experience

import { cn } from '@repo/ui/lib/utils';
import { useNavigate } from '@tanstack/react-router';
import { memo, useCallback, Suspense } from 'react';
import type { UseWizardStateReturn } from '../../hooks/use-wizard-state';
import type { RouterOutput } from '@repo/api/client';
import { ErrorBoundary } from '../../../../shared/components/error-boundary';
import { WizardProvider } from '../../context';
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
import { BrandErrorFallback } from './brand-error-fallback';
import { WizardContainer } from './wizard-container';

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
      const onStepComplete = wizardState.isLastStep
        ? undefined
        : wizardState.nextStep;

      switch (stepKey) {
        case 'basics':
          return (
            <ErrorBoundary
              FallbackComponent={(props) => (
                <BrandErrorFallback {...props} brandId={brand.id} />
              )}
              resetKeys={[stepKey, brand.id]}
            >
              <Suspense fallback={<StepLoadingFallback />}>
                <LazyStepBasics brand={brand} onStepComplete={onStepComplete} />
              </Suspense>
            </ErrorBoundary>
          );
        case 'mission':
          return (
            <ErrorBoundary
              FallbackComponent={(props) => (
                <BrandErrorFallback {...props} brandId={brand.id} />
              )}
              resetKeys={[stepKey, brand.id]}
            >
              <Suspense fallback={<StepLoadingFallback />}>
                <LazyStepMission
                  brand={brand}
                  onStepComplete={onStepComplete}
                />
              </Suspense>
            </ErrorBoundary>
          );
        case 'values':
          return (
            <ErrorBoundary
              FallbackComponent={(props) => (
                <BrandErrorFallback {...props} brandId={brand.id} />
              )}
              resetKeys={[stepKey, brand.id]}
            >
              <Suspense fallback={<StepLoadingFallback />}>
                <LazyStepValues brand={brand} onStepComplete={onStepComplete} />
              </Suspense>
            </ErrorBoundary>
          );
        case 'colors':
          return (
            <ErrorBoundary
              FallbackComponent={(props) => (
                <BrandErrorFallback {...props} brandId={brand.id} />
              )}
              resetKeys={[stepKey, brand.id]}
            >
              <Suspense fallback={<StepLoadingFallback />}>
                <LazyStepColors brand={brand} onStepComplete={onStepComplete} />
              </Suspense>
            </ErrorBoundary>
          );
        case 'voice':
          return (
            <ErrorBoundary
              FallbackComponent={(props) => (
                <BrandErrorFallback {...props} brandId={brand.id} />
              )}
              resetKeys={[stepKey, brand.id]}
            >
              <Suspense fallback={<StepLoadingFallback />}>
                <LazyStepVoice brand={brand} onStepComplete={onStepComplete} />
              </Suspense>
            </ErrorBoundary>
          );
        case 'personas':
          return (
            <ErrorBoundary
              FallbackComponent={(props) => (
                <BrandErrorFallback {...props} brandId={brand.id} />
              )}
              resetKeys={[stepKey, brand.id]}
            >
              <Suspense fallback={<StepLoadingFallback />}>
                <LazyStepPersonas
                  brand={brand}
                  onStepComplete={onStepComplete}
                />
              </Suspense>
            </ErrorBoundary>
          );
        case 'segments':
          return (
            <ErrorBoundary
              FallbackComponent={(props) => (
                <BrandErrorFallback {...props} brandId={brand.id} />
              )}
              resetKeys={[stepKey, brand.id]}
            >
              <Suspense fallback={<StepLoadingFallback />}>
                <LazyStepSegments
                  brand={brand}
                  onStepComplete={onStepComplete}
                />
              </Suspense>
            </ErrorBoundary>
          );
        case 'review':
          return (
            <ErrorBoundary
              FallbackComponent={(props) => (
                <BrandErrorFallback {...props} brandId={brand.id} />
              )}
              resetKeys={[stepKey, brand.id]}
            >
              <Suspense fallback={<ReviewLoadingFallback />}>
                <LazyStepReview brand={brand} onFinish={handleComplete} />
              </Suspense>
            </ErrorBoundary>
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
