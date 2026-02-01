// brand-agent/tools/delete-segment.ts
// Tool to delete an audience segment

import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { withCurrentUser } from '@repo/auth/policy';
import { updateBrand } from '@repo/media';
import { serverRuntime, sseManager } from '../../services';
import type { ToolContext, ToolResult } from '../types';

const inputSchema = z.object({
  segmentId: z
    .string()
    .min(1)
    .describe(
      'ID of the segment to delete (e.g., "seg_abc123"). Use getBrandStatus to see existing segments and their IDs.',
    ),
});

/**
 * Create the deleteSegment tool.
 * Deletes an existing segment by ID.
 */
export function createDeleteSegmentTool(context: ToolContext) {
  return tool({
    description:
      'Delete an audience segment. Use getBrandStatus first to see the list of segments and their IDs. This action cannot be undone.',
    inputSchema: zodSchema(inputSchema),
    execute: async (params): Promise<ToolResult> => {
      const existingSegments = context.brand.segments ?? [];
      const segment = existingSegments.find((s) => s.id === params.segmentId);

      if (!segment) {
        return {
          success: false,
          error: `Segment with ID "${params.segmentId}" not found. Use getBrandStatus to see existing segments.`,
        };
      }

      // Remove the segment from the array
      const updatedSegments = existingSegments.filter(
        (s) => s.id !== params.segmentId,
      );

      await serverRuntime.runPromise(
        withCurrentUser(context.user)(
          updateBrand({
            id: context.brandId,
            data: { segments: updatedSegments },
          }),
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

      return {
        success: true,
        deleted: { type: 'segment', id: segment.id, name: segment.name },
      };
    },
  });
}
