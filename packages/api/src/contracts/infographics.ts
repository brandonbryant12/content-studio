import { oc } from '@orpc/contract';
import { Schema } from 'effect';
import {
  // Input schemas
  UpdateInfographicFields,
  // Output schemas
  InfographicOutputSchema,
  InfographicListItemOutputSchema,
  InfographicSelectionOutputSchema,
  // Job schemas
  JobOutputSchema,
  JobStatusSchema,
  // Branded ID schemas
  InfographicIdSchema,
  InfographicSelectionIdSchema,
  DocumentIdSchema,
  JobIdSchema,
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

// =============================================================================
// Additional Input Schemas
// =============================================================================

const CreateInfographicInputSchema = Schema.Struct({
  title: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  infographicType: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(50),
  ),
  aspectRatio: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(10)),
  ),
  documentIds: Schema.Array(DocumentIdSchema).pipe(Schema.minItems(1)),
});

const AddSelectionInputSchema = Schema.Struct({
  documentId: DocumentIdSchema,
  selectedText: Schema.String.pipe(Schema.minLength(1)),
  startOffset: Schema.optional(Schema.Number),
  endOffset: Schema.optional(Schema.Number),
});

const UpdateSelectionInputSchema = Schema.Struct({
  selectedText: Schema.optional(Schema.String.pipe(Schema.minLength(1))),
});

const ReorderSelectionsInputSchema = Schema.Struct({
  orderedSelectionIds: Schema.Array(InfographicSelectionIdSchema).pipe(
    Schema.minItems(1),
  ),
});

const GenerateInputSchema = Schema.Struct({
  feedbackInstructions: Schema.optional(Schema.String),
});

// =============================================================================
// Additional Output Schemas
// =============================================================================

/**
 * Full infographic with selections.
 */
const InfographicFullOutputSchema = Schema.Struct({
  ...InfographicOutputSchema.fields,
  selections: Schema.Array(InfographicSelectionOutputSchema),
});

/**
 * Key point suggestion from AI extraction.
 */
const KeyPointSuggestionSchema = Schema.Struct({
  text: Schema.String,
  documentId: DocumentIdSchema,
  documentTitle: Schema.String,
  relevance: Schema.Literal('high', 'medium'),
  category: Schema.optional(Schema.String),
});

/**
 * Result from adding a selection - includes warning if over soft limit.
 */
const AddSelectionResultSchema = Schema.Struct({
  selection: InfographicSelectionOutputSchema,
  warningMessage: Schema.NullOr(Schema.String),
});

/**
 * Paginated list result.
 */
const InfographicListOutputSchema = Schema.Struct({
  items: Schema.Array(InfographicListItemOutputSchema),
  total: Schema.Number,
  limit: Schema.Number,
  offset: Schema.Number,
});

// =============================================================================
// Error Definitions
// =============================================================================

const infographicErrors = {
  INFOGRAPHIC_NOT_FOUND: {
    status: 404,
    data: std(
      Schema.Struct({
        infographicId: Schema.String,
      }),
    ),
  },
  NOT_INFOGRAPHIC_OWNER: {
    status: 403,
    data: std(
      Schema.Struct({
        infographicId: Schema.String,
      }),
    ),
  },
} as const;

const selectionErrors = {
  SELECTION_NOT_FOUND: {
    status: 404,
    data: std(
      Schema.Struct({
        selectionId: Schema.String,
      }),
    ),
  },
  SELECTION_TOO_LONG: {
    status: 400,
    data: std(
      Schema.Struct({
        length: Schema.Number,
        maxLength: Schema.Number,
      }),
    ),
  },
} as const;

const documentErrors = {
  DOCUMENT_NOT_FOUND: {
    status: 404,
    data: std(
      Schema.Struct({
        documentId: Schema.String,
      }),
    ),
  },
} as const;

const generationErrors = {
  INVALID_INFOGRAPHIC_GENERATION: {
    status: 400,
    data: std(
      Schema.Struct({
        infographicId: Schema.String,
        reason: Schema.String,
      }),
    ),
  },
} as const;

const jobErrors = {
  JOB_NOT_FOUND: {
    status: 404,
    data: std(
      Schema.Struct({
        jobId: Schema.String,
      }),
    ),
  },
} as const;

// =============================================================================
// Contract Definition
// =============================================================================

