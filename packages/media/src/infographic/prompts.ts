import { Effect, Schema } from 'effect';
import type {
  InfographicType,
  InfographicStyle,
  InfographicFormat,
} from '@repo/db/schema';
import { LLM } from '@repo/ai';
import { Storage } from '@repo/storage';
import { DocumentRepo } from '../document/repos';

// =============================================================================
// Types
// =============================================================================

export interface BuildPromptOptions {
  infographicType: InfographicType;
  stylePreset: InfographicStyle;
  format: InfographicFormat;
  /** User's prompt — describes what to create (first gen) or what to change (edit). */
  prompt: string;
  /** Extracted document content to use as data source. */
  documentContent?: string;
  /** When true, a reference image is attached and the prompt is framed as an edit. */
  isEdit?: boolean;
}

export const FORMAT_DIMENSIONS: Record<
  InfographicFormat,
  { width: number; height: number; label: string }
> = {
  portrait: { width: 1080, height: 1920, label: 'Portrait (1080×1920)' },
  square: { width: 1080, height: 1080, label: 'Square (1080×1080)' },
  landscape: { width: 1920, height: 1080, label: 'Landscape (1920×1080)' },
  og_card: { width: 1200, height: 630, label: 'OG Card (1200×630)' },
};

// =============================================================================
// Type Directives
// =============================================================================

const TYPE_DIRECTIVES: Record<InfographicType, string> = {
  timeline:
    'Create an infographic showing a chronological timeline. Arrange events along a visual timeline with dates, descriptions, and icons. Use a clear flow direction.',
  comparison:
    'Create a comparison infographic with items shown side-by-side. Use columns or dividers to separate each item. Include matching categories for easy comparison.',
  stats_dashboard:
    'Create a statistics dashboard infographic. Visualize data using charts, large numbers, and icons. Highlight key metrics prominently.',
  key_takeaways:
    'Create a key takeaways infographic. Present the most important points as a numbered visual list with icons. Use clear hierarchy.',
};

// =============================================================================
// Style Modifiers
// =============================================================================

const STYLE_MODIFIERS: Record<InfographicStyle, string> = {
  modern_minimal:
    'Style: Clean lines, generous whitespace, neutral palette (black, white, gray, one accent color), sans-serif typography.',
  bold_colorful:
    'Style: Vibrant colors, strong contrast, large text, energetic layout, dynamic shapes.',
  corporate:
    'Style: Professional palette (navy, gray, white), structured grid, restrained decoration, clear data presentation.',
  playful:
    'Style: Rounded shapes, bright warm colors, hand-drawn style elements, friendly typography.',
  dark_mode:
    'Style: Dark background, light text, neon/bright accent colors, modern feel.',
  editorial:
    'Style: Magazine-inspired layout, sophisticated typography, muted color palette, elegant spacing.',
};

// =============================================================================
// Prompt Builder
// =============================================================================

export const buildInfographicPrompt = (options: BuildPromptOptions): string => {
  const { isEdit, documentContent, prompt } = options;
  const hasDocs = !!documentContent;
  const parts: string[] = [];

  // ---- Scenario: Edit existing image ----
  if (isEdit) {
    parts.push(
      'The attached image is an existing infographic. Modify it according to the instructions below. Preserve the overall layout, typography, and color scheme unless the instructions say otherwise.',
    );

    parts.push(`Edit instructions: ${prompt}`);

    if (hasDocs) {
      parts.push(
        `Use the following source data to update or add content to the infographic. Replace placeholder or outdated information with these facts:\n\n${documentContent}`,
      );
    }

    // ---- Scenario: First generation ----
  } else {
    parts.push(TYPE_DIRECTIVES[options.infographicType]);

    if (hasDocs) {
      parts.push(
        `The primary content for this infographic comes from the source documents below. Use these facts, statistics, and key points as the data shown in the infographic. The user's prompt describes the desired focus and framing.\n\nSource content:\n${documentContent}`,
      );
      parts.push(`User's direction: ${prompt}`);
    } else {
      parts.push(`User's prompt: ${prompt}`);
    }
  }

  // ---- Style + format (always appended) ----
  parts.push(STYLE_MODIFIERS[options.stylePreset]);

  const dims = FORMAT_DIMENSIONS[options.format];
  parts.push(
    `Generate at ${dims.width}x${dims.height} pixels (${dims.label}). Optimize layout for this aspect ratio.`,
  );

  parts.push(
    'Create a professional, clear, and visually appealing infographic. Ensure all text is legible and the layout is well-organized.',
  );

  return parts.join('\n\n');
};

// =============================================================================
// Document Content Extraction
// =============================================================================

const ExtractedContentSchema = Schema.Struct({
  summary: Schema.String,
  keyPoints: Schema.Array(Schema.String),
  statistics: Schema.Array(
    Schema.Struct({
      label: Schema.String,
      value: Schema.String,
    }),
  ),
});

export type ExtractedContent = typeof ExtractedContentSchema.Type;

const TYPE_EXTRACTION_HINTS: Record<InfographicType, string> = {
  timeline:
    'Focus on chronological events with dates, milestones, and sequential developments.',
  comparison:
    'Focus on comparable items, their differences, pros/cons, and side-by-side attributes.',
  stats_dashboard:
    'Focus on numerical data, percentages, metrics, growth figures, and quantifiable outcomes.',
  key_takeaways:
    'Focus on the most important conclusions, actionable insights, and headline-worthy points.',
};

export const extractDocumentContent = (
  documentIds: string[],
  infographicType?: InfographicType,
) =>
  Effect.gen(function* () {
    const docRepo = yield* DocumentRepo;
    const storage = yield* Storage;
    const llm = yield* LLM;

    const documents = yield* Effect.all(
      documentIds.map((id) => docRepo.findById(id)),
      { concurrency: 'unbounded' },
    );

    const contents = yield* Effect.all(
      documents.map((doc) =>
        storage
          .download(doc.contentKey)
          .pipe(Effect.map((buf) => buf.toString('utf-8'))),
      ),
      { concurrency: 'unbounded' },
    );

    const typeHint = infographicType
      ? `\nThis is for a "${infographicType}" infographic. ${TYPE_EXTRACTION_HINTS[infographicType]}`
      : '';

    const { object } = yield* llm.generate({
      prompt: `Extract the key facts, statistics, and points from these documents for use in an infographic. Be concise and specific — prefer concrete numbers and names over vague summaries.${typeHint}\n\n${contents.join('\n---\n')}`,
      schema: ExtractedContentSchema,
      maxTokens: 1000,
    });

    return object;
  }).pipe(Effect.withSpan('infographic.extractDocumentContent'));

export const formatExtractedContent = (content: ExtractedContent): string => {
  const parts: string[] = [];

  parts.push(`Summary: ${content.summary}`);

  if (content.keyPoints.length > 0) {
    const numbered = content.keyPoints
      .map((p, i) => `${i + 1}. ${p}`)
      .join('\n');
    parts.push(`Key Points:\n${numbered}`);
  }

  if (content.statistics.length > 0) {
    const stats = content.statistics
      .map((s) => `- ${s.label}: ${s.value}`)
      .join('\n');
    parts.push(`Data & Statistics:\n${stats}`);
  }

  return parts.join('\n\n');
};
