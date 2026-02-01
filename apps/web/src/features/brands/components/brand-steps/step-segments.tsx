// features/brands/components/brand-steps/step-segments.tsx
// Step component for managing audience segments

import { memo, useCallback } from 'react';
import { PlusIcon } from '@radix-ui/react-icons';
import type { RouterOutput } from '@repo/api/client';
import type { BrandSegment } from '@repo/db/schema';
import { cn } from '@repo/ui/lib/utils';
import { Button } from '@repo/ui/components/button';
import { SegmentCard } from '../brand-inputs/segment-card';
import {
  AIAssistantPanel,
  type QuickAction,
} from '../brand-wizard/ai-assistant-panel';
import { useOptimisticUpdate } from '../../hooks/use-optimistic-update';

type Brand = RouterOutput['brands']['get'];

interface StepSegmentsProps {
  /** Current brand data */
  brand: Brand;
  /** Optional className for container */
  className?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Suggest segments',
    prompt:
      'Based on my brand description and target market, suggest 2-3 audience segments with messaging guidance for each.',
  },
  {
    label: 'B2B segments',
    prompt:
      'Help me define business/professional audience segments for my brand.',
  },
  {
    label: 'Consumer segments',
    prompt:
      'Help me define consumer audience segments based on demographics and interests.',
  },
];

/**
 * Generate a unique ID for a new segment.
 */
function generateSegmentId(): string {
  return `segment_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create a new empty segment.
 */
function createEmptySegment(): BrandSegment {
  return {
    id: generateSegmentId(),
    name: '',
    description: '',
    messagingTone: '',
    keyBenefits: [],
  };
}

/**
 * Wizard step for managing audience segments.
 * Features a list of SegmentCards with add functionality.
 */
export const StepSegments = memo(function StepSegments({
  brand,
  className,
}: StepSegmentsProps) {
  const updateMutation = useOptimisticUpdate();
  // Deep clone to convert readonly to mutable (including nested arrays)
  const segments: BrandSegment[] = (brand.segments ?? []).map((s) => ({
    ...s,
    keyBenefits: [...s.keyBenefits],
  }));

  const handleAddSegment = useCallback(async () => {
    const newSegment = createEmptySegment();
    await updateMutation.mutateAsync({
      id: brand.id,
      segments: [...segments, newSegment],
    });
  }, [brand.id, segments, updateMutation]);

  const handleUpdateSegment = useCallback(
    async (updatedSegment: BrandSegment) => {
      const updatedSegments = segments.map((s) =>
        s.id === updatedSegment.id ? updatedSegment : s,
      );
      await updateMutation.mutateAsync({
        id: brand.id,
        segments: updatedSegments,
      });
    },
    [brand.id, segments, updateMutation],
  );

  const handleDeleteSegment = useCallback(
    async (segmentId: string) => {
      const updatedSegments = segments.filter((s) => s.id !== segmentId);
      await updateMutation.mutateAsync({
        id: brand.id,
        segments: updatedSegments,
      });
    },
    [brand.id, segments, updateMutation],
  );

  return (
    <div
      className={cn('grid grid-cols-1 lg:grid-cols-2 gap-6 h-full', className)}
    >
      {/* Left side: Segments list */}
      <div className="flex flex-col space-y-6 p-6 bg-muted/30 rounded-xl overflow-hidden">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Audience Segments
          </h3>
          <p className="text-sm text-muted-foreground">
            Define your target audiences and how to communicate with each.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {segments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-2">No segments yet.</p>
              <p className="text-sm">
                Add a segment or ask the AI to suggest some.
              </p>
            </div>
          ) : (
            segments.map((segment) => (
              <SegmentCard
                key={segment.id}
                segment={segment}
                onUpdate={handleUpdateSegment}
                onDelete={handleDeleteSegment}
                disabled={updateMutation.isPending}
              />
            ))
          )}
        </div>

        {/* Add button */}
        <div className="shrink-0">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleAddSegment}
            disabled={updateMutation.isPending}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Segment
          </Button>
        </div>

        {/* Segment tips */}
        <div className="space-y-2 text-sm text-muted-foreground shrink-0">
          <p>
            <strong className="text-foreground">
              For each segment, define:
            </strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Who they are (demographics, role)</li>
            <li>What messaging tone resonates</li>
            <li>Key benefits that matter to them</li>
          </ul>
        </div>

        {updateMutation.isPending && (
          <p className="text-xs text-muted-foreground animate-pulse shrink-0">
            Saving...
          </p>
        )}
      </div>

      {/* Right side: AI assistant */}
      <div className="h-full min-h-[400px] lg:min-h-0">
        <AIAssistantPanel
          brandId={brand.id}
          stepKey="segments"
          quickActions={QUICK_ACTIONS}
          className="h-full"
        />
      </div>
    </div>
  );
});
