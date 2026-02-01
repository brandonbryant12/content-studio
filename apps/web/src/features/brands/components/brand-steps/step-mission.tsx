// features/brands/components/brand-steps/step-mission.tsx
// Step component for defining brand mission statement

import { memo, useState, useCallback, useEffect } from 'react';
import type { RouterOutput } from '@repo/api/client';
import { cn } from '@repo/ui/lib/utils';
import { Textarea } from '@repo/ui/components/textarea';
import { Label } from '@repo/ui/components/label';
import {
  AIAssistantPanel,
  type QuickAction,
} from '../brand-wizard/ai-assistant-panel';
import { useOptimisticUpdate } from '../../hooks/use-optimistic-update';

type Brand = RouterOutput['brands']['get'];

interface StepMissionProps {
  /** Current brand data */
  brand: Brand;
  /** Optional className for container */
  className?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Draft mission',
    prompt:
      'Help me write a compelling mission statement for my brand based on what you know about it.',
  },
  {
    label: 'Make it inspiring',
    prompt: 'Help me make my mission statement more inspiring and memorable.',
  },
  {
    label: 'Focus on impact',
    prompt:
      'Help me rewrite my mission to focus more on the impact we want to make.',
  },
];

/**
 * Wizard step for defining the brand's mission statement.
 * Features a textarea with AI assistance panel.
 */
export const StepMission = memo(function StepMission({
  brand,
  className,
}: StepMissionProps) {
  const [mission, setMission] = useState(brand.mission ?? '');
  const updateMutation = useOptimisticUpdate();

  // Sync local state when brand prop changes (e.g., after AI update)
  useEffect(() => {
    setMission(brand.mission ?? '');
  }, [brand.mission]);

  const handleMissionBlur = useCallback(async () => {
    const trimmedMission = mission.trim();
    if (trimmedMission !== (brand.mission ?? '')) {
      await updateMutation.mutateAsync({
        id: brand.id,
        mission: trimmedMission || undefined,
      });
    }
  }, [mission, brand.id, brand.mission, updateMutation]);

  return (
    <div
      className={cn('grid grid-cols-1 lg:grid-cols-2 gap-6 h-full', className)}
    >
      {/* Left side: Mission input */}
      <div className="flex flex-col space-y-6 p-6 bg-muted/30 rounded-xl">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Mission Statement
          </h3>
          <p className="text-sm text-muted-foreground">
            Define your brand's purpose. What do you exist to do, and why does
            it matter?
          </p>
        </div>

        <div className="space-y-4 flex-1 flex flex-col">
          <div className="space-y-2 flex-1 flex flex-col">
            <Label htmlFor="brand-mission">Your Mission</Label>
            <Textarea
              id="brand-mission"
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              onBlur={handleMissionBlur}
              placeholder="We exist to…"
              disabled={updateMutation.isPending}
              rows={6}
              className="flex-1 min-h-[160px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              A great mission statement is clear, concise, and answers "why we
              exist."
            </p>
          </div>
        </div>

        {/* Mission tips */}
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">
              Tips for a strong mission:
            </strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Keep it short (1-2 sentences)</li>
            <li>Focus on your purpose, not just what you do</li>
            <li>Make it inspiring and memorable</li>
            <li>Avoid jargon and buzzwords</li>
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
          stepKey="mission"
          quickActions={QUICK_ACTIONS}
          className="h-full"
        />
      </div>
    </div>
  );
});