const infographicContract = oc
  .prefix('/infographics')
  .tag('infographic')
  .router({
    // =========================================================================
    // CRUD Operations
    // =========================================================================

    // List all infographics for current user
    list: oc
      .route({
        method: 'GET',
        path: '/',
        summary: 'List infographics',
        description: 'Retrieve all infographics for the current user',
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
      .output(std(InfographicListOutputSchema)),

    // Get a single infographic by ID with selections
    get: oc
      .route({
        method: 'GET',
        path: '/{id}',
        summary: 'Get infographic',
        description: 'Retrieve an infographic with its selections',
      })
      .errors(infographicErrors)
      .input(std(Schema.Struct({ id: InfographicIdSchema })))
      .output(std(InfographicFullOutputSchema)),

    // Create a new infographic
    create: oc
      .route({
        method: 'POST',
        path: '/',
        summary: 'Create infographic',
        description: 'Create a new infographic with source documents',
      })
      .errors({ ...documentErrors })
      .input(std(CreateInfographicInputSchema))
      .output(std(InfographicFullOutputSchema)),

    // Update an infographic
    update: oc
      .route({
        method: 'PATCH',
        path: '/{id}',
        summary: 'Update infographic',
        description: 'Update infographic settings',
      })
      .errors(infographicErrors)
      .input(
        std(
          Schema.Struct({
            id: InfographicIdSchema,
            ...UpdateInfographicFields,
            documentIds: Schema.optional(
              Schema.Array(DocumentIdSchema).pipe(Schema.minItems(1)),
            ),
          }),
        ),
      )
      .output(std(InfographicOutputSchema)),

    // Delete an infographic
    delete: oc
      .route({
        method: 'DELETE',
        path: '/{id}',
        summary: 'Delete infographic',
        description: 'Permanently delete an infographic',
      })
      .errors(infographicErrors)
      .input(std(Schema.Struct({ id: InfographicIdSchema })))
      .output(std(Schema.Struct({}))),

    // =========================================================================
    // Selection Management
    // =========================================================================

    // Add a selection to an infographic
    addSelection: oc
      .route({
        method: 'POST',
        path: '/{id}/selections',
        summary: 'Add selection',
        description: 'Add a text selection from a document to the infographic',
      })
      .errors({
        ...infographicErrors,
        ...documentErrors,
        ...selectionErrors,
      })
      .input(
        std(
          Schema.Struct({
            id: InfographicIdSchema,
            ...AddSelectionInputSchema.fields,
          }),
        ),
      )
      .output(std(AddSelectionResultSchema)),

    // Remove a selection from an infographic
    removeSelection: oc
      .route({
        method: 'DELETE',
        path: '/{id}/selections/{selectionId}',
        summary: 'Remove selection',
        description: 'Remove a text selection from the infographic',
      })
      .errors({ ...infographicErrors, ...selectionErrors })
      .input(
        std(
          Schema.Struct({
            id: InfographicIdSchema,
            selectionId: InfographicSelectionIdSchema,
          }),
        ),
      )
      .output(std(Schema.Struct({}))),

    // Update a selection
    updateSelection: oc
      .route({
        method: 'PATCH',
        path: '/{id}/selections/{selectionId}',
        summary: 'Update selection',
        description: 'Update a text selection',
      })
      .errors({
        ...infographicErrors,
        ...selectionErrors,
      })
      .input(
        std(
          Schema.Struct({
            id: InfographicIdSchema,
            selectionId: InfographicSelectionIdSchema,
            ...UpdateSelectionInputSchema.fields,
          }),
        ),
      )
      .output(
        std(Schema.Struct({ selection: InfographicSelectionOutputSchema })),
      ),

    // Reorder selections
    reorderSelections: oc
      .route({
        method: 'POST',
        path: '/{id}/selections/reorder',
        summary: 'Reorder selections',
        description: 'Reorder text selections by providing new order',
      })
      .errors(infographicErrors)
      .input(
        std(
          Schema.Struct({
            id: InfographicIdSchema,
            ...ReorderSelectionsInputSchema.fields,
          }),
        ),
      )
      .output(
        std(
          Schema.Struct({
            selections: Schema.Array(InfographicSelectionOutputSchema),
          }),
        ),
      ),

    // =========================================================================
    // AI Extraction
    // =========================================================================

    // Extract key points using AI
    extractKeyPoints: oc
      .route({
        method: 'POST',
        path: '/{id}/extract-key-points',
        summary: 'Extract key points',
        description:
          'Use AI to extract key points from linked documents for the infographic',
      })
      .errors(infographicErrors)
      .input(std(Schema.Struct({ id: InfographicIdSchema })))
      .output(
        std(
          Schema.Struct({
            suggestions: Schema.Array(KeyPointSuggestionSchema),
          }),
        ),
      ),

    // =========================================================================
    // Generation
    // =========================================================================

    // Start infographic generation
    generate: oc
      .route({
        method: 'POST',
        path: '/{id}/generate',
        summary: 'Generate infographic',
        description:
          'Start infographic image generation. Returns a job ID to poll for status.',
      })
      .errors({ ...infographicErrors, ...generationErrors, ...jobErrors })
      .input(
        std(
          Schema.Struct({
            id: InfographicIdSchema,
            ...GenerateInputSchema.fields,
          }),
        ),
      )
      .output(
        std(
          Schema.Struct({
            jobId: JobIdSchema,
            status: JobStatusSchema,
          }),
        ),
      ),

    // Get job status
    getJob: oc
      .route({
        method: 'GET',
        path: '/jobs/{jobId}',
        summary: 'Get job status',
        description: 'Get the status of an infographic generation job',
      })
      .errors(jobErrors)
      .input(std(Schema.Struct({ jobId: JobIdSchema })))
      .output(std(JobOutputSchema)),
  });

export default infographicContract;
