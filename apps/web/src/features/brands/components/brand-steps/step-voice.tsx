// features/brands/components/brand-steps/step-voice.tsx
// Step component for defining brand voice and tone

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

interface StepVoiceProps {
  /** Current brand data */
  brand: Brand;
  /** Callback when AI completes step - auto-progress to next */
  /** Optional className for container */
  className?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Create voice guide',
    prompt:
      'Based on my brand description, mission, and values, help me create a comprehensive brand voice and tone guide.',
  },
  {
    label: 'Professional tone',
    prompt:
      'Help me define a professional yet approachable voice for my brand.',
  },
  {
    label: 'Friendly & casual',
    prompt:
      'Help me create a friendly, conversational voice guide for my brand.',
  },
  {
    label: 'Add examples',
    prompt: "Add do's and don'ts examples to my brand voice guide.",
  },
];

/**
 * Wizard step for defining brand voice and tone guide.
 * Features a textarea with AI assistance panel.
 */
export const StepVoice = memo(function StepVoice({
  brand,
  className,
}: StepVoiceProps) {
  const [brandGuide, setBrandGuide] = useState(brand.brandGuide ?? '');
  const updateMutation = useOptimisticUpdate();

  // Sync local state when brand prop changes (e.g., after AI update)
  useEffect(() => {
    setBrandGuide(brand.brandGuide ?? '');
  }, [brand.brandGuide]);

  const handleBrandGuideBlur = useCallback(async () => {
    const trimmedGuide = brandGuide.trim();
    if (trimmedGuide !== (brand.brandGuide ?? '')) {
      await updateMutation.mutateAsync({
        id: brand.id,
        brandGuide: trimmedGuide || undefined,
      });
    }
  }, [brandGuide, brand.id, brand.brandGuide, updateMutation]);

  return (
    <div
      className={cn('grid grid-cols-1 lg:grid-cols-2 gap-6 h-full', className)}
    >
      {/* Left side: Voice guide input */}
      <div className="flex flex-col space-y-6 p-6 bg-muted/30 rounded-xl">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Voice & Tone Guide
          </h3>
          <p className="text-sm text-muted-foreground">
            Define how your brand speaks. This guides all content creation.
          </p>
        </div>

        <div className="space-y-4 flex-1 flex flex-col">
          <div className="space-y-2 flex-1 flex flex-col">
            <Label htmlFor="brand-guide">Brand Voice Guide</Label>
            <Textarea
              id="brand-guide"
              value={brandGuide}
              onChange={(e) => setBrandGuide(e.target.value)}
              onBlur={handleBrandGuideBlur}
              placeholder="Describe your brand's voice and tone. Include personality traits, writing style, vocabulary preferences, and what to avoid…"
              disabled={updateMutation.isPending}
              rows={12}
              className="flex-1 min-h-[240px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This guide will be used by AI to maintain consistent brand voice.
            </p>
          </div>
        </div>

        {/* Voice tips */}
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Include in your guide:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Personality traits (e.g., friendly, authoritative)</li>
            <li>Vocabulary preferences</li>
            <li>Writing style (formal, casual, technical)</li>
            <li>What to avoid (jargon, phrases, topics)</li>
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
          stepKey="voice"
          quickActions={QUICK_ACTIONS}
          className="h-full"
        />
      </div>
    </div>
  );
});
