// brand-agent/tools/create-persona.ts
// Tool to create a new brand persona

import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { withCurrentUser } from '@repo/auth/policy';
import { updateBrand } from '@repo/media';
import type { BrandPersona } from '@repo/db/schema';
import { serverRuntime, sseManager } from '../../services';
import type { ToolContext, ToolResult } from '../types';
import { generateEntityId } from '../utils';

const inputSchema = z.object({
  name: z.string().min(1).describe('Persona name (e.g., "Alex", "Dr. Chen")'),
  role: z
    .string()
    .min(1)
    .describe('Persona role (e.g., "Host", "Expert", "Co-host", "Narrator")'),
  voiceId: z
    .string()
    .default('Aoede')
    .describe('TTS voice ID - use "Aoede" as default if not specified'),
  personalityDescription: z
    .string()
    .min(1)
    .describe(
      'Personality description - who this persona is, their background, and character traits',
    ),
  speakingStyle: z
    .string()
    .min(1)
    .describe(
      'Speaking style - how this persona talks (e.g., "Warm and conversational", "Professional and authoritative")',
    ),
  exampleQuotes: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe(
      'Example quotes that show how this persona speaks - 2-3 sample phrases or sentences',
    ),
});

/**
 * Create the createPersona tool.
 * Creates a new persona and adds it to the brand.
 */
export function createCreatePersonaTool(context: ToolContext) {
  return tool({
    description:
      'Create a new brand persona. Personas are character voices used in podcasts and other content. Gather all the required information from the user before calling this: name, role, personality, speaking style, and example quotes.',
    inputSchema: zodSchema(inputSchema),
    execute: async (params): Promise<ToolResult> => {
      const newPersona: BrandPersona = {
        id: generateEntityId('per'),
        name: params.name,
        role: params.role,
        voiceId: params.voiceId,
        personalityDescription: params.personalityDescription,
        speakingStyle: params.speakingStyle,
        exampleQuotes: params.exampleQuotes,
      };

      // Get existing personas and add the new one
      const existingPersonas = context.brand.personas ?? [];
      const updatedPersonas = [...existingPersonas, newPersona];

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
        created: { type: 'persona', id: newPersona.id, name: newPersona.name },
      };
    },
  });
}
