/**
 * Brand Domain
 *
 * Provides brand management functionality including CRUD operations
 * and AI chat integration for brand-building conversations.
 */

// =============================================================================
// Repository
// =============================================================================

export { BrandRepo, BrandRepoLive, type BrandRepoService } from './repos';
export type { ListOptions as BrandListOptions } from './repos';

// =============================================================================
// Use Cases
// =============================================================================

export {
  listBrands,
  type ListBrandsInput,
  type ListBrandsResult,
  getBrand,
  type GetBrandInput,
  createBrand,
  type CreateBrandInput,
  updateBrand,
  type UpdateBrandInput,
  deleteBrand,
  type DeleteBrandInput,
  appendChatMessage,
  type AppendChatMessageInput,
} from './use-cases';
