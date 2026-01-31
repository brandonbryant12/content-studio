// brand-agent/tools/update-brand-basics.ts
// Tool to update brand name, description, and mission

import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { withCurrentUser } from '@repo/auth/policy';
import { updateBrand } from '@repo/media';
import { serverRuntime, sseManager } from '../../services';
import type { ToolContext, ToolResult } from '../types';

const inputSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe('Brand name - the official name of the brand'),
  description: z
    .string()
    .optional()
    .describe(
      'Brand description - what the brand is about, its purpose, and offering',
    ),
  mission: z
    .string()
    .optional()
    .describe('Brand mission statement - the bigger purpose behind the brand'),
});

/**
 * Create the updateBrandBasics tool.
 * Updates name, description, and/or mission.
 */
export function createUpdateBrandBasicsTool(context: ToolContext) {
  return tool({
    description:
      'Update the brand basics: name, description, and/or mission. Call this when the user provides information about what their brand is called, what it does, or its purpose. Save each piece of information as soon as you receive it.',
    inputSchema: zodSchema(inputSchema),
    execute: async (params): Promise<ToolResult> => {
      const updateData: Record<string, string> = {};
      const updated: string[] = [];

      if (params.name !== undefined) {
        updateData.name = params.name;
        updated.push('name');
      }
      if (params.description !== undefined) {
        updateData.description = params.description;
        updated.push('description');
      }
      if (params.mission !== undefined) {
        updateData.mission = params.mission;
        updated.push('mission');
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
