// brand-agent/types.ts
// Shared types for the brand-building agent

import type { User } from '@repo/auth/policy';
import type { BrandOutput } from '@repo/db/schema';

/**
 * Summary of a persona for status display.
 */
export interface PersonaSummary {
  id: string;
  name: string;
  role: string;
}

/**
 * Summary of a segment for status display.
 */
export interface SegmentSummary {
  id: string;
  name: string;
}

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
  /** List of existing personas with IDs for reference */
  personas: PersonaSummary[];
  /** List of existing segments with IDs for reference */
  segments: SegmentSummary[];
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
  updated?: string[] | { type: 'persona' | 'segment'; id: string; name: string };
  created?: { type: 'persona' | 'segment'; id: string; name: string };
  deleted?: { type: 'persona' | 'segment'; id: string; name: string };
  error?: string;
}
