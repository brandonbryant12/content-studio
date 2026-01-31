// routes/brand-chat.ts
// Brand chat route with proactive multi-tool agent

import { Effect } from 'effect';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamText, stepCountIs } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getSessionWithRole } from '@repo/auth/server';
import { withCurrentUser } from '@repo/auth/policy';
import { getBrand, appendChatMessage } from '@repo/media';
import { serializeBrand } from '@repo/db/schema';
import { trustedOrigins } from '../config';
import { env } from '../env';
import { auth, serverRuntime } from '../services';
import {
  generateBrandAgentPrompt,
  calculateBrandStatus,
  createGetBrandStatusTool,
  createUpdateBrandBasicsTool,
  createUpdateBrandValuesTool,
  createUpdateBrandVisualsTool,
  createCreatePersonaTool,
  createCreateSegmentTool,
} from '../brand-agent';
import type { User } from '@repo/auth/policy';
import type { ToolContext } from '../brand-agent';

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

// =============================================================================
// Route
// =============================================================================

/**
 * Brand chat route for AI-powered brand building conversations.
 * Uses a proactive multi-tool agent that drives the conversation.
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

    // Fetch brand to get current state for status calculation
    let brand;
    try {
      const brandEntity = await serverRuntime.runPromise(
        withCurrentUser(user)(getBrand({ id: brandId })),
      );
      brand = serializeBrand(brandEntity);
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

    // Calculate brand status for dynamic prompt
    const status = calculateBrandStatus(brand);

    // Create tool context
    const toolContext: ToolContext = {
      brandId,
      user,
      brand,
    };

    // Create Google AI model
    const google = createGoogleGenerativeAI({
      apiKey: env.GEMINI_API_KEY ?? '',
    });
    const model = google('gemini-2.5-flash');

    // Generate proactive system prompt based on current brand state
    const systemPrompt = generateBrandAgentPrompt(brand.name, status);

    // Stream the response with multi-tool support
    const result = streamText({
      model,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      tools: {
        getBrandStatus: createGetBrandStatusTool(brand),
        updateBrandBasics: createUpdateBrandBasicsTool(toolContext),
        updateBrandValues: createUpdateBrandValuesTool(toolContext),
        updateBrandVisuals: createUpdateBrandVisualsTool(toolContext),
        createPersona: createCreatePersonaTool(toolContext),
        createSegment: createCreateSegmentTool(toolContext),
      },
      stopWhen: stepCountIs(5), // Allow up to 5 steps for multi-tool responses
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
