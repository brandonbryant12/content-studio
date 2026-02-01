// features/brands/components/brand-steps/step-review.tsx
// Final review step with brand summary, celebration, and inline editing

import { CheckCircledIcon, RocketIcon } from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';
import { memo, useCallback } from 'react';
import type { RouterOutput } from '@repo/api/client';
import { useOptimisticUpdate } from '../../hooks/use-optimistic-update';
import { calculateWizardProgress } from '../../lib/wizard-steps';
import { BrandIcon } from '../brand-icon';
import { InlineEdit } from '../brand-inputs';

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
 * All text fields are inline-editable for quick fixes.
 */
export const StepReview = memo(function StepReview({
  brand,
  onFinish,
  className,
}: StepReviewProps) {
  const progress = calculateWizardProgress(brand);
  const isComplete = progress.percentage === 100;
  const updateMutation = useOptimisticUpdate();

  const handleUpdateField = useCallback(
    async (field: string, value: string) => {
      await updateMutation.mutateAsync({
        id: brand.id,
        [field]: value || undefined,
      });
    },
    [brand.id, updateMutation],
  );

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
                ? "You've completed all the steps. Click any field to make quick edits."
                : `You've completed ${progress.completedSteps} of ${progress.totalSteps} steps. Click any field to edit.`}
            </p>
          </div>
        </div>

        {/* Brand summary card */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {/* Brand header */}
          <div className="flex items-center gap-4 pb-4 border-b">
            <BrandIcon colors={brand.colors} className="w-16 h-16" />
            <div className="flex-1 min-w-0">
              <InlineEdit
                value={brand.name}
                onSave={(value) => handleUpdateField('name', value)}
                isSaving={updateMutation.isPending}
                placeholder="Enter brand name…"
                className="text-xl font-semibold"
                as="h3"
              />
              {(brand.mission || !isComplete) && (
                <InlineEdit
                  value={brand.mission ?? ''}
                  onSave={(value) => handleUpdateField('mission', value)}
                  isSaving={updateMutation.isPending}
                  placeholder="Add a mission statement…"
                  className="text-sm text-muted-foreground mt-1"
                  multiline
                />
              )}
            </div>
          </div>

          {/* Brand details grid */}
          <div className="grid gap-6 mt-6">
            {/* Description */}
            <section>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Description
              </h4>
              <InlineEdit
                value={brand.description ?? ''}
                onSave={(value) => handleUpdateField('description', value)}
                isSaving={updateMutation.isPending}
                placeholder="Add a brand description…"
                multiline
              />
            </section>

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
                <p className="text-xs text-muted-foreground mt-2">
                  Go to the Values step to edit these.
                </p>
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
                <p className="text-xs text-muted-foreground mt-2">
                  Go to the Colors step to change these.
                </p>
              </section>
            )}

            {/* Voice guide preview */}
            <section>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Voice & Tone
              </h4>
              <InlineEdit
                value={brand.brandGuide ?? ''}
                onSave={(value) => handleUpdateField('brandGuide', value)}
                isSaving={updateMutation.isPending}
                placeholder="Add voice and tone guidelines…"
                multiline
                className="whitespace-pre-wrap"
              />
            </section>

            {/* Personas */}
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
                <p className="text-xs text-muted-foreground mt-2">
                  Go to the Personas step to edit these.
                </p>
              </section>
            )}

            {/* Segments */}
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
                <p className="text-xs text-muted-foreground mt-2">
                  Go to the Segments step to edit these.
                </p>
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

        {/* Help text */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Click any text field above to edit it directly.</p>
        </div>
      </div>
    </div>
  );
});
