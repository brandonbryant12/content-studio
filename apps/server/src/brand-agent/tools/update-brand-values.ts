// brand-agent/tools/update-brand-values.ts
// Tool to update brand values

import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { withCurrentUser } from '@repo/auth/policy';
import { updateBrand } from '@repo/media';
import { serverRuntime, sseManager } from '../../services';
import type { ToolContext, ToolResult } from '../types';

const inputSchema = z.object({
  values: z
    .array(z.string())
    .min(1)
    .max(10)
    .describe(
      'Brand values - an array of 3-5 core principles that guide the brand (e.g., "Innovation", "Integrity", "Customer Focus")',
    ),
});

/**
 * Create the updateBrandValues tool.
 * Updates the brand's core values array.
 */
export function createUpdateBrandValuesTool(context: ToolContext) {
  return tool({
    description:
      'Update the brand values. Call this when the user provides their core values or principles. Values should be concise words or short phrases that represent what the brand stands for.',
    inputSchema: zodSchema(inputSchema),
    execute: async (params): Promise<ToolResult> => {
      await serverRuntime.runPromise(
        withCurrentUser(context.user)(
          updateBrand({ id: context.brandId, data: { values: params.values } }),
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

      return { success: true, updated: ['values'] };
    },
  });
}
