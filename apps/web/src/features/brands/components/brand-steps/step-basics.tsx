// features/brands/components/brand-steps/step-basics.tsx
// Step component for entering brand name and description

import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import { Textarea } from '@repo/ui/components/textarea';
import { cn } from '@repo/ui/lib/utils';
import { memo, useState, useCallback, useEffect } from 'react';
import type { RouterOutput } from '@repo/api/client';
import { useOptimisticUpdate } from '../../hooks/use-optimistic-update';
import {
  AIAssistantPanel,
  type QuickAction,
} from '../brand-wizard/ai-assistant-panel';

type Brand = RouterOutput['brands']['get'];

interface StepBasicsProps {
  /** Current brand data */
  brand: Brand;
  /** Callback when AI completes step - auto-progress to next */
  /** Optional className for container */
  className?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Suggest a name',
    prompt:
      'Based on what you know about my brand so far, suggest a memorable brand name.',
  },
  {
    label: 'Improve description',
    prompt:
      'Help me write a compelling brand description that captures our essence.',
  },
  {
    label: 'Make it concise',
    prompt: 'Help me make my brand description more concise and impactful.',
  },
];

/**
 * Wizard step for entering basic brand info: name and description.
 * Features auto-save on blur and AI assistance panel.
 */
export const StepBasics = memo(function StepBasics({
  brand,
  className,
}: StepBasicsProps) {
  const [name, setName] = useState(brand.name);
  const [description, setDescription] = useState(brand.description ?? '');
  const updateMutation = useOptimisticUpdate();

  // Sync local state when brand prop changes (e.g., after AI update)
  useEffect(() => {
    setName(brand.name);
    setDescription(brand.description ?? '');
  }, [brand.name, brand.description]);

  const handleNameBlur = useCallback(async () => {
    const trimmedName = name.trim();
    if (trimmedName && trimmedName !== brand.name) {
      await updateMutation.mutateAsync({
        id: brand.id,
        name: trimmedName,
      });
    }
  }, [name, brand.id, brand.name, updateMutation]);

  const handleDescriptionBlur = useCallback(async () => {
    const trimmedDescription = description.trim();
    if (trimmedDescription !== (brand.description ?? '')) {
      await updateMutation.mutateAsync({
        id: brand.id,
        description: trimmedDescription || undefined,
      });
    }
  }, [description, brand.id, brand.description, updateMutation]);

  return (
    <div
      className={cn('grid grid-cols-1 lg:grid-cols-2 gap-6 h-full', className)}
    >
      {/* Left side: Direct input */}
      <div className="flex flex-col space-y-6 p-6 bg-muted/30 rounded-xl">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Brand Basics
          </h3>
          <p className="text-sm text-muted-foreground">
            Enter your brand's name and a description that captures what makes
            it unique.
          </p>
        </div>

        <div className="space-y-4 flex-1">
          {/* Name input */}
          <div className="space-y-2">
            <Label htmlFor="brand-name">Brand Name</Label>
            <Input
              id="brand-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameBlur}
              placeholder="Enter your brand name…"
              autoComplete="organization"
              disabled={updateMutation.isPending}
              className="text-lg font-medium"
            />
          </div>

          {/* Description textarea */}
          <div className="space-y-2 flex-1 flex flex-col">
            <Label htmlFor="brand-description">Description</Label>
            <Textarea
              id="brand-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              placeholder="Describe what your brand does, who it serves, and what makes it special…"
              autoComplete="off"
              disabled={updateMutation.isPending}
              rows={6}
              className="flex-1 min-h-[120px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              A good description helps the AI understand your brand better.
            </p>
          </div>
        </div>

        {updateMutation.isPending ? (
          <p className="text-xs text-muted-foreground animate-pulse">Saving…</p>
        ) : updateMutation.isSuccess ? (
          <p className="text-xs text-green-600">✓ Saved</p>
        ) : null}
      </div>

      {/* Right side: AI assistant */}
      <div className="h-full min-h-[400px] lg:min-h-0">
        <AIAssistantPanel
          brandId={brand.id}
          stepKey="basics"
          quickActions={QUICK_ACTIONS}
          className="h-full"
        />
      </div>
    </div>
  );
});
