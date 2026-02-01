// features/brands/components/brand-steps/step-values.tsx
// Step component for defining brand core values

import { cn } from '@repo/ui/lib/utils';
import { memo, useState, useCallback, useEffect } from 'react';
import type { RouterOutput } from '@repo/api/client';
import { useOptimisticUpdate } from '../../hooks/use-optimistic-update';
import { ValueChips } from '../brand-inputs/value-chips';
import {
  AIAssistantPanel,
  type QuickAction,
} from '../brand-wizard/ai-assistant-panel';

type Brand = RouterOutput['brands']['get'];

interface StepValuesProps {
  /** Current brand data */
  brand: Brand;
  /** Callback when AI completes step - auto-progress to next */
  onStepComplete?: () => void;
  /** Optional className for container */
  className?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Suggest values',
    prompt:
      'Based on my brand description, suggest 5 core values that would resonate with my audience and guide my brand decisions.',
  },
  {
    label: 'Industry values',
    prompt:
      'What are common core values for brands in my industry? Suggest options that would differentiate us.',
  },
  {
    label: 'Customer-focused',
    prompt:
      'Suggest values that demonstrate a strong customer-centric approach for my brand.',
  },
];

// Default suggestions to show when AI hasn't provided any
const DEFAULT_SUGGESTIONS = [
  'Innovation',
  'Quality',
  'Integrity',
  'Customer Focus',
  'Sustainability',
  'Creativity',
  'Transparency',
  'Excellence',
];

/**
 * Wizard step for defining brand core values.
 * Features a chip input with AI suggestions and assistance panel.
 */
export const StepValues = memo(function StepValues({
  brand,
  onStepComplete,
  className,
}: StepValuesProps) {
  const [values, setValues] = useState<string[]>([...(brand.values ?? [])]);
  const [suggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const updateMutation = useOptimisticUpdate();

  // Sync local state when brand prop changes (e.g., after AI update)
  useEffect(() => {
    setValues([...(brand.values ?? [])]);
  }, [brand.values]);

  const handleValuesChange = useCallback(
    async (newValues: string[]) => {
      setValues(newValues);
      await updateMutation.mutateAsync({
        id: brand.id,
        values: newValues,
      });
    },
    [brand.id, updateMutation],
  );

  return (
    <div
      className={cn('grid grid-cols-1 lg:grid-cols-2 gap-6 h-full', className)}
    >
      {/* Left side: Values input */}
      <div className="flex flex-col space-y-6 p-6 bg-muted/30 rounded-xl">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Core Values
          </h3>
          <p className="text-sm text-muted-foreground">
            Define the principles that guide your brand. Add 3-5 values that
            resonate with your mission.
          </p>
        </div>

        <div className="flex-1">
          <ValueChips
            values={values}
            onChange={handleValuesChange}
            suggestions={suggestions}
            maxValues={5}
            placeholder="Add a core value…"
            label="Your Brand Values"
            disabled={updateMutation.isPending}
          />
        </div>

        {/* Values explanation */}
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Good values are:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Specific enough to guide decisions</li>
            <li>Authentic to your brand's identity</li>
            <li>Memorable and easy to communicate</li>
            <li>Actionable in daily operations</li>
          </ul>
        </div>

        {updateMutation.isPending && (
          <p className="text-xs text-muted-foreground animate-pulse">
            Saving...
          </p>
        )}
      </div>

      {/* Right side: AI assistant */}
      <div className="h-full min-h-[400px] lg:min-h-0">
        <AIAssistantPanel
          brandId={brand.id}
          stepKey="values"
          quickActions={QUICK_ACTIONS}
          onStepComplete={onStepComplete}
          className="h-full"
        />
      </div>
    </div>
  );
});
