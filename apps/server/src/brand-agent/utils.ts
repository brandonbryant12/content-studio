// brand-agent/utils.ts
// Utility functions for brand agent

import type { BrandOutput } from '@repo/db/schema';
import type { BrandStatus } from './types';

/**
 * Calculate the completion status of a brand.
 * Used to determine what the AI should ask about next.
 */
export function calculateBrandStatus(brand: BrandOutput): BrandStatus {
  const hasName = brand.name !== 'Untitled Brand' && brand.name.length > 0;
  const hasDescription = !!brand.description && brand.description.length > 0;
  const hasMission = !!brand.mission && brand.mission.length > 0;
  const hasValues = brand.values.length > 0;
  const hasColors = !!brand.colors?.primary;
  const hasBrandGuide = !!brand.brandGuide && brand.brandGuide.length > 0;
  const personaCount = brand.personas.length;
  const segmentCount = brand.segments.length;

  // Calculate completion percentage
  // Weight: basics (60%), personas (20%), segments (20%)
  const basicFields = [
    hasName,
    hasDescription,
    hasMission,
    hasValues,
    hasColors,
    hasBrandGuide,
  ];
  const basicCompletion =
    basicFields.filter(Boolean).length / basicFields.length;
  const personaCompletion = personaCount > 0 ? 1 : 0;
  const segmentCompletion = segmentCount > 0 ? 1 : 0;

  const completionPercentage = Math.round(
    basicCompletion * 60 + personaCompletion * 20 + segmentCompletion * 20,
  );

  // Determine missing fields
  const missingFields: string[] = [];
  if (!hasName) missingFields.push('name');
  if (!hasDescription) missingFields.push('description');
  if (!hasMission) missingFields.push('mission');
  if (!hasValues) missingFields.push('values');
  if (!hasColors) missingFields.push('colors');
  if (!hasBrandGuide) missingFields.push('brandGuide');
  if (personaCount === 0) missingFields.push('personas');
  if (segmentCount === 0) missingFields.push('segments');

  // Determine suggested next step
  let suggestedNextStep: string;
  if (!hasName) {
    suggestedNextStep = "Ask for the brand's name";
  } else if (!hasDescription) {
    suggestedNextStep = "Ask what the brand does and what it's all about";
  } else if (!hasMission) {
    suggestedNextStep = "Ask about the brand's mission or purpose";
  } else if (!hasValues) {
    suggestedNextStep = 'Ask about 3-5 core values that guide the brand';
  } else if (!hasColors) {
    suggestedNextStep = 'Ask about brand colors (at least a primary color)';
  } else if (!hasBrandGuide) {
    suggestedNextStep = 'Ask about tone of voice and messaging guidelines';
  } else if (personaCount === 0) {
    suggestedNextStep = 'Suggest creating a persona for podcast voices';
  } else if (segmentCount === 0) {
    suggestedNextStep = 'Suggest defining target audience segments';
  } else {
    suggestedNextStep =
      'Offer to add more personas/segments or refine existing content';
  }

  return {
    hasName,
    hasDescription,
    hasMission,
    hasValues,
    hasColors,
    hasBrandGuide,
    personaCount,
    segmentCount,
    completionPercentage,
    missingFields,
    suggestedNextStep,
  };
}

/**
 * Generate a unique ID for personas and segments.
 * Uses a simple timestamp + random suffix pattern.
 */
export function generateEntityId(prefix: 'per' | 'seg'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 6);
  return `${prefix}_${timestamp}${random}`;
}
