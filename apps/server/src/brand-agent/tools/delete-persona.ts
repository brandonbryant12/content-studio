// brand-agent/tools/delete-persona.ts
// Tool to delete a brand persona

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
      'ID of the persona to delete (e.g., "per_abc123"). Use getBrandStatus to see existing personas and their IDs.',
    ),
});

/**
 * Create the deletePersona tool.
 * Deletes an existing persona by ID.
 */
export function createDeletePersonaTool(context: ToolContext) {
  return tool({
    description:
      'Delete a brand persona. Use getBrandStatus first to see the list of personas and their IDs. This action cannot be undone.',
    inputSchema: zodSchema(inputSchema),
    execute: async (params): Promise<ToolResult> => {
      const existingPersonas = context.brand.personas ?? [];
      const persona = existingPersonas.find((p) => p.id === params.personaId);

      if (!persona) {
        return {
          success: false,
          error: `Persona with ID "${params.personaId}" not found. Use getBrandStatus to see existing personas.`,
        };
      }

      // Remove the persona from the array
      const updatedPersonas = existingPersonas.filter(
        (p) => p.id !== params.personaId,
      );

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
        deleted: { type: 'persona', id: persona.id, name: persona.name },
      };
    },
  });
}
