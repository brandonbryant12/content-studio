import { getCurrentUser } from '@repo/auth/policy';
import {
  generateInfographicId,
  InfographicStatus,
  type InfographicFormat,
  type SourceId,
  type SourceOutline,
  type StyleProperty,
} from '@repo/db/schema';
import { Effect } from 'effect';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { getSource } from '../../source/use-cases/get-source';
import { getSourceContent } from '../../source/use-cases/get-source-content';
import { InfographicRepo, type InsertInfographic } from '../repos';
import { sanitizeStyleProperties } from '../style-properties';

// =============================================================================
// Types
// =============================================================================

export interface CreateInfographicInput {
  title: string;
  format: InfographicFormat;
  prompt?: string;
  styleProperties?: readonly StyleProperty[];
  sourceId?: SourceId;
}

// =============================================================================
// Use Case
// =============================================================================

const MAX_SOURCE_EXCERPT_CHARS = 1200;
const MAX_OUTLINE_SECTIONS = 5;

const normalizePromptText = (value: string) =>
  value.replace(/\s+/g, ' ').trim();

const truncateAtWordBoundary = (value: string, maxChars: number) => {
  if (value.length <= maxChars) return value;
  const cutoff = value.lastIndexOf(' ', maxChars);
  return value.slice(0, cutoff > 0 ? cutoff : maxChars).trim();
};

const formatOutlineSummary = (outline?: SourceOutline) => {
  const topSections = outline?.sections.slice(0, MAX_OUTLINE_SECTIONS) ?? [];
  if (topSections.length === 0) return null;

  return topSections
    .map((section) => `- ${section.heading}: ${section.summary}`)
    .join('\n');
};

const buildDocumentPrompt = ({
  title,
  content,
  outline,
}: {
  title: string;
  content: string;
  outline?: SourceOutline;
}) => {
  const sectionSummary = formatOutlineSummary(outline);
  const normalizedContent = normalizePromptText(content);
  const excerpt = truncateAtWordBoundary(
    normalizedContent,
    MAX_SOURCE_EXCERPT_CHARS,
  );
  const sourceBlock = sectionSummary
    ? `Key points:\n${sectionSummary}`
    : `Source excerpt:\n${excerpt}`;

  return [
    `Create an infographic that summarizes "${title}".`,
    sourceBlock,
    'Focus on the most important insights, concrete facts, and practical takeaways.',
  ].join('\n\n');
};

export const createInfographic = (input: CreateInfographicInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* InfographicRepo;
    const trimmedPrompt = input.prompt?.trim();
    const explicitPrompt =
      trimmedPrompt && trimmedPrompt.length > 0 ? trimmedPrompt : undefined;

    const sourceId: SourceId | undefined = input.sourceId;
    const sourceEntry = sourceId
      ? yield* getSource({ id: sourceId })
      : undefined;
    const sourceContent = sourceId
      ? (yield* getSourceContent({ id: sourceId })).content
      : undefined;

    const prompt =
      explicitPrompt ??
      (sourceEntry && sourceContent !== undefined
        ? buildDocumentPrompt({
            title: sourceEntry.title,
            content: sourceContent,
            outline: sourceEntry.researchConfig?.outline,
          })
        : undefined);

    const infographic = yield* repo.insert({
      id: generateInfographicId(),
      title: input.title,
      prompt,
      styleProperties: sanitizeStyleProperties(input.styleProperties),
      format: input.format,
      status: InfographicStatus.DRAFT,
      createdBy: user.id,
      ...(sourceId ? { sourceId } : {}),
    } satisfies InsertInfographic);
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: infographic.id,
      attributes: { 'infographic.id': infographic.id },
    });
    return infographic;
  }).pipe(withUseCaseSpan('useCase.createInfographic'));
