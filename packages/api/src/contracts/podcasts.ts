import { oc } from '@orpc/contract';
import {
  CreatePodcastSchema,
  UpdatePodcastSchema,
  UpdateScriptSchema,
  DocumentOutputSchema,
} from '@repo/db/schema';
import * as v from 'valibot';

// Helper for query params that may come in as strings
const coerceNumber = v.pipe(
  v.union([v.number(), v.pipe(v.string(), v.transform(Number))]),
  v.number(),
);

const podcastErrors = {
  PODCAST_NOT_FOUND: {
    status: 404,
    data: v.object({
      podcastId: v.string(),
    }),
  },
  SCRIPT_NOT_FOUND: {
    status: 404,
    data: v.object({
      podcastId: v.string(),
    }),
  },
  DOCUMENT_NOT_FOUND: {
    status: 404,
    data: v.object({
      documentId: v.string(),
    }),
  },
  MEDIA_NOT_FOUND: {
    status: 404,
    data: v.object({
      mediaType: v.string(),
      mediaId: v.string(),
    }),
  },
} as const;

const jobErrors = {
  JOB_NOT_FOUND: {
    status: 404,
    data: v.object({
      jobId: v.string(),
    }),
  },
} as const;

// Output schemas
const podcastOutputSchema = v.object({
  id: v.string(),
  title: v.string(),
  description: v.nullable(v.string()),
  format: v.picklist(['voice_over', 'conversation']),
  status: v.picklist([
    'draft',
    'generating_script',
    'script_ready',
    'generating_audio',
    'ready',
    'failed',
  ]),
  hostVoice: v.nullable(v.string()),
  hostVoiceName: v.nullable(v.string()),
  coHostVoice: v.nullable(v.string()),
  coHostVoiceName: v.nullable(v.string()),
  promptInstructions: v.nullable(v.string()),
  targetDurationMinutes: v.nullable(v.number()),
  audioUrl: v.nullable(v.string()),
  duration: v.nullable(v.number()),
  errorMessage: v.nullable(v.string()),
  tags: v.array(v.string()),
  sourceDocumentIds: v.array(v.string()),
  publishStatus: v.picklist(['draft', 'ready', 'published', 'rejected']),
  publishedAt: v.nullable(v.string()),
  publishedBy: v.nullable(v.string()),
  createdBy: v.string(),
  createdAt: v.string(),
  updatedAt: v.string(),
});

const scriptSegmentSchema = v.object({
  speaker: v.string(),
  line: v.string(),
  index: v.number(),
});

