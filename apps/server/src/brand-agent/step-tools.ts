// brand-agent/step-tools.ts
// Step-aware tool selection for the brand wizard

import type { ToolContext } from './types';
import type { BrandOutput } from '@repo/db/schema';

import {
  createGetBrandStatusTool,
  createUpdateBrandBasicsTool,
  createUpdateBrandValuesTool,
  createUpdateBrandVisualsTool,
  createCreatePersonaTool,
  createCreateSegmentTool,
} from './tools';

/**
 * Valid wizard step keys.
 */
export type WizardStepKey =
  | 'basics'
  | 'mission'
  | 'values'
  | 'colors'
  | 'voice'
  | 'personas'
  | 'segments'
  | 'review';

/**
 * Wizard step metadata for prompt generation.
 */
export interface WizardStepInfo {
  key: WizardStepKey;
  title: string;
  description: string;
  stepNumber: number;
}

/**
 * All wizard steps in order.
 */
export const WIZARD_STEPS: WizardStepInfo[] = [
  {
    key: 'basics',
    title: 'Brand Basics',
    description: 'Name and description',
    stepNumber: 1,
  },
  {
    key: 'mission',
    title: 'Mission',
    description: 'Purpose and "why"',
    stepNumber: 2,
  },
  {
    key: 'values',
    title: 'Core Values',
    description: 'Guiding principles',
    stepNumber: 3,
  },
  {
    key: 'colors',
    title: 'Brand Colors',
    description: 'Visual identity',
    stepNumber: 4,
  },
  {
    key: 'voice',
    title: 'Voice & Tone',
    description: 'Communication style',
    stepNumber: 5,
  },
  {
    key: 'personas',
    title: 'Personas',
    description: 'Character voices',
    stepNumber: 6,
  },
  {
    key: 'segments',
    title: 'Audience Segments',
    description: 'Target audiences',
    stepNumber: 7,
  },
  {
    key: 'review',
    title: 'Review',
    description: 'Final check',
    stepNumber: 8,
  },
];

/**
 * Get step info by key.
 */
export function getStepInfo(stepKey: WizardStepKey): WizardStepInfo {
  const step = WIZARD_STEPS.find((s) => s.key === stepKey);
  // Default to review if unknown step (should never happen with proper typing)
  return step ?? WIZARD_STEPS[WIZARD_STEPS.length - 1]!;
}

/**
 * Check if a step key is valid.
 */
export function isValidStepKey(key: string): key is WizardStepKey {
  return WIZARD_STEPS.some((s) => s.key === key);
}

/**
 * All tool names for type safety.
 */
export type BrandToolName =
  | 'getBrandStatus'
  | 'updateBrandBasics'
  | 'updateBrandValues'
  | 'updateBrandVisuals'
  | 'createPersona'
  | 'createSegment';

/**
 * Get tools available for a specific wizard step.
 *
 * Step-to-tools mapping:
 * - basics: getBrandStatus, updateBrandBasics
 * - mission: getBrandStatus, updateBrandBasics (mission is part of basics)
 * - values: getBrandStatus, updateBrandValues
 * - colors: getBrandStatus, updateBrandVisuals
 * - voice: getBrandStatus, updateBrandVisuals (brand guide)
 * - personas: getBrandStatus, createPersona
 * - segments: getBrandStatus, createSegment
 * - review: ALL tools (can edit anything)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getToolsForStep(
  stepKey: WizardStepKey,
  brand: BrandOutput,
  toolContext: ToolContext,
): Record<string, any> {
  // Build all tools
  const allTools = {
    getBrandStatus: createGetBrandStatusTool(brand),
    updateBrandBasics: createUpdateBrandBasicsTool(toolContext),
    updateBrandValues: createUpdateBrandValuesTool(toolContext),
    updateBrandVisuals: createUpdateBrandVisualsTool(toolContext),
    createPersona: createCreatePersonaTool(toolContext),
    createSegment: createCreateSegmentTool(toolContext),
  };

  // Return only the tools needed for this step
  const toolNames = getToolNamesForStep(stepKey);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filteredTools: Record<string, any> = {};

  for (const name of toolNames) {
    if (name in allTools) {
      filteredTools[name] = allTools[name as keyof typeof allTools];
    }
  }

  return filteredTools;
}

/**
 * Get tool names available for a step (for prompt generation).
 */
export function getToolNamesForStep(stepKey: WizardStepKey): string[] {
  switch (stepKey) {
    case 'basics':
    case 'mission':
      return ['getBrandStatus', 'updateBrandBasics'];
    case 'values':
      return ['getBrandStatus', 'updateBrandValues'];
    case 'colors':
    case 'voice':
      return ['getBrandStatus', 'updateBrandVisuals'];
    case 'personas':
      return ['getBrandStatus', 'createPersona'];
    case 'segments':
      return ['getBrandStatus', 'createSegment'];
    case 'review':
    default:
      return [
        'getBrandStatus',
        'updateBrandBasics',
        'updateBrandValues',
        'updateBrandVisuals',
        'createPersona',
        'createSegment',
      ];
  }
}
