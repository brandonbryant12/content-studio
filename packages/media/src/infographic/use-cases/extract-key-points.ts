import { Effect, Schema } from 'effect';
import { LLM } from '@repo/ai/llm';
import { InfographicRepo } from '../repos';
import { DocumentRepo, getDocumentContent } from '../../document';
import { NotInfographicOwner, DocumentNotFound } from '../../errors';
import {
  getInfographicTypeInfo,
  isValidInfographicType,
  type InfographicType,
} from '../prompts';

// =============================================================================
// Constants
// =============================================================================

/** Maximum number of suggestions to return */
const MAX_SUGGESTIONS = 10;

// =============================================================================
// Types
// =============================================================================

export interface ExtractKeyPointsInput {
  /** If provided, uses the infographic's linked documents */
  infographicId?: string;
  /** If provided directly, uses these document IDs */
  documentIds?: string[];
  userId: string;
}

export interface KeyPointSuggestion {
  text: string;
  documentId: string;
  relevance: 'high' | 'medium';
}

export interface ExtractKeyPointsResult {
  suggestions: KeyPointSuggestion[];
}

// =============================================================================
// Schema
// =============================================================================

/**
 * Schema for LLM output - key points extracted from documents.
 */
const KeyPointsOutputSchema = Schema.Struct({
  keyPoints: Schema.Array(
    Schema.Struct({
      text: Schema.String.annotations({
        description: 'The key point text, max 500 characters',
      }),
      documentIndex: Schema.Number.annotations({
        description: 'Index of the source document (0-based)',
      }),
      relevance: Schema.Literal('high', 'medium').annotations({
        description:
          'Relevance level: high for critical points, medium for supporting details',
      }),
    }),
  ).annotations({
    description: 'List of key points extracted from the documents',
  }),
});

// =============================================================================
// Prompt
// =============================================================================

const EXTRACTION_SYSTEM_PROMPT = `You are an expert at identifying key information for infographics.

Your task is to extract the most important and visually representable points from the provided documents.

Guidelines:
- Focus on facts, statistics, comparisons, timelines, and processes
- Each key point should be concise (under 500 characters) and self-contained
- Prioritize information that can be visualized effectively
- Mark points as "high" relevance if they are essential to understanding the topic
- Mark points as "medium" relevance if they provide supporting context
- Extract at most 10 key points total
- Ensure each point references the correct source document`;

const buildExtractionPrompt = (
  documents: Array<{ id: string; title: string; content: string }>,
  infographicType?: string,
): string => {
  const docSection = documents
    .map(
      (doc, index) =>
        `## Document ${index} - ${doc.title}\n\n${doc.content.slice(0, 10000)}`,
    )
    .join('\n\n---\n\n');

  let typeGuidance = '';
  if (infographicType && isValidInfographicType(infographicType)) {
    const typeInfo = getInfographicTypeInfo(infographicType as InfographicType);
    if (typeInfo) {
      typeGuidance = `\n\nThe user wants to create a "${typeInfo.name}" infographic. ${typeInfo.description}\nFocus on extracting points that work well for this type of visualization.`;
    }
  }

  return `Extract key points from the following documents for an infographic.${typeGuidance}

${docSection}

Return the most important and visualizable points.`;
};

// =============================================================================
// Use Case
// =============================================================================

/**
 * Extract key points from documents using AI.
 *
 * This use case:
 * 1. Validates ownership of infographic (if provided) or documents
 * 2. Fetches document content
 * 3. Calls LLM to extract key points
 * 4. Returns structured suggestions with relevance
 */
export const extractKeyPoints = (input: ExtractKeyPointsInput) =>
  Effect.gen(function* () {
    const infographicRepo = yield* InfographicRepo;
    const documentRepo = yield* DocumentRepo;
    const llm = yield* LLM;

    // Determine which documents to use
    let documentIds: string[];
    let infographicType: string | undefined;

    if (input.infographicId) {
      // Use infographic's linked documents
      const infographic = yield* infographicRepo.findById(input.infographicId);

      if (infographic.createdBy !== input.userId) {
        return yield* Effect.fail(
          new NotInfographicOwner({
            infographicId: input.infographicId,
            userId: input.userId,
          }),
        );
      }

      documentIds = [...(infographic.sourceDocumentIds ?? [])];
      infographicType = infographic.infographicType;
    } else if (input.documentIds && input.documentIds.length > 0) {
      documentIds = input.documentIds;
    } else {
      // No documents specified - return empty result
      return { suggestions: [] };
    }

    // Validate and fetch document content
    const documents: Array<{ id: string; title: string; content: string }> = [];

    for (const docId of documentIds) {
      const doc = yield* documentRepo.findById(docId);

      // Validate ownership
      if (doc.createdBy !== input.userId) {
        return yield* Effect.fail(new DocumentNotFound({ id: docId }));
      }

      const contentResult = yield* getDocumentContent({ id: docId });
      documents.push({
        id: doc.id,
        title: doc.title,
        content: contentResult.content,
      });
    }

    if (documents.length === 0) {
      return { suggestions: [] };
    }

    // Call LLM to extract key points
    const llmResult = yield* llm.generate({
      system: EXTRACTION_SYSTEM_PROMPT,
      prompt: buildExtractionPrompt(documents, infographicType),
      schema: KeyPointsOutputSchema,
      temperature: 0.3, // Lower temperature for more consistent extraction
    });

    // Map results back to document IDs and limit to MAX_SUGGESTIONS
    const suggestions: KeyPointSuggestion[] = llmResult.object.keyPoints
      .slice(0, MAX_SUGGESTIONS)
      .map((kp) => ({
        text: kp.text.slice(0, 500), // Enforce character limit
        documentId: documents[kp.documentIndex]?.id ?? documents[0]!.id,
        relevance: kp.relevance,
      }));

    return { suggestions };
  }).pipe(
    Effect.withSpan('useCase.extractKeyPoints', {
      attributes: {
        'infographic.id': input.infographicId ?? 'none',
        'document.count': input.documentIds?.length ?? 0,
      },
    }),
  );
