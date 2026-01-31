// brand-agent/tools/update-brand-visuals.ts
// Tool to update brand colors and brand guide

import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { withCurrentUser } from '@repo/auth/policy';
import { updateBrand } from '@repo/media';
import type { BrandColors } from '@repo/db/schema';
import { serverRuntime, sseManager } from '../../services';
import type { ToolContext, ToolResult } from '../types';

const inputSchema = z.object({
  colors: z
    .object({
      primary: z
        .string()
        .describe('Primary brand color in hex format (e.g., #3B82F6)'),
      secondary: z
        .string()
        .optional()
        .describe('Secondary brand color in hex format'),
      accent: z
        .string()
        .optional()
        .describe('Accent brand color in hex format'),
    })
    .optional()
    .describe('Brand color palette'),
  brandGuide: z
    .string()
    .optional()
    .describe(
      'Brand guidelines - tone of voice, messaging style, key phrases to use or avoid',
    ),
});

/**
 * Create the updateBrandVisuals tool.
 * Updates brand colors and/or brand guide.
 */
export function createUpdateBrandVisualsTool(context: ToolContext) {
  return tool({
    description:
      'Update brand visuals: colors and/or brand guide (tone of voice). Call this when the user provides color preferences or messaging guidelines. Colors should be in hex format.',
    inputSchema: zodSchema(inputSchema),
    execute: async (params): Promise<ToolResult> => {
      const updateData: { colors?: BrandColors; brandGuide?: string } = {};
      const updated: string[] = [];

      if (params.colors !== undefined) {
        updateData.colors = params.colors;
        updated.push('colors');
      }
      if (params.brandGuide !== undefined) {
        updateData.brandGuide = params.brandGuide;
        updated.push('brandGuide');
      }

      if (updated.length === 0) {
        return { success: false, error: 'No fields provided to update' };
      }

      await serverRuntime.runPromise(
        withCurrentUser(context.user)(
          updateBrand({ id: context.brandId, data: updateData }),
        ),
      );

      // Emit SSE event for real-time UI updates
      sseManager.emit(context.user.id, {
        type: 'entity_change',
        entityType: 'brand',
        changeType: 'update',
        entityId: context.brandId,
        userId: context.user.id,
        timestamp: new Date().toISOString(),
      });

      return { success: true, updated };
    },
  });
}