const podcastScriptSchema = v.object({
  id: v.string(),
  podcastId: v.string(),
  version: v.number(),
  isActive: v.boolean(),
  segments: v.array(scriptSegmentSchema),
  summary: v.nullable(v.string()),
  generationPrompt: v.nullable(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
});

const podcastFullSchema = v.object({
  ...podcastOutputSchema.entries,
  documents: v.array(DocumentOutputSchema),
  script: v.nullable(podcastScriptSchema),
});

const jobStatusSchema = v.picklist([
  'pending',
  'processing',
  'completed',
  'failed',
]);

// Job result schemas - matches queue result types
const generatePodcastResultSchema = v.object({
  scriptId: v.string(),
  segmentCount: v.number(),
  audioUrl: v.string(),
  duration: v.number(),
});

const generateScriptResultSchema = v.object({
  scriptId: v.string(),
  segmentCount: v.number(),
});

const generateAudioResultSchema = v.object({
  audioUrl: v.string(),
  duration: v.number(),
});

// Union of all possible job results
const jobResultSchema = v.union([
  generatePodcastResultSchema,
  generateScriptResultSchema,
  generateAudioResultSchema,
]);

const jobOutputSchema = v.object({
  id: v.string(),
  type: v.string(),
  status: jobStatusSchema,
  result: v.nullable(jobResultSchema),
  error: v.nullable(v.string()),
  createdBy: v.string(),
  createdAt: v.string(),
  updatedAt: v.string(),
  startedAt: v.nullable(v.string()),
  completedAt: v.nullable(v.string()),
});

const podcastContract = oc
  .prefix('/podcasts')
  .tag('podcast')
  .router({
    // List all podcasts for current user
    list: oc
      .route({
        method: 'GET',
        path: '/',
        summary: 'List podcasts',
        description: 'Retrieve all podcasts for the current user',
      })
      .input(
        v.object({
          limit: v.optional(
            v.pipe(coerceNumber, v.minValue(1), v.maxValue(100)),
          ),
          offset: v.optional(v.pipe(coerceNumber, v.minValue(0))),
          status: v.optional(
            v.picklist([
              'draft',
              'generating_script',
              'script_ready',
              'generating_audio',
              'ready',
              'failed',
            ]),
          ),
        }),
      )
      .output(v.array(podcastOutputSchema)),

    // Get a single podcast by ID
    get: oc
      .route({
        method: 'GET',
        path: '/{id}',
        summary: 'Get podcast',
        description: 'Retrieve a podcast with its documents and script',
      })
      .errors(podcastErrors)
      .input(v.object({ id: v.pipe(v.string(), v.uuid()) }))
      .output(podcastFullSchema),

    // Create a new podcast
    create: oc
      .route({
        method: 'POST',
        path: '/',
        summary: 'Create podcast',
        description: 'Create a new podcast from documents',
      })
      .errors(podcastErrors)
      .input(CreatePodcastSchema)
      .output(podcastFullSchema),

    // Update a podcast
    update: oc
      .route({
        method: 'PATCH',
        path: '/{id}',
        summary: 'Update podcast',
        description: 'Update podcast settings',
      })
      .errors(podcastErrors)
      .input(
        v.object({
          id: v.pipe(v.string(), v.uuid()),
          ...UpdatePodcastSchema.entries,
        }),
      )
      .output(podcastOutputSchema),

    // Delete a podcast
    delete: oc
      .route({
        method: 'DELETE',
        path: '/{id}',
        summary: 'Delete podcast',
        description: 'Permanently delete a podcast and all associated data',
      })
      .errors(podcastErrors)
      .input(v.object({ id: v.pipe(v.string(), v.uuid()) }))
      .output(v.object({})),

    // Get podcast script
    getScript: oc
      .route({
        method: 'GET',
        path: '/{id}/script',
        summary: 'Get script',
        description: 'Get the active script for a podcast',
      })
      .errors(podcastErrors)
      .input(v.object({ id: v.pipe(v.string(), v.uuid()) }))
      .output(podcastScriptSchema),

    // Update podcast script
    updateScript: oc
      .route({
        method: 'PUT',
        path: '/{id}/script',
        summary: 'Update script',
        description: 'Update the script segments (creates a new version)',
      })
      .errors(podcastErrors)
      .input(
        v.object({
          id: v.pipe(v.string(), v.uuid()),
          ...UpdateScriptSchema.entries,
        }),
      )
      .output(podcastScriptSchema),

    // Trigger full podcast generation (script + audio in one job)
    generate: oc
      .route({
        method: 'POST',
        path: '/{id}/generate',
        summary: 'Generate podcast',
        description:
          'Generate complete podcast (script + audio) in a single async job. Returns a job ID to poll for status.',
      })
      .errors({ ...podcastErrors, ...jobErrors })
      .input(
        v.object({
          id: v.pipe(v.string(), v.uuid()),
          promptInstructions: v.optional(v.string()),
        }),
      )
      .output(
        v.object({
          jobId: v.string(),
          status: jobStatusSchema,
        }),
      ),

    // Trigger script-only generation (Phase 1)
    generateScript: oc
      .route({
        method: 'POST',
        path: '/{id}/generate-script',
        summary: 'Generate script only',
        description:
          'Generate podcast script without audio. Stops at script_ready status. Use this to preview/edit script before generating audio.',
      })
      .errors({ ...podcastErrors, ...jobErrors })
      .input(
        v.object({
          id: v.pipe(v.string(), v.uuid()),
          promptInstructions: v.optional(v.string()),
        }),
      )
      .output(
        v.object({
          jobId: v.string(),
          status: jobStatusSchema,
        }),
      ),

    // Trigger audio generation from existing script (Phase 2)
    generateAudio: oc
      .route({
        method: 'POST',
        path: '/{id}/generate-audio',
        summary: 'Generate audio from script',
        description:
          'Generate audio from an existing approved script. Podcast must be in script_ready status.',
      })
      .errors({ ...podcastErrors, ...jobErrors })
      .input(
        v.object({
          id: v.pipe(v.string(), v.uuid()),
        }),
      )
      .output(
        v.object({
          jobId: v.string(),
          status: jobStatusSchema,
        }),
      ),

    // Get job status
    getJob: oc
      .route({
        method: 'GET',
        path: '/jobs/{jobId}',
        summary: 'Get job status',
        description: 'Get the status of a generation job',
      })
      .errors(jobErrors)
      .input(v.object({ jobId: v.pipe(v.string(), v.uuid()) }))
      .output(jobOutputSchema),

    // List script versions
    listScriptVersions: oc
      .route({
        method: 'GET',
        path: '/{id}/scripts',
        summary: 'List script versions',
        description:
          'List all script versions for a podcast (for version history)',
      })
      .errors(podcastErrors)
      .input(v.object({ id: v.pipe(v.string(), v.uuid()) }))
      .output(
        v.array(
          v.object({
            id: v.string(),
            version: v.number(),
            isActive: v.boolean(),
            segmentCount: v.number(),
            createdAt: v.string(),
          }),
        ),
      ),

    // Restore script version
    restoreScriptVersion: oc
      .route({
        method: 'POST',
        path: '/{id}/scripts/{scriptId}/restore',
        summary: 'Restore script version',
        description:
          'Restore a previous script version (creates a new version)',
      })
      .errors(podcastErrors)
      .input(
        v.object({
          id: v.pipe(v.string(), v.uuid()),
          scriptId: v.pipe(v.string(), v.uuid()),
        }),
      )
      .output(podcastScriptSchema),
  });

export default podcastContract;
