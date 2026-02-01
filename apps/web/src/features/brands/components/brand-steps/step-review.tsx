// features/brands/components/brand-steps/step-review.tsx
// Final review step with brand summary and celebration

import { memo } from 'react';
import { CheckCircledIcon, RocketIcon } from '@radix-ui/react-icons';
import type { RouterOutput } from '@repo/api/client';
import { cn } from '@repo/ui/lib/utils';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { BrandIcon } from '../brand-icon';
import { calculateWizardProgress } from '../../lib/wizard-steps';

type Brand = RouterOutput['brands']['get'];

interface StepReviewProps {
  /** Current brand data */
  brand: Brand;
  /** Callback when user finishes the wizard */
  onFinish?: () => void;
  /** Optional className for container */
  className?: string;
}

/**
 * Final review step showing brand summary and completion status.
 */
export const StepReview = memo(function StepReview({
  brand,
  onFinish,
  className,
}: StepReviewProps) {
  const progress = calculateWizardProgress(brand);
  const isComplete = progress.percentage === 100;

  return (
    <div className={cn('h-full overflow-y-auto', className)}>
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        {/* Header with celebration */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
            {isComplete ? (
              <RocketIcon className="w-10 h-10 text-primary" />
            ) : (
              <CheckCircledIcon className="w-10 h-10 text-primary" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {isComplete ? 'Your Brand is Ready!' : 'Almost There!'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {isComplete
                ? "You've completed all the steps. Your brand profile is ready to use."
                : `You've completed ${progress.completedSteps} of ${progress.totalSteps} steps.`}
            </p>
          </div>
        </div>

        {/* Brand summary card */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {/* Brand header */}
          <div className="flex items-center gap-4 pb-4 border-b">
            <BrandIcon colors={brand.colors} className="w-16 h-16" />
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-semibold truncate">{brand.name}</h3>
              {brand.mission && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {brand.mission}
                </p>
              )}
            </div>
          </div>

          {/* Brand details grid */}
          <div className="grid gap-6 mt-6">
            {/* Description */}
            {brand.description && (
              <section>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Description
                </h4>
                <p className="text-foreground">{brand.description}</p>
              </section>
            )}

            {/* Values */}
            {brand.values.length > 0 && (
              <section>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Core Values
                </h4>
                <div className="flex flex-wrap gap-2">
                  {brand.values.map((value, idx) => (
                    <Badge key={idx} variant="default">
                      {value}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Colors */}
            {brand.colors && (
              <section>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Brand Colors
                </h4>
                <div className="flex gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-md border"
                      style={{ backgroundColor: brand.colors.primary }}
                    />
                    <span className="text-sm">Primary</span>
                  </div>
                  {brand.colors.secondary && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-md border"
                        style={{ backgroundColor: brand.colors.secondary }}
                      />
                      <span className="text-sm">Secondary</span>
                    </div>
                  )}
                  {brand.colors.accent && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-md border"
                        style={{ backgroundColor: brand.colors.accent }}
                      />
                      <span className="text-sm">Accent</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Voice guide preview */}
            {brand.brandGuide && (
              <section>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Voice & Tone
                </h4>
                <p className="text-foreground line-clamp-3 whitespace-pre-wrap">
                  {brand.brandGuide}
                </p>
              </section>
            )}

            {/* Personas count */}
            {brand.personas.length > 0 && (
              <section>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Personas
                </h4>
                <div className="flex flex-wrap gap-2">
                  {brand.personas.map((persona) => (
                    <Badge key={persona.id} variant="info">
                      {persona.name} - {persona.role}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Segments count */}
            {brand.segments.length > 0 && (
              <section>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Audience Segments
                </h4>
                <div className="flex flex-wrap gap-2">
                  {brand.segments.map((segment) => (
                    <Badge key={segment.id} variant="info">
                      {segment.name}
                    </Badge>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Finish button */}
        <div className="flex justify-center">
          <Button size="lg" onClick={onFinish} className="min-w-[200px]">
            <CheckCircledIcon className="w-5 h-5 mr-2" />
            Finish
          </Button>
        </div>

        {/* Next steps hint */}
        <div className="text-center text-sm text-muted-foreground">
          <p>You can always come back and edit your brand profile later.</p>
        </div>
      </div>
    </div>
  );
});
