import { Effect } from 'effect';
import type { BrandChatMessage } from '@repo/db/schema';
import { requireOwnership } from '@repo/auth/policy';
import { BrandRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface AppendChatMessageInput {
  brandId: string;
  message: {
    role: 'user' | 'assistant';
    content: string;
  };
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Append a message to the brand's chat history.
 *
 * This use case:
 * 1. Fetches the brand by ID
 * 2. Verifies the current user owns the brand
 * 3. Creates a new message with timestamp
 * 4. Keeps only the last 30 messages in history
 * 5. Updates the brand with the new chat messages
 *
 * @example
 * const brand = yield* appendChatMessage({
 *   brandId: 'brand_123',
 *   message: {
 *     role: 'user',
 *     content: 'What is our brand mission?',
 *   },
 * });
 */
export const appendChatMessage = (input: AppendChatMessageInput) =>
  Effect.gen(function* () {
    const brandRepo = yield* BrandRepo;

    // Fetch brand and verify ownership
    const brand = yield* brandRepo.findById(input.brandId);
    yield* requireOwnership(brand.createdBy);

    // Create new message with timestamp
    const newMessage: BrandChatMessage = {
      role: input.message.role,
      content: input.message.content,
      timestamp: new Date().toISOString(),
    };

    // Keep only last 30 messages
    const existingMessages = brand.chatMessages ?? [];
    const updatedMessages = [...existingMessages, newMessage].slice(-30);

    // Update brand with new messages
    const updated = yield* brandRepo.update(input.brandId, {
      chatMessages: updatedMessages,
    });

    return updated;
  }).pipe(
    Effect.withSpan('useCase.appendChatMessage', {
      attributes: { 'brand.id': input.brandId },
    }),
  );
