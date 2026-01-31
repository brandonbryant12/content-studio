/**
 * Brand Use Cases
 *
 * Pure functions that implement business logic for brand operations.
 * Each use case yields its dependencies from context using Effect.gen.
 * Error types are inferred by Effect - no explicit error type exports.
 */

// =============================================================================
// CRUD Operations
// =============================================================================

export {
  listBrands,
  type ListBrandsInput,
  type ListBrandsResult,
} from './list-brands';

export { getBrand, type GetBrandInput } from './get-brand';

export { createBrand, type CreateBrandInput } from './create-brand';

export { updateBrand, type UpdateBrandInput } from './update-brand';

export { deleteBrand, type DeleteBrandInput } from './delete-brand';

// =============================================================================
// Chat Operations
// =============================================================================

export {
  appendChatMessage,
  type AppendChatMessageInput,
} from './append-chat-message';
