/**
 * Contract Schema Validation Tests
 *
 * These tests verify that API contract schemas correctly validate input formats.
 * They catch mismatches between expected ID formats (e.g., doc_*, pod_*) and
 * schema definitions (e.g., accidentally using Schema.UUID instead of branded IDs).
 *
 * Unlike integration tests that call handlers directly (bypassing contract validation),
 * these tests validate the schemas themselves.
 */
import {
  DocumentIdSchema,
  PodcastIdSchema,
  VoiceoverIdSchema,
  JobIdSchema,
  generateDocumentId,
  generatePodcastId,
  generateVoiceoverId,
  generateJobId,
} from '@repo/db/schema';
import { Schema } from 'effect';
import { describe, it, expect } from 'vitest';
import { appContract } from '../index';

// =============================================================================
// Helper to test schema validation
// =============================================================================

const validateSchema = <A, I>(
  schema: Schema.Schema<A, I>,
  input: unknown,
): { success: true; value: A } | { success: false; error: string } => {
  const result = Schema.decodeUnknownEither(schema)(input);
  if (result._tag === 'Right') {
    return { success: true, value: result.right };
  }
  return { success: false, error: String(result.left) };
};

// =============================================================================
// Document ID Schema Tests
// =============================================================================

describe('DocumentIdSchema', () => {
  it('accepts valid document IDs', () => {
    const validIds = [
      'doc_0000000000000000',
      'doc_abcdefghjkmnpqrs',
      generateDocumentId(),
      generateDocumentId(),
    ];

    for (const id of validIds) {
      const result = validateSchema(DocumentIdSchema, id);
      expect(result.success, `Expected "${id}" to be valid`).toBe(true);
    }
  });

  it('rejects UUIDs', () => {
    const uuid = '00000000-0000-0000-0000-000000000000';
    const result = validateSchema(DocumentIdSchema, uuid);
    expect(result.success).toBe(false);
  });

  it('rejects IDs without doc_ prefix', () => {
    const invalidIds = [
      'pod_0000000000000000',
      'voc_0000000000000000',
      '0000000000000000',
    ];

    for (const id of invalidIds) {
      const result = validateSchema(DocumentIdSchema, id);
      expect(result.success, `Expected "${id}" to be rejected`).toBe(false);
    }
  });

  it('rejects IDs with wrong length', () => {
    const invalidIds = ['doc_short', 'doc_waytoolongtobevalid123'];

    for (const id of invalidIds) {
      const result = validateSchema(DocumentIdSchema, id);
      expect(result.success, `Expected "${id}" to be rejected`).toBe(false);
    }
  });
});

// =============================================================================
// Podcast ID Schema Tests
// =============================================================================

describe('PodcastIdSchema', () => {
  it('accepts valid podcast IDs', () => {
    const validIds = [
      'pod_0000000000000000',
      'pod_abcdefghjkmnpqrs',
      generatePodcastId(),
      generatePodcastId(),
    ];

    for (const id of validIds) {
      const result = validateSchema(PodcastIdSchema, id);
      expect(result.success, `Expected "${id}" to be valid`).toBe(true);
    }
  });

  it('rejects UUIDs', () => {
    const uuid = '00000000-0000-0000-0000-000000000000';
    const result = validateSchema(PodcastIdSchema, uuid);
    expect(result.success).toBe(false);
  });

  it('rejects IDs with wrong prefix', () => {
    const invalidIds = ['doc_0000000000000000', 'voc_0000000000000000'];

    for (const id of invalidIds) {
      const result = validateSchema(PodcastIdSchema, id);
      expect(result.success, `Expected "${id}" to be rejected`).toBe(false);
    }
  });
});

// =============================================================================
// Voiceover ID Schema Tests
// =============================================================================

describe('VoiceoverIdSchema', () => {
  it('accepts valid voiceover IDs', () => {
    const validIds = [
      'voc_0000000000000000',
      'voc_abcdefghjkmnpqrs',
      generateVoiceoverId(),
      generateVoiceoverId(),
    ];

    for (const id of validIds) {
      const result = validateSchema(VoiceoverIdSchema, id);
      expect(result.success, `Expected "${id}" to be valid`).toBe(true);
    }
  });

  it('rejects UUIDs', () => {
    const uuid = '00000000-0000-0000-0000-000000000000';
    const result = validateSchema(VoiceoverIdSchema, uuid);
    expect(result.success).toBe(false);
  });

  it('rejects IDs with wrong prefix', () => {
    const invalidIds = ['doc_0000000000000000', 'pod_0000000000000000'];

    for (const id of invalidIds) {
      const result = validateSchema(VoiceoverIdSchema, id);
      expect(result.success, `Expected "${id}" to be rejected`).toBe(false);
    }
  });
});

// =============================================================================
// Job ID Schema Tests
// =============================================================================

