import { oc } from '@orpc/contract';
import { Schema } from 'effect';
import {
  CreateBrandSchema,
  UpdateBrandFields,
  BrandOutputSchema,
  BrandListItemOutputSchema,
  BrandIdSchema,
} from '@repo/db/schema';

// Helper to convert Effect Schema to Standard Schema for oRPC
const std = Schema.standardSchemaV1;

// Helper for query params that may come in as strings
const CoerceNumber = Schema.Union(
  Schema.Number,
  Schema.String.pipe(
    Schema.transform(Schema.Number, { decode: Number, encode: String }),
  ),
).pipe(Schema.compose(Schema.Number));

const brandErrors = {
  BRAND_NOT_FOUND: {
    status: 404,
    data: std(
      Schema.Struct({
        brandId: Schema.String,
      }),
    ),
  },
} as const;

const brandContract = oc
  .prefix('/brands')
  .tag('brand')
  .router({
    // List all brands for current user
    list: oc
      .route({
        method: 'GET',
        path: '/',
        summary: 'List brands',
        description: 'Retrieve all brands for the current user',
      })
      .input(
        std(
          Schema.Struct({
            limit: Schema.optional(
              CoerceNumber.pipe(
                Schema.greaterThanOrEqualTo(1),
                Schema.lessThanOrEqualTo(100),
              ),
            ),
            offset: Schema.optional(
              CoerceNumber.pipe(Schema.greaterThanOrEqualTo(0)),
            ),
          }),
        ),
      )
      .output(std(Schema.Array(BrandListItemOutputSchema))),

    // Get a single brand by ID
    get: oc
      .route({
        method: 'GET',
        path: '/{id}',
        summary: 'Get brand',
        description: 'Retrieve a brand by ID',
      })
      .errors(brandErrors)
      .input(std(Schema.Struct({ id: BrandIdSchema })))
      .output(std(BrandOutputSchema)),

    // Create a new brand
    create: oc
      .route({
        method: 'POST',
        path: '/',
        summary: 'Create brand',
        description: 'Create a new brand',
      })
      .errors(brandErrors)
      .input(std(CreateBrandSchema))
      .output(std(BrandOutputSchema)),

    // Update a brand
    update: oc
      .route({
        method: 'PATCH',
        path: '/{id}',
        summary: 'Update brand',
        description: 'Update brand metadata',
      })
      .errors(brandErrors)
      .input(
        std(
          Schema.Struct({
            id: BrandIdSchema,
            ...UpdateBrandFields,
          }),
        ),
      )
      .output(std(BrandOutputSchema)),

    // Delete a brand
    delete: oc
      .route({
        method: 'DELETE',
        path: '/{id}',
        summary: 'Delete brand',
        description: 'Permanently delete a brand',
      })
      .errors(brandErrors)
      .input(std(Schema.Struct({ id: BrandIdSchema })))
      .output(std(Schema.Struct({}))),
  });

export default brandContract;
