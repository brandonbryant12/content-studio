import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamText, tool, zodSchema } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { Effect } from 'effect';
import { z } from 'zod';
import { trustedOrigins } from '../config';
import { env } from '../env';
import { auth, serverRuntime, sseManager } from '../services';
import { getSessionWithRole } from '@repo/auth/server';
import { withCurrentUser, type User } from '@repo/auth/policy';
import { updateBrand, getBrand, appendChatMessage } from '@repo/media';
import type {
  UpdateBrand,
  BrandPersona,
  BrandSegment,
  BrandColors,
} from '@repo/db/schema';

// =============================================================================
// System Prompt
// =============================================================================

const BRAND_BUILDER_SYSTEM_PROMPT = `You are a brand strategist helping users build comprehensive brand profiles through conversation. Your goal is to guide users through developing their brand identity step by step.

## Your Approach

1. **Be conversational and encouraging** - Make the process feel collaborative, not like a form
2. **Ask one topic at a time** - Don't overwhelm users with multiple questions
3. **Use the updateBrand tool** - When users provide brand information, immediately save it using the tool
4. **Acknowledge progress** - Let users know when you've saved their input

## Brand Elements to Discover

Guide the conversation to cover these areas:
- **Brand Name** - Already provided when brand is created
- **Description** - A brief overview of what the brand is about
- **Mission** - The brand's purpose and why it exists
- **Values** - Core principles that guide the brand (typically 3-5)
- **Colors** - Primary brand color, optional secondary and accent colors
- **Brand Guide** - Detailed brand guidelines, tone of voice, messaging principles

## Personas (Optional)
If relevant, help create brand personas:
- Name and role (e.g., "Alex, the Host")
- Personality description
- Speaking style
- Voice ID for TTS (ask user preference)
- Example quotes that represent this persona

## Segments (Optional)
If relevant, help define target audience segments:
- Segment name
- Description of this audience
- Messaging tone for this segment
- Key benefits to emphasize

## Guidelines

- Start by acknowledging the brand name and asking about the brand's core purpose/description
- When users give short answers, help them elaborate
- Use the updateBrand tool after gathering each piece of information
- If users want to skip a section, that's okay - move forward
- Summarize progress periodically
- Be creative and help users articulate their brand vision

Remember: Save information incrementally using the updateBrand tool rather than waiting until the end.`;

// =============================================================================
// Types
// =============================================================================

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface BrandChatRequest {
  brandId: string;
  messages: ChatMessage[];
}