describe('JobIdSchema', () => {
  it('accepts valid job IDs', () => {
    const validIds = [
      'job_0000000000000000',
      'job_abcdefghjkmnpqrs',
      generateJobId(),
      generateJobId(),
    ];

    for (const id of validIds) {
      const result = validateSchema(JobIdSchema, id);
      expect(result.success, `Expected "${id}" to be valid`).toBe(true);
    }
  });

  it('rejects UUIDs', () => {
    const uuid = '00000000-0000-0000-0000-000000000000';
    const result = validateSchema(JobIdSchema, uuid);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Contract Input Schema Validation
// =============================================================================
// These tests validate that the API contracts use correct ID schemas.
// They would have caught the bug where Schema.UUID was used instead of
// DocumentIdSchema in the documents contract.

/**
 * Helper to validate input against an oRPC contract's input schema.
 * Extracts the StandardSchema from the contract and validates the input.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const validateContractInput = async (contract: any, input: unknown) => {
  const inputSchema = contract['~orpc']?.inputSchema;
  if (!inputSchema) {
    throw new Error('Contract does not have an inputSchema');
  }

  // StandardSchema v1 uses ~standard property
  const standardSchema = inputSchema['~standard'];
  if (!standardSchema?.validate) {
    throw new Error('inputSchema is not a valid StandardSchema');
  }

  const result = await standardSchema.validate(input);
  return {
    success: result.issues === undefined,
    issues: result.issues,
  };
};

describe('Document Contract Input Schemas', () => {
  const UUID = '00000000-0000-0000-0000-000000000000';
  const validDocId = generateDocumentId();

  describe('documents.get', () => {
    it('accepts valid document IDs', async () => {
      const result = await validateContractInput(appContract.documents.get, {
        id: validDocId,
      });
      expect(result.success).toBe(true);
    });

    it('rejects UUIDs', async () => {
      const result = await validateContractInput(appContract.documents.get, {
        id: UUID,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('documents.getContent', () => {
    it('accepts valid document IDs', async () => {
      const result = await validateContractInput(
        appContract.documents.getContent,
        { id: validDocId },
      );
      expect(result.success).toBe(true);
    });

    it('rejects UUIDs', async () => {
      const result = await validateContractInput(
        appContract.documents.getContent,
        { id: UUID },
      );
      expect(result.success).toBe(false);
    });
  });

  describe('documents.update', () => {
    it('accepts valid document IDs', async () => {
      const result = await validateContractInput(appContract.documents.update, {
        id: validDocId,
        title: 'Updated Title',
      });
      expect(result.success).toBe(true);
    });

    it('rejects UUIDs', async () => {
      const result = await validateContractInput(appContract.documents.update, {
        id: UUID,
        title: 'Updated Title',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('documents.delete', () => {
    it('accepts valid document IDs', async () => {
      const result = await validateContractInput(appContract.documents.delete, {
        id: validDocId,
      });
      expect(result.success).toBe(true);
    });

    it('rejects UUIDs', async () => {
      const result = await validateContractInput(appContract.documents.delete, {
        id: UUID,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Podcast Contract Input Schemas', () => {
  const UUID = '00000000-0000-0000-0000-000000000000';
  const validPodcastId = generatePodcastId();

  describe('podcasts.get', () => {
    it('accepts valid podcast IDs', async () => {
      const result = await validateContractInput(appContract.podcasts.get, {
        id: validPodcastId,
      });
      expect(result.success).toBe(true);
    });

    it('rejects UUIDs', async () => {
      const result = await validateContractInput(appContract.podcasts.get, {
        id: UUID,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('podcasts.delete', () => {
    it('accepts valid podcast IDs', async () => {
      const result = await validateContractInput(appContract.podcasts.delete, {
        id: validPodcastId,
      });
      expect(result.success).toBe(true);
    });

    it('rejects UUIDs', async () => {
      const result = await validateContractInput(appContract.podcasts.delete, {
        id: UUID,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Voiceover Contract Input Schemas', () => {
  const UUID = '00000000-0000-0000-0000-000000000000';
  const validVoiceoverId = generateVoiceoverId();

  describe('voiceovers.get', () => {
    it('accepts valid voiceover IDs', async () => {
      const result = await validateContractInput(appContract.voiceovers.get, {
        id: validVoiceoverId,
      });
      expect(result.success).toBe(true);
    });

    it('rejects UUIDs', async () => {
      const result = await validateContractInput(appContract.voiceovers.get, {
        id: UUID,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('voiceovers.delete', () => {
    it('accepts valid voiceover IDs', async () => {
      const result = await validateContractInput(
        appContract.voiceovers.delete,
        { id: validVoiceoverId },
      );
      expect(result.success).toBe(true);
    });

    it('rejects UUIDs', async () => {
      const result = await validateContractInput(
        appContract.voiceovers.delete,
        { id: UUID },
      );
      expect(result.success).toBe(false);
    });
  });
});
