// brand-agent/types.ts
// Shared types for the brand-building agent

import type { User } from '@repo/auth/policy';
import type { BrandOutput } from '@repo/db/schema';

/**
 * Brand completion status for driving the agent conversation.
 */
export interface BrandStatus {
  hasName: boolean;
  hasDescription: boolean;
  hasMission: boolean;
  hasValues: boolean;
  hasColors: boolean;
  hasBrandGuide: boolean;
  personaCount: number;
  segmentCount: number;
  completionPercentage: number;
  missingFields: string[];
  suggestedNextStep: string;
}

/**
 * Context passed to all brand agent tools.
 */
export interface ToolContext {
  brandId: string;
  user: User;
  brand: BrandOutput;
}

/**
 * Result from tools that update the brand.
 */
export interface ToolResult {
  success: boolean;
  updated?: string[];
  created?: { type: 'persona' | 'segment'; id: string; name: string };
  error?: string;
}
