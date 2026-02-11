/**
 * @repo/testing - Test utilities for Content Studio
 *
 * This package provides:
 * - Mock Effect layers for LLM, TTS, and Storage services
 * - Factory functions for creating test entities
 * - Database test context with transaction rollback
 * - Layer composition utilities for integration testing
 *
 * @example
 * ```ts
 * import { createTestContext, createMockAILayers, createTestPodcast } from '@repo/testing';
 *
 * describe('podcast generation', () => {
 *   let ctx: TestContext;
 *
 *   beforeEach(async () => {
 *     ctx = await createTestContext();
 *   });
 *
 *   afterEach(async () => {
 *     await ctx.rollback();
 *   });
 *
 *   it('generates a script', async () => {
 *     const podcast = createTestPodcast();
 *     await ctx.db.insert(podcastTable).values(podcast);
 *
 *     await Effect.runPromise(
 *       generator.generateScript(podcast.id).pipe(
 *         Effect.provide(Layer.mergeAll(ctx.dbLayer, createMockAILayers()))
 *       )
 *     );
 *   });
 * });
 * ```
 */

// Re-export all mocks
export * from './mocks';

// Re-export all factories
export * from './factories';

// Re-export all setup utilities
export * from './setup';

// Re-export testcontainers utilities
export * from './testcontainers';

// Re-export Effect test assertions
export * from './effect-assertions';
