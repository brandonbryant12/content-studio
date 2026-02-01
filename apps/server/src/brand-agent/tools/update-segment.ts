// brand-agent/tools/update-segment.ts
// Tool to update an existing audience segment

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
      'ID of the segment to update (e.g., "seg_abc123"). Use getBrandStatus to see existing segments and their IDs.',
    ),
  name: z.string().optional().describe('New name for the segment'),
  description: z.string().optional().describe('New description'),
  messagingTone: z.string().optional().describe('New messaging tone'),
  keyBenefits: z
    .array(z.string())
    .optional()
    .describe('New key benefits (replaces all existing benefits)'),
});

/**
 * Create the updateSegment tool.
 * Updates an existing segment by ID.
 */
export function createUpdateSegmentTool(context: ToolContext) {
  return tool({
    description:
      'Update an existing audience segment. Use getBrandStatus first to see the list of segments and their IDs. Only include the fields you want to change.',
    inputSchema: zodSchema(inputSchema),
    execute: async (params): Promise<ToolResult> => {
      const existingSegments = context.brand.segments ?? [];
      const segmentIndex = existingSegments.findIndex(
        (s) => s.id === params.segmentId,
      );

      if (segmentIndex === -1) {
        return {
          success: false,
          error: `Segment with ID "${params.segmentId}" not found. Use getBrandStatus to see existing segments.`,
        };
      }

      const existingSegment = existingSegments[segmentIndex]!;

      // Merge updates with existing segment
      const updatedSegment = {
        ...existingSegment,
        ...(params.name !== undefined && { name: params.name }),
        ...(params.description !== undefined && {
          description: params.description,
        }),
        ...(params.messagingTone !== undefined && {
          messagingTone: params.messagingTone,
        }),
        ...(params.keyBenefits !== undefined && {
          keyBenefits: params.keyBenefits,
        }),
      };

      // Update the segments array
      const updatedSegments = [...existingSegments];
      updatedSegments[segmentIndex] = updatedSegment;

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
        updated: {
          type: 'segment',
          id: updatedSegment.id,
          name: updatedSegment.name,
        },
      };
    },
  });
}
