// features/brands/lib/wizard-steps.ts
// Wizard step definitions for the brand builder

import {
  HomeIcon,
  TargetIcon,
  StarIcon,
  ColorWheelIcon,
  ChatBubbleIcon,
  PersonIcon,
  Share2Icon,
  CheckCircledIcon,
} from '@radix-ui/react-icons';
import type { ComponentType } from 'react';
import type { RouterOutput } from '@repo/api/client';

type Brand = RouterOutput['brands']['get'];

export type WizardStepInputType = 'chat-first' | 'input-first' | 'hybrid';

export interface WizardStep {
  /** Unique step key matching brand data fields */
  key: string;
  /** Display title for the step */
  title: string;
  /** Descriptive subtitle shown in step header */
  description: string;
  /** Icon component to display in navigation */
  icon: ComponentType<{ className?: string }>;
  /** Whether the step is complete based on brand data */
  isComplete: (brand: Brand) => boolean;
  /** Input interaction type for the step */
  inputType: WizardStepInputType;
}

/**
 * Ordered wizard steps for brand creation.
 * Steps progress from basics to review.
 */
export const WIZARD_STEPS: WizardStep[] = [
  {
    key: 'basics',
    title: 'Brand Basics',
    description: "Let's start with your brand's name and description",
    icon: HomeIcon,
    // Complete when brand has a custom name (not default)
    isComplete: (brand) =>
      brand.name !== 'Untitled Brand' && brand.name.trim().length > 0,
    inputType: 'hybrid',
  },
  {
    key: 'mission',
    title: 'Mission',
    description: "Define your brand's purpose and what you stand for",
    icon: TargetIcon,
    isComplete: (brand) => !!brand.mission && brand.mission.length > 0,
    inputType: 'chat-first',
  },
  {
    key: 'values',
    title: 'Core Values',
    description: 'Identify the principles that guide your brand',
    icon: StarIcon,
    isComplete: (brand) => brand.values.length >= 3,
    inputType: 'chat-first',
  },
  {
    key: 'colors',
    title: 'Brand Colors',
    description: 'Choose colors that represent your brand identity',
    icon: ColorWheelIcon,
    isComplete: (brand) => !!brand.colors?.primary,
    inputType: 'input-first',
  },
  {
    key: 'voice',
    title: 'Voice & Tone',
    description: 'Establish how your brand communicates',
    icon: ChatBubbleIcon,
    isComplete: (brand) => !!brand.brandGuide && brand.brandGuide.length > 0,
    inputType: 'hybrid',
  },
  {
    key: 'personas',
    title: 'Personas',
    description: 'Create characters that represent your brand voices',
    icon: PersonIcon,
    // Complete when at least one persona has a name
    isComplete: (brand) =>
      brand.personas.some((p) => p.name && p.name.trim().length > 0),
    inputType: 'chat-first',
  },
  {
    key: 'segments',
    title: 'Audience Segments',
    description: 'Define the audiences your brand speaks to',
    icon: Share2Icon,
    // Complete when at least one segment has a name
    isComplete: (brand) =>
      brand.segments.some((s) => s.name && s.name.trim().length > 0),
    inputType: 'chat-first',
  },
  {
    key: 'review',
    title: 'Review',
    description: 'Review and finalize your brand profile',
    icon: CheckCircledIcon,
    isComplete: () => false, // Review is never auto-complete
    inputType: 'hybrid',
  },
];

/**
 * Get step index by key.
 */
export function getStepIndex(key: string): number {
  return WIZARD_STEPS.findIndex((step) => step.key === key);
}

/**
 * Get step by index.
 */
export function getStepByIndex(index: number): WizardStep | undefined {
  return WIZARD_STEPS[index];
}

/**
 * Get step by key.
 */
export function getStepByKey(key: string): WizardStep | undefined {
  return WIZARD_STEPS.find((step) => step.key === key);
}

/**
 * Calculate overall wizard progress.
 */
export function calculateWizardProgress(brand: Brand): {
  completedSteps: number;
  totalSteps: number;
  percentage: number;
} {
  // Exclude review step from progress calculation
  const stepsToCount = WIZARD_STEPS.filter((step) => step.key !== 'review');
  const completedSteps = stepsToCount.filter((step) =>
    step.isComplete(brand),
  ).length;
  const totalSteps = stepsToCount.length;
  const percentage = Math.round((completedSteps / totalSteps) * 100);

  return { completedSteps, totalSteps, percentage };
}
