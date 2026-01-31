// features/brands/hooks/use-brand-progress.ts
// Hook to calculate brand completion progress

import { useMemo } from 'react';
import type { RouterOutput } from '@repo/api/client';

type Brand = RouterOutput['brands']['get'];

export interface ProgressItem {
  key: string;
  label: string;
  completed: boolean;
}

export interface BrandProgress {
  items: ProgressItem[];
  percentage: number;
  completedCount: number;
  totalCount: number;
  nextIncomplete: ProgressItem | undefined;
}

/**
 * Calculate brand completion progress.
 * Used to show progress indicators in the UI.
 */
export function useBrandProgress(brand: Brand): BrandProgress {
  return useMemo(() => {
    const items: ProgressItem[] = [
      {
        key: 'name',
        label: 'Brand Name',
        completed: brand.name !== 'Untitled Brand' && brand.name.length > 0,
      },
      {
        key: 'description',
        label: 'Description',
        completed: !!brand.description && brand.description.length > 0,
      },
      {
        key: 'mission',
        label: 'Mission',
        completed: !!brand.mission && brand.mission.length > 0,
      },
      {
        key: 'values',
        label: 'Core Values',
        completed: brand.values.length > 0,
      },
      {
        key: 'colors',
        label: 'Brand Colors',
        completed: !!brand.colors?.primary,
      },
      {
        key: 'brandGuide',
        label: 'Brand Guide',
        completed: !!brand.brandGuide && brand.brandGuide.length > 0,
      },
      {
        key: 'personas',
        label: 'Personas',
        completed: brand.personas.length > 0,
      },
      {
        key: 'segments',
        label: 'Audience Segments',
        completed: brand.segments.length > 0,
      },
    ];

    const completedCount = items.filter((i) => i.completed).length;
    const totalCount = items.length;
    const percentage = Math.round((completedCount / totalCount) * 100);
    const nextIncomplete = items.find((i) => !i.completed);

    return {
      items,
      percentage,
      completedCount,
      totalCount,
      nextIncomplete,
    };
  }, [brand]);
}
