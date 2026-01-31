// brand-agent/tools/create-segment.ts
// Tool to create a new target audience segment

import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { withCurrentUser } from '@repo/auth/policy';
import { updateBrand } from '@repo/media';
import type { BrandSegment } from '@repo/db/schema';
import { serverRuntime, sseManager } from '../../services';
import type { ToolContext, ToolResult } from '../types';
import { generateEntityId } from '../utils';

const inputSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe(
      'Segment name (e.g., "Enterprise Decision Makers", "Early Adopters")',
    ),
  description: z
    .string()
    .min(1)
    .describe(
      'Description of who this segment is - demographics, behaviors, and characteristics',
    ),
  messagingTone: z
    .string()
    .min(1)
    .describe(
      'How to speak to this segment - the tone and style of messaging that resonates with them',
    ),
  keyBenefits: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe(
      'Key benefits to emphasize when speaking to this segment - 2-4 main points',
    ),
});

/**
 * Create the createSegment tool.
 * Creates a new audience segment and adds it to the brand.
 */
export function createCreateSegmentTool(context: ToolContext) {
  return tool({
    description:
      'Create a new target audience segment. Segments help tailor messaging to different audience groups. Gather all the required information from the user before calling this: name, description, messaging tone, and key benefits.',
    inputSchema: zodSchema(inputSchema),
    execute: async (params): Promise<ToolResult> => {
      const newSegment: BrandSegment = {
        id: generateEntityId('seg'),
        name: params.name,
        description: params.description,
        messagingTone: params.messagingTone,
        keyBenefits: params.keyBenefits,
      };

      // Get existing segments and add the new one
      const existingSegments = context.brand.segments ?? [];
      const updatedSegments = [...existingSegments, newSegment];

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
        created: { type: 'segment', id: newSegment.id, name: newSegment.name },
      };
    },
  });
}
