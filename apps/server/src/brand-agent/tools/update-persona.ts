// brand-agent/tools/update-persona.ts
// Tool to update an existing brand persona

import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { withCurrentUser } from '@repo/auth/policy';
import { updateBrand } from '@repo/media';
import { serverRuntime, sseManager } from '../../services';
import type { ToolContext, ToolResult } from '../types';

const inputSchema = z.object({
  personaId: z
    .string()
    .min(1)
    .describe(
      'ID of the persona to update (e.g., "per_abc123"). Use getBrandStatus to see existing personas and their IDs.',
    ),
  name: z.string().optional().describe('New name for the persona'),
  role: z.string().optional().describe('New role for the persona'),
  voiceId: z.string().optional().describe('New TTS voice ID'),
  personalityDescription: z
    .string()
    .optional()
    .describe('New personality description'),
  speakingStyle: z.string().optional().describe('New speaking style'),
  exampleQuotes: z
    .array(z.string())
    .optional()
    .describe('New example quotes (replaces all existing quotes)'),
});

/**
 * Create the updatePersona tool.
 * Updates an existing persona by ID.
 */
export function createUpdatePersonaTool(context: ToolContext) {
  return tool({
    description:
      'Update an existing brand persona. Use getBrandStatus first to see the list of personas and their IDs. Only include the fields you want to change.',
    inputSchema: zodSchema(inputSchema),
    execute: async (params): Promise<ToolResult> => {
      const existingPersonas = context.brand.personas ?? [];
      const personaIndex = existingPersonas.findIndex(
        (p) => p.id === params.personaId,
      );

      if (personaIndex === -1) {
        return {
          success: false,
          error: `Persona with ID "${params.personaId}" not found. Use getBrandStatus to see existing personas.`,
        };
      }

      const existingPersona = existingPersonas[personaIndex]!;

      // Merge updates with existing persona
      const updatedPersona = {
        ...existingPersona,
        ...(params.name !== undefined && { name: params.name }),
        ...(params.role !== undefined && { role: params.role }),
        ...(params.voiceId !== undefined && { voiceId: params.voiceId }),
        ...(params.personalityDescription !== undefined && {
          personalityDescription: params.personalityDescription,
        }),
        ...(params.speakingStyle !== undefined && {
          speakingStyle: params.speakingStyle,
        }),
        ...(params.exampleQuotes !== undefined && {
          exampleQuotes: params.exampleQuotes,
        }),
      };

      // Update the personas array
      const updatedPersonas = [...existingPersonas];
      updatedPersonas[personaIndex] = updatedPersona;

      await serverRuntime.runPromise(
        withCurrentUser(context.user)(
          updateBrand({
            id: context.brandId,
            data: { personas: updatedPersonas },
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
          type: 'persona',
          id: updatedPersona.id,
          name: updatedPersona.name,
        },
      };
    },
  });
}
