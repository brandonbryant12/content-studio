// features/brands/components/brand-wizard/brand-wizard.tsx
// Main brand wizard component that orchestrates the step-based editing experience

import { memo, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { RouterOutput } from '@repo/api/client';
import { cn } from '@repo/ui/lib/utils';
import { WizardContainer } from './wizard-container';
import {
  StepBasics,
  StepMission,
  StepValues,
  StepColors,
  StepVoice,
  StepPersonas,
  StepSegments,
  StepReview,
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
      search: {},
      replace: true,
    });
  }, [brand.id, navigate]);

  const renderStep = useCallback(
    (stepKey: string, _wizardState: UseWizardStateReturn) => {
      switch (stepKey) {
        case 'basics':
          return <StepBasics brand={brand} />;
        case 'mission':
          return <StepMission brand={brand} />;
        case 'values':
          return <StepValues brand={brand} />;
        case 'colors':
          return <StepColors brand={brand} />;
        case 'voice':
          return <StepVoice brand={brand} />;
        case 'personas':
          return <StepPersonas brand={brand} />;
        case 'segments':
          return <StepSegments brand={brand} />;
        case 'review':
          return <StepReview brand={brand} onFinish={handleComplete} />;
        default:
          return null;
      }
    },
    [brand, handleComplete],
  );

  return (
    <WizardContainer
      brand={brand}
      renderStep={renderStep}
      onComplete={handleComplete}
      className={cn('h-full', className)}
    />
  );
});
