/**
 * Contract Schema Validation Tests
 *
 * These tests ensure runtime schemas and contract inputs accept branded IDs and
 * reject UUID-like values.
 */
import {
  DocumentIdSchema,
  JobIdSchema,
  PodcastIdSchema,
  VoiceoverIdSchema,
  generateDocumentId,
  generateJobId,
  generatePodcastId,
  generateVoiceoverId,
} from '@repo/db/schema';
import { Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { appContract } from '../index';

const UUID = '00000000-0000-0000-0000-000000000000';

const validateSchema = (
  schema: Schema.Schema.AnyNoContext,
  input: unknown,
): boolean => {
  const result = Schema.decodeUnknownEither(schema)(input);
  return result._tag === 'Right';
};

type IdSchemaCase = {
  name: string;
  schema: Schema.Schema.AnyNoContext;
  validIds: string[];
  invalidIds: string[];
};

const idSchemaCases: IdSchemaCase[] = [
  {
    name: 'DocumentIdSchema',
    schema: DocumentIdSchema,
    validIds: [
      'doc_0000000000000000',
      'doc_abcdefghjkmnpqrs',
      generateDocumentId(),
      generateDocumentId(),
    ],
    invalidIds: [
      UUID,
      'pod_0000000000000000',
      'voc_0000000000000000',
      '0000000000000000',
      'doc_short',
      'doc_waytoolongtobevalid123',
    ],
  },
  {
    name: 'PodcastIdSchema',
    schema: PodcastIdSchema,
    validIds: [
      'pod_0000000000000000',
      'pod_abcdefghjkmnpqrs',
      generatePodcastId(),
      generatePodcastId(),
    ],
    invalidIds: [UUID, 'doc_0000000000000000', 'voc_0000000000000000'],
  },
  {
    name: 'VoiceoverIdSchema',
    schema: VoiceoverIdSchema,
    validIds: [
      'voc_0000000000000000',
      'voc_abcdefghjkmnpqrs',
      generateVoiceoverId(),
      generateVoiceoverId(),
    ],
    invalidIds: [UUID, 'doc_0000000000000000', 'pod_0000000000000000'],
  },
  {
    name: 'JobIdSchema',
    schema: JobIdSchema,
    validIds: [
      'job_0000000000000000',
      'job_abcdefghjkmnpqrs',
      generateJobId(),
      generateJobId(),
    ],
    invalidIds: [UUID],
  },
];

describe('ID schema validation', () => {
  it('accepts valid branded IDs for all schemas', () => {
    for (const schemaCase of idSchemaCases) {
      for (const id of schemaCase.validIds) {
        expect(
          validateSchema(schemaCase.schema, id),
          `${schemaCase.name}: expected "${id}" to be valid`,
        ).toBe(true);
      }
    }
  });

  it('rejects invalid IDs for all schemas', () => {
    for (const schemaCase of idSchemaCases) {
      for (const id of schemaCase.invalidIds) {
        expect(
          validateSchema(schemaCase.schema, id),
          `${schemaCase.name}: expected "${id}" to be rejected`,
        ).toBe(false);
      }
    }
  });
});

type StandardValidateResult = { issues?: unknown };
type ContractInputSchema = {
  '~standard'?: {
    validate?: (
      input: unknown,
    ) => Promise<StandardValidateResult> | StandardValidateResult;
  };
};
type ContractWithInputSchema = {
  '~orpc'?: {
    inputSchema?: ContractInputSchema;
  };
};

const validateContractInput = async (
  contract: ContractWithInputSchema,
  input: unknown,
): Promise<boolean> => {
  const validate = contract['~orpc']?.inputSchema?.['~standard']?.validate;
  if (!validate) {
    throw new Error('Contract does not expose a StandardSchema validator');
  }

  const result = await Promise.resolve(validate(input));
  return result.issues === undefined;
};

type ContractCase = {
  name: string;
  contract: ContractWithInputSchema;
  validInput: () => unknown;
  invalidInput: () => unknown;
};

const contractCases: ContractCase[] = [
  {
    name: 'documents.get',
    contract: appContract.documents.get,
    validInput: () => ({ id: generateDocumentId() }),
    invalidInput: () => ({ id: UUID }),
  },
  {
    name: 'documents.getContent',
    contract: appContract.documents.getContent,
    validInput: () => ({ id: generateDocumentId() }),
    invalidInput: () => ({ id: UUID }),
  },
  {
    name: 'documents.update',
    contract: appContract.documents.update,
    validInput: () => ({ id: generateDocumentId(), title: 'Updated title' }),
    invalidInput: () => ({ id: UUID, title: 'Updated title' }),
  },
  {
    name: 'documents.delete',
    contract: appContract.documents.delete,
    validInput: () => ({ id: generateDocumentId() }),
    invalidInput: () => ({ id: UUID }),
  },
  {
    name: 'podcasts.get',
    contract: appContract.podcasts.get,
    validInput: () => ({ id: generatePodcastId() }),
    invalidInput: () => ({ id: UUID }),
  },
  {
    name: 'podcasts.delete',
    contract: appContract.podcasts.delete,
    validInput: () => ({ id: generatePodcastId() }),
    invalidInput: () => ({ id: UUID }),
  },
  {
    name: 'voiceovers.get',
    contract: appContract.voiceovers.get,
    validInput: () => ({ id: generateVoiceoverId() }),
    invalidInput: () => ({ id: UUID }),
  },
  {
    name: 'voiceovers.delete',
    contract: appContract.voiceovers.delete,
    validInput: () => ({ id: generateVoiceoverId() }),
    invalidInput: () => ({ id: UUID }),
  },
];

describe('contract input schema validation', () => {
  it('accepts branded IDs for protected route inputs', async () => {
    for (const contractCase of contractCases) {
      const success = await validateContractInput(
        contractCase.contract,
        contractCase.validInput(),
      );
      expect(success, `${contractCase.name}: expected branded id to pass`).toBe(
        true,
      );
    }
  });

  it('rejects UUID IDs for protected route inputs', async () => {
    for (const contractCase of contractCases) {
      const success = await validateContractInput(
        contractCase.contract,
        contractCase.invalidInput(),
      );
      expect(success, `${contractCase.name}: expected UUID to fail`).toBe(
        false,
      );
    }
  });
});
