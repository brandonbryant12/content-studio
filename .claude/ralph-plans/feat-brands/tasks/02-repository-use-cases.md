# Task 02: Brand Repository & Use Cases

## Standards Checklist

Before starting implementation, read and understand:
- [x] `standards/patterns/use-case.md`
- [x] `standards/patterns/error-handling.md`
- [x] `standards/patterns/repository.md`

## Context

Create the brand repository and use cases following the established Effect patterns. The repository handles database operations while use cases implement business logic with ownership checks.

Reference files:
- `packages/media/src/podcast/repos/podcast-repo.ts` - Repository pattern
- `packages/media/src/podcast/use-cases/` - Use case patterns
- `packages/media/src/errors.ts` - Error type patterns

## Key Files

- `packages/media/src/brand/repos/brand-repo.ts` - NEW
- `packages/media/src/brand/use-cases/create-brand.ts` - NEW
- `packages/media/src/brand/use-cases/get-brand.ts` - NEW
- `packages/media/src/brand/use-cases/update-brand.ts` - NEW
- `packages/media/src/brand/use-cases/delete-brand.ts` - NEW
- `packages/media/src/brand/use-cases/append-chat-message.ts` - NEW
- `packages/media/src/brand/errors.ts` - NEW
- `packages/media/src/brand/index.ts` - NEW

## Implementation Details

### Error Types
```typescript
export class BrandNotFound extends Schema.TaggedError<BrandNotFound>()('BrandNotFound', {
  id: Schema.String,
  message: Schema.optional(Schema.String),
}) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'BRAND_NOT_FOUND' as const;
  static readonly httpMessage = (e: BrandNotFound) => e.message ?? `Brand ${e.id} not found`;
  static readonly logLevel = 'silent' as const;
}

export class NotBrandOwner extends Schema.TaggedError<NotBrandOwner>()('NotBrandOwner', {
  brandId: Schema.String,
  userId: Schema.String,
}) {
  static readonly httpStatus = 403 as const;
  static readonly httpCode = 'NOT_BRAND_OWNER' as const;
  static readonly httpMessage = 'Only the brand owner can perform this action';
  static readonly logLevel = 'silent' as const;
}
```

### Repository Interface
```typescript
export interface BrandRepo {
  readonly findById: (id: BrandId) => Effect.Effect<Brand, BrandNotFound>;
  readonly list: (userId: string) => Effect.Effect<Brand[]>;
  readonly insert: (data: CreateBrand & { createdBy: string }) => Effect.Effect<Brand>;
  readonly update: (id: BrandId, data: UpdateBrand) => Effect.Effect<Brand, BrandNotFound>;
  readonly delete: (id: BrandId) => Effect.Effect<void, BrandNotFound>;
  readonly appendChatMessage: (id: BrandId, message: BrandChatMessage) => Effect.Effect<void, BrandNotFound>;
}
```

### Use Case Pattern
```typescript
export const getBrand = (input: { brandId: string }) =>
  Effect.gen(function* () {
    const repo = yield* BrandRepo;
    const user = yield* getCurrentUser;

    const brand = yield* repo.findById(input.brandId as BrandId);

    if (brand.createdBy !== user.id) {
      return yield* Effect.fail(new NotBrandOwner({ brandId: input.brandId, userId: user.id }));
    }

    return brand;
  }).pipe(
    Effect.withSpan('useCase.getBrand', { attributes: { 'brand.id': input.brandId } })
  );
```

### Chat Message Append (manages last 30)
```typescript
export const appendChatMessage = (input: { brandId: string; message: AppendChatMessage }) =>
  Effect.gen(function* () {
    const repo = yield* BrandRepo;
    const user = yield* getCurrentUser;

    const brand = yield* repo.findById(input.brandId as BrandId);
    if (brand.createdBy !== user.id) {
      return yield* Effect.fail(new NotBrandOwner({ brandId: input.brandId, userId: user.id }));
    }

    const newMessage: BrandChatMessage = {
      ...input.message,
      timestamp: new Date().toISOString(),
    };

    // Keep only last 30 messages
    const messages = [...(brand.chatMessages ?? []), newMessage].slice(-30);

    yield* repo.update(input.brandId as BrandId, { chatMessages: messages });
  });
```

## Implementation Notes

- Added `BrandNotFound` and `NotBrandOwner` error types to `packages/media/src/errors.ts`
- Created `BrandRepo` at `packages/media/src/brand/repos/brand-repo.ts` with:
  - Full CRUD operations: insert, findById, list, update, delete, count
  - Extended `BrandUpdateData` type to support chatMessages updates
  - Proper readonly array → mutable array conversion for Drizzle
- Created use cases in `packages/media/src/brand/use-cases/`:
  - `create-brand.ts` - Creates brand with current user as owner
  - `get-brand.ts` - Gets brand with ownership check using `requireOwnership`
  - `update-brand.ts` - Updates brand with ownership check
  - `delete-brand.ts` - Deletes brand with ownership check
  - `list-brands.ts` - Lists brands with pagination and admin role support
  - `append-chat-message.ts` - Appends message, keeps last 30, uses `BrandUpdateData`
- Use cases use `requireOwnership` from `@repo/auth/policy` instead of manual NotBrandOwner errors (simpler, reuses ForbiddenError)
- Created domain index at `packages/media/src/brand/index.ts`

## Verification Log

```
✅ pnpm --filter @repo/media typecheck - PASS
✅ pnpm typecheck - PASS
✅ pnpm build - PASS
✅ pnpm test - PASS
```
