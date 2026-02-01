// features/brands/components/brand-steps/step-colors.tsx
// Step component for selecting brand colors

import { cn } from '@repo/ui/lib/utils';
import { memo, useState, useCallback, useEffect } from 'react';
import type { RouterOutput } from '@repo/api/client';
import { useOptimisticUpdate } from '../../hooks/use-optimistic-update';
import { ColorPicker } from '../brand-inputs/color-picker';
import {
  AIAssistantPanel,
  type QuickAction,
} from '../brand-wizard/ai-assistant-panel';

type Brand = RouterOutput['brands']['get'];

interface StepColorsProps {
  /** Current brand data */
  brand: Brand;
  /** Callback when AI completes step - auto-progress to next */
  /** Optional className for container */
  className?: string;
}

const DEFAULT_PRIMARY = '#4F46E5';
const DEFAULT_SECONDARY = '#6366F1';
const DEFAULT_ACCENT = '#F59E0B';

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Suggest colors',
    prompt:
      'Based on my brand description and values, suggest a primary, secondary, and accent color palette that would work well. Explain why each color fits.',
  },
  {
    label: 'Professional palette',
    prompt:
      'Suggest a professional and trustworthy color palette for my brand.',
  },
  {
    label: 'Bold & creative',
    prompt:
      'Suggest a bold and creative color palette that will help my brand stand out.',
  },
];

/**
 * Wizard step for selecting brand colors.
 * Features three color pickers and AI assistance for suggestions.
 */
export const StepColors = memo(function StepColors({
  brand,
  className,
}: StepColorsProps) {
  const [primary, setPrimary] = useState(
    brand.colors?.primary ?? DEFAULT_PRIMARY,
  );
  const [secondary, setSecondary] = useState(
    brand.colors?.secondary ?? DEFAULT_SECONDARY,
  );
  const [accent, setAccent] = useState(brand.colors?.accent ?? DEFAULT_ACCENT);
  const updateMutation = useOptimisticUpdate();

  // Sync local state when brand prop changes (e.g., after AI update)
  useEffect(() => {
    if (brand.colors) {
      setPrimary(brand.colors.primary ?? DEFAULT_PRIMARY);
      setSecondary(brand.colors.secondary ?? DEFAULT_SECONDARY);
      setAccent(brand.colors.accent ?? DEFAULT_ACCENT);
    }
  }, [brand.colors]);

  const saveColors = useCallback(
    async (updates: {
      primary?: string;
      secondary?: string;
      accent?: string;
    }) => {
      await updateMutation.mutateAsync({
        id: brand.id,
        colors: {
          primary: updates.primary ?? primary,
          secondary: updates.secondary ?? secondary,
          accent: updates.accent ?? accent,
        },
      });
    },
    [brand.id, primary, secondary, accent, updateMutation],
  );

  const handlePrimaryChange = useCallback(
    (color: string) => {
      setPrimary(color);
      saveColors({ primary: color });
    },
    [saveColors],
  );

  const handleSecondaryChange = useCallback(
    (color: string) => {
      setSecondary(color);
      saveColors({ secondary: color });
    },
    [saveColors],
  );

  const handleAccentChange = useCallback(
    (color: string) => {
      setAccent(color);
      saveColors({ accent: color });
    },
    [saveColors],
  );

  return (
    <div
      className={cn('grid grid-cols-1 lg:grid-cols-2 gap-6 h-full', className)}
    >
      {/* Left side: Color pickers */}
      <div className="flex flex-col space-y-6 p-6 bg-muted/30 rounded-xl">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Brand Colors
          </h3>
          <p className="text-sm text-muted-foreground">
            Choose colors that represent your brand's personality and values.
          </p>
        </div>

        <div className="space-y-6 flex-1">
          {/* Primary color */}
          <ColorPicker
            value={primary}
            onChange={handlePrimaryChange}
            label="Primary Color"
            disabled={updateMutation.isPending}
          />

          {/* Secondary color */}
          <ColorPicker
            value={secondary}
            onChange={handleSecondaryChange}
            label="Secondary Color"
            disabled={updateMutation.isPending}
          />

          {/* Accent color */}
          <ColorPicker
            value={accent}
            onChange={handleAccentChange}
            label="Accent Color"
            disabled={updateMutation.isPending}
          />
        </div>

        {/* Color preview */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-foreground">Preview</span>
          <div className="flex gap-2 rounded-lg border bg-card p-4">
            <div
              className="h-12 w-12 rounded-lg shadow-sm"
              style={{ backgroundColor: primary }}
              title="Primary"
            />
            <div
              className="h-12 w-12 rounded-lg shadow-sm"
              style={{ backgroundColor: secondary }}
              title="Secondary"
            />
            <div
              className="h-12 w-12 rounded-lg shadow-sm"
              style={{ backgroundColor: accent }}
              title="Accent"
            />
            <div className="flex-1 flex flex-col justify-center pl-4">
              <span className="font-semibold" style={{ color: primary }}>
                Primary Text
              </span>
              <span className="text-sm" style={{ color: secondary }}>
                Secondary text
              </span>
            </div>
          </div>
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
          stepKey="colors"
          quickActions={QUICK_ACTIONS}
          className="h-full"
        />
      </div>
    </div>
  );
});