// Tool parameter types inferred from zod schema
interface UpdateBrandToolParams {
  description?: string;
  mission?: string;
  values?: string[];
  colors?: {
    primary: string;
    secondary?: string;
    accent?: string;
  };
  brandGuide?: string;
  personas?: Array<{
    id: string;
    name: string;
    role: string;
    voiceId: string;
    personalityDescription: string;
    speakingStyle: string;
    exampleQuotes: string[];
  }>;
  segments?: Array<{
    id: string;
    name: string;
    description: string;
    messagingTone: string;
    keyBenefits: string[];
  }>;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get user from session with role loaded from database.
 */
const getSessionUser = async (headers: Headers): Promise<User | null> => {
  const result = await serverRuntime.runPromise(
    getSessionWithRole(auth, headers).pipe(
      Effect.catchAll(() => Effect.succeed(null)),
    ),
  );
  return result?.user ?? null;
};

/**
 * Build update data from tool params, handling type conversions.
 */
const buildUpdateData = (params: UpdateBrandToolParams): UpdateBrand => {
  const data: Partial<{
    description: string;
    mission: string;
    values: string[];
    colors: BrandColors;
    brandGuide: string;
    personas: BrandPersona[];
    segments: BrandSegment[];
  }> = {};

  if (params.description !== undefined) {
    data.description = params.description;
  }
  if (params.mission !== undefined) {
    data.mission = params.mission;
  }
  if (params.values !== undefined) {
    data.values = params.values;
  }
  if (params.colors !== undefined) {
    data.colors = params.colors;
  }
  if (params.brandGuide !== undefined) {
    data.brandGuide = params.brandGuide;
  }
  if (params.personas !== undefined) {
    data.personas = params.personas;
  }
  if (params.segments !== undefined) {
    data.segments = params.segments;
  }

  return data as UpdateBrand;
};

// =============================================================================
// Route
// =============================================================================

/**
 * Brand chat route for AI-powered brand building conversations.
 * Uses Vercel AI SDK streamText with tool calling to update brands in real-time.
 */
export const brandChatRoute = new Hono()
  .use(
    cors({
      origin: trustedOrigins,
      credentials: true,
    }),
  )
  .post('/', async (c) => {
    // Verify session
    const user = await getSessionUser(c.req.raw.headers);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Parse request body
    let body: BrandChatRequest;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid request body' }, 400);
    }

    const { brandId, messages } = body;

    if (!brandId || !messages?.length) {
      return c.json({ error: 'brandId and messages are required' }, 400);
    }

    // Verify brand exists and user has access
    try {
      await serverRuntime.runPromise(
        withCurrentUser(user)(getBrand({ id: brandId })),
      );
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes('not found') ||
          (error as { _tag?: string })._tag === 'BrandNotFound'
        ) {
          return c.json({ error: 'Brand not found' }, 404);
        }
        if ((error as { _tag?: string })._tag === 'ForbiddenError') {
          return c.json({ error: 'Not brand owner' }, 403);
        }
      }
      throw error;
    }

    // Create Google AI model
    // Use real AI if configured, otherwise this will fail gracefully
    const google = createGoogleGenerativeAI({
      apiKey: env.GEMINI_API_KEY ?? '',
    });
    const model = google('gemini-2.5-flash');

    // Define the updateBrand tool input schema
    const updateBrandInputSchema = z.object({
      description: z
        .string()
        .optional()
        .describe('Brand description - what the brand is about'),
      mission: z.string().optional().describe('Brand mission statement'),
      values: z
        .array(z.string())
        .optional()
        .describe('Brand values as an array of strings'),
      colors: z
        .object({
          primary: z.string().describe('Primary brand color in hex format'),
          secondary: z.string().optional().describe('Secondary brand color'),
          accent: z.string().optional().describe('Accent brand color'),
        })
        .optional()
        .describe('Brand color palette'),
      brandGuide: z
        .string()
        .optional()
        .describe('Brand guidelines and tone of voice'),
      personas: z
        .array(
          z.object({
            id: z.string().describe('Unique ID for the persona'),
            name: z.string().describe('Persona name'),
            role: z.string().describe('Persona role (e.g., Host, Expert)'),
            voiceId: z.string().describe('TTS voice ID'),
            personalityDescription: z
              .string()
              .describe('Personality description'),
            speakingStyle: z.string().describe('How this persona speaks'),
            exampleQuotes: z.array(z.string()).describe('Example quotes'),
          }),
        )
        .optional()
        .describe('Brand personas for content'),
      segments: z
        .array(
          z.object({
            id: z.string().describe('Unique ID for the segment'),
            name: z.string().describe('Segment name'),
            description: z.string().describe('Who this segment is'),
            messagingTone: z.string().describe('How to speak to this segment'),
            keyBenefits: z.array(z.string()).describe('Benefits to emphasize'),
          }),
        )
        .optional()
        .describe('Target audience segments'),
    });

    // Define the updateBrand tool
    const updateBrandTool = tool({
      description:
        'Update brand information. Call this whenever the user provides brand details like description, mission, values, colors, etc.',
      inputSchema: zodSchema(updateBrandInputSchema),
      execute: async (params) => {
        // Build update data
        const updateData = buildUpdateData(params as UpdateBrandToolParams);

        // Update the brand
        await serverRuntime.runPromise(
          withCurrentUser(user)(updateBrand({ id: brandId, data: updateData })),
        );

        // Emit SSE event for real-time UI updates
        sseManager.emit(user.id, {
          type: 'entity_change',
          entityType: 'brand',
          changeType: 'update',
          entityId: brandId,
          userId: user.id,
          timestamp: new Date().toISOString(),
        });

        return { success: true, updated: Object.keys(updateData) };
      },
    });

    // Stream the response
    const result = streamText({
      model,
      system: BRAND_BUILDER_SYSTEM_PROMPT,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      tools: {
        updateBrand: updateBrandTool,
      },
      onFinish: async ({ text }) => {
        // Append the assistant's response to chat history
        if (text) {
          try {
            await serverRuntime.runPromise(
              withCurrentUser(user)(
                appendChatMessage({
                  brandId,
                  message: { role: 'assistant', content: text },
                }),
              ),
            );
          } catch (error) {
            console.error('Failed to append chat message:', error);
          }
        }
      },
    });

    // Append the user's last message to chat history
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage?.role === 'user') {
      try {
        await serverRuntime.runPromise(
          withCurrentUser(user)(
            appendChatMessage({
              brandId,
              message: { role: 'user', content: lastUserMessage.content },
            }),
          ),
        );
      } catch (error) {
        console.error('Failed to append user message:', error);
      }
    }

    // Return the stream response
    return result.toTextStreamResponse();
  });

export const brandChatPath = `${env.PUBLIC_SERVER_API_PATH}/brand-chat`;
