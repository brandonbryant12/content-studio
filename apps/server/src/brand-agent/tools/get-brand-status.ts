// brand-agent/tools/get-brand-status.ts
// Tool to get current brand completion status

import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import type { BrandOutput } from '@repo/db/schema';
import { calculateBrandStatus } from '../utils';
import type { BrandStatus } from '../types';

/**
 * Create the getBrandStatus tool.
 * This tool returns the current completion status of the brand,
 * helping the AI decide what to ask about next.
 */
export function createGetBrandStatusTool(brand: BrandOutput) {
  return tool({
    description:
      'Get the current completion status of the brand. Call this at the start of a conversation or when deciding what to ask about next. Returns completion percentage, missing fields, and suggested next step.',
    inputSchema: zodSchema(z.object({})),
    execute: async (): Promise<BrandStatus> => {
      return calculateBrandStatus(brand);
    },
  });
}
