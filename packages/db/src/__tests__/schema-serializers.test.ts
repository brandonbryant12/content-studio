import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import type { DocumentId } from '../schemas/brands';
import type { PodcastId } from '../schemas/brands';
import type { VoiceoverId } from '../schemas/brands';
import type { InfographicId, InfographicVersionId } from '../schemas/brands';
import type { JobId } from '../schemas/brands';
import type { ActivityLogId } from '../schemas/brands';
import type { SlideDeckId, SlideDeckVersionId } from '../schemas/brands';
import {
  serializeActivityLog,
  serializeActivityLogEffect,
  type ActivityLogWithUser,
} from '../schemas/activity-log';
import {
  serializeDocument,
  serializeDocumentEffect,
  serializeDocumentsEffect,
  type Document,
} from '../schemas/documents';
import {
  serializeInfographic,
  serializeInfographicEffect,
  serializeInfographicVersion,
  type Infographic,
  type InfographicVersion,
} from '../schemas/infographics';
import { serializeJob, serializeJobEffect, type Job } from '../schemas/jobs';
import {
  serializePodcast,
  serializePodcastEffect,
  serializePodcastFull,
  serializePodcastListItem,
  type Podcast,
} from '../schemas/podcasts';
import {
  serializeSlideDeck,
  serializeSlideDeckEffect,
  serializeSlideDeckVersion,
  serializeSlideDeckVersionsEffect,
  type SlideDeck,
  type SlideDeckVersion,
} from '../schemas/slide-decks';
import {
  serializeVoiceover,
  serializeVoiceoverEffect,
  serializeVoiceoverListItem,
  type Voiceover,
} from '../schemas/voiceovers';

// =============================================================================
// Test Fixtures
// =============================================================================

const now = new Date('2024-06-15T12:00:00Z');
const later = new Date('2024-06-15T13:00:00Z');

const makeDocument = (overrides?: Partial<Document>): Document => ({
  id: 'doc_0123456789abcdef' as DocumentId,
  title: 'Test Document',
  contentKey: 'documents/test.txt',
  mimeType: 'text/plain',
  wordCount: 100,
  source: 'manual',
  originalFileName: null,
  originalFileSize: null,
  metadata: null,
  status: 'ready',
  errorMessage: null,
  sourceUrl: null,
  researchConfig: null,
  jobId: null,
  extractedText: null,
  contentHash: null,
  createdBy: 'user-1',
  createdAt: now,
  updatedAt: later,
  ...overrides,
});

const makePodcast = (overrides?: Partial<Podcast>): Podcast => ({
  id: 'pod_0123456789abcdef' as PodcastId,
  title: 'Test Podcast',
  description: null,
  format: 'conversation',
  hostVoice: null,
  hostVoiceName: null,
  coHostVoice: null,
  coHostVoiceName: null,
  promptInstructions: null,
  targetDurationMinutes: 5,
  tags: ['tech'],
  sourceDocumentIds: ['doc_0123456789abcdef' as DocumentId],
  generationContext: null,
  status: 'drafting',
  segments: null,
  summary: null,
  generationPrompt: null,
  audioUrl: null,
  duration: null,
  errorMessage: null,
  hostPersonaId: null,
  coHostPersonaId: null,
  coverImageStorageKey: null,
  approvedBy: null,
  approvedAt: null,
  createdBy: 'user-1',
  createdAt: now,
  updatedAt: later,
  ...overrides,
});

const makeVoiceover = (overrides?: Partial<Voiceover>): Voiceover => ({
  id: 'voc_0123456789abcdef' as VoiceoverId,
  title: 'Test Voiceover',
  text: 'Hello world',
  voice: 'Charon',
  voiceName: null,
  audioUrl: null,
  duration: null,
  status: 'drafting',
  errorMessage: null,
  approvedBy: null,
  approvedAt: null,
  createdBy: 'user-1',
  createdAt: now,
  updatedAt: later,
  ...overrides,
});

const makeInfographic = (overrides?: Partial<Infographic>): Infographic => ({
  id: 'inf_0123456789abcdef' as InfographicId,
  title: 'Test Infographic',
  prompt: null,
  styleProperties: [],
  format: 'portrait',
  imageStorageKey: null,
  thumbnailStorageKey: null,
  status: 'draft',
  errorMessage: null,
  approvedBy: null,
  approvedAt: null,
  createdBy: 'user-1',
  createdAt: now,
  updatedAt: later,
  ...overrides,
});

const makeInfographicVersion = (
  overrides?: Partial<InfographicVersion>,
): InfographicVersion => ({
  id: 'inv_0123456789abcdef' as InfographicVersionId,
  infographicId: 'inf_0123456789abcdef' as InfographicId,
  versionNumber: 1,
  prompt: null,
  styleProperties: [],
  format: 'portrait',
  imageStorageKey: 'infographics/v1.png',
  thumbnailStorageKey: null,
  createdAt: now,
  ...overrides,
});

const makeSlideDeck = (overrides?: Partial<SlideDeck>): SlideDeck => ({
  id: 'sld_0123456789abcdef' as SlideDeckId,
  title: 'Test Slide Deck',
  prompt: null,
  sourceDocumentIds: ['doc_0123456789abcdef' as DocumentId],
  theme: 'executive',
  slides: [
    {
      id: 'slide-1',
      title: 'Overview',
      body: 'Summary',
      bullets: ['Point A', 'Point B'],
      layout: 'title_bullets',
    },
  ],
  generatedHtml: '<html></html>',
  status: 'ready',
  errorMessage: null,
  createdBy: 'user-1',
  createdAt: now,
  updatedAt: later,
  ...overrides,
});

const makeSlideDeckVersion = (
  overrides?: Partial<SlideDeckVersion>,
): SlideDeckVersion => ({
  id: 'sldv_0123456789abcdef' as SlideDeckVersionId,
  slideDeckId: 'sld_0123456789abcdef' as SlideDeckId,
  versionNumber: 1,
  prompt: null,
  sourceDocumentIds: ['doc_0123456789abcdef' as DocumentId],
  theme: 'executive',
  slides: [
    {
      id: 'slide-1',
      title: 'Overview',
      bullets: ['Point A'],
      layout: 'title_bullets',
    },
  ],
  generatedHtml: '<html>v1</html>',
  createdAt: now,
  ...overrides,
});

const makeJob = (overrides?: Partial<Job>): Job => ({
  id: 'job_0123456789abcdef' as JobId,
  type: 'generate-podcast',
  status: 'pending',
  payload: { podcastId: 'pod_123' },
  result: null,
  error: null,
  createdBy: 'user-1',
  createdAt: now,
  updatedAt: later,
  startedAt: null,
  completedAt: null,
  ...overrides,
});

const makeActivityLog = (
  overrides?: Partial<ActivityLogWithUser>,
): ActivityLogWithUser => ({
  id: 'act_0123456789abcdef' as ActivityLogId,
  userId: 'user-1',
  userName: 'Test User',
  action: 'created',
  entityType: 'document',
  entityId: 'doc_123',
  entityTitle: 'My Doc',
  metadata: null,
  createdAt: now,
  ...overrides,
});

// =============================================================================
// Document Serializers
// =============================================================================

describe('document serializers', () => {
  describe('serializeDocument (sync)', () => {
    it('converts dates to ISO strings', () => {
      const result = serializeDocument(makeDocument());
      expect(result.createdAt).toBe('2024-06-15T12:00:00.000Z');
      expect(result.updatedAt).toBe('2024-06-15T13:00:00.000Z');
    });

    it('preserves all fields', () => {
      const doc = makeDocument({
        originalFileName: 'test.txt',
        originalFileSize: 1024,
        metadata: { key: 'value' },
      });
      const result = serializeDocument(doc);
      expect(result.id).toBe(doc.id);
      expect(result.title).toBe('Test Document');
      expect(result.contentKey).toBe('documents/test.txt');
      expect(result.mimeType).toBe('text/plain');
      expect(result.wordCount).toBe(100);
      expect(result.source).toBe('manual');
      expect(result.originalFileName).toBe('test.txt');
      expect(result.originalFileSize).toBe(1024);
      expect(result.metadata).toEqual({ key: 'value' });
      expect(result.createdBy).toBe('user-1');
    });
  });

  describe('serializeDocumentEffect', () => {
    it('serializes document via Effect', async () => {
      const result = await Effect.runPromise(
        serializeDocumentEffect(makeDocument()),
      );
      expect(result.id).toBe('doc_0123456789abcdef');
      expect(result.createdAt).toBe(now.toISOString());
    });
  });

  describe('serializeDocumentsEffect (batch)', () => {
    it('serializes multiple documents', async () => {
      const docs = [makeDocument(), makeDocument({ title: 'Second' })];
      const results = await Effect.runPromise(serializeDocumentsEffect(docs));
      expect(results).toHaveLength(2);
    });
  });
});

// =============================================================================
// Podcast Serializers
// =============================================================================

describe('podcast serializers', () => {
  describe('serializePodcast (sync)', () => {
    it('converts dates to ISO strings', () => {
      const result = serializePodcast(makePodcast());
      expect(result.createdAt).toBe('2024-06-15T12:00:00.000Z');
      expect(result.updatedAt).toBe('2024-06-15T13:00:00.000Z');
    });

    it('preserves tags and sourceDocumentIds arrays', () => {
      const result = serializePodcast(makePodcast());
      expect(result.tags).toEqual(['tech']);
      expect(result.sourceDocumentIds).toEqual(['doc_0123456789abcdef']);
    });

    it('handles null optional fields', () => {
      const result = serializePodcast(makePodcast());
      expect(result.description).toBeNull();
      expect(result.hostVoice).toBeNull();
      expect(result.segments).toBeNull();
      expect(result.audioUrl).toBeNull();
      expect(result.approvedAt).toBeNull();
    });

    it('serializes approvedAt when present', () => {
      const result = serializePodcast(makePodcast({ approvedAt: now }));
      expect(result.approvedAt).toBe('2024-06-15T12:00:00.000Z');
    });

    it('defaults undefined tags/sourceDocumentIds to empty arrays', () => {
      const podcast = makePodcast();
      // Simulate DB returning undefined for nullable jsonb
      (podcast as Record<string, unknown>).tags = undefined;
      (podcast as Record<string, unknown>).sourceDocumentIds = undefined;
      const result = serializePodcast(podcast);
      expect(result.tags).toEqual([]);
      expect(result.sourceDocumentIds).toEqual([]);
    });
  });

  describe('serializePodcastEffect', () => {
    it('serializes podcast via Effect', async () => {
      const result = await Effect.runPromise(
        serializePodcastEffect(makePodcast()),
      );
      expect(result.id).toBe('pod_0123456789abcdef');
      expect(result.format).toBe('conversation');
    });
  });

  describe('serializePodcastFull (sync)', () => {
    it('includes serialized documents', () => {
      const podcast = makePodcast();
      const docs = [makeDocument()];
      const result = serializePodcastFull({ ...podcast, documents: docs });
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]!.id).toBe('doc_0123456789abcdef');
      expect(result.documents[0]!.createdAt).toBe(now.toISOString());
    });
  });

  describe('serializePodcastListItem (sync)', () => {
    it('serializes list item with all fields', () => {
      const result = serializePodcastListItem(makePodcast());
      expect(result.id).toBe('pod_0123456789abcdef');
      expect(result.status).toBe('drafting');
    });
  });
});

// =============================================================================
// Voiceover Serializers
// =============================================================================

describe('voiceover serializers', () => {
  describe('serializeVoiceover (sync)', () => {
    it('converts dates to ISO strings', () => {
      const result = serializeVoiceover(makeVoiceover());
      expect(result.createdAt).toBe('2024-06-15T12:00:00.000Z');
      expect(result.updatedAt).toBe('2024-06-15T13:00:00.000Z');
    });

    it('handles null optional fields', () => {
      const result = serializeVoiceover(makeVoiceover());
      expect(result.voiceName).toBeNull();
      expect(result.audioUrl).toBeNull();
      expect(result.duration).toBeNull();
      expect(result.errorMessage).toBeNull();
      expect(result.approvedBy).toBeNull();
      expect(result.approvedAt).toBeNull();
    });

    it('serializes approvedAt when present', () => {
      const result = serializeVoiceover(makeVoiceover({ approvedAt: now }));
      expect(result.approvedAt).toBe('2024-06-15T12:00:00.000Z');
    });
  });

  describe('serializeVoiceoverEffect', () => {
    it('serializes voiceover via Effect', async () => {
      const result = await Effect.runPromise(
        serializeVoiceoverEffect(makeVoiceover()),
      );
      expect(result.id).toBe('voc_0123456789abcdef');
      expect(result.voice).toBe('Charon');
    });
  });

  describe('serializeVoiceoverListItem (sync)', () => {
    it('serializes list item identically to single item', () => {
      const voiceover = makeVoiceover();
      const single = serializeVoiceover(voiceover);
      const listItem = serializeVoiceoverListItem(voiceover);
      expect(listItem).toEqual(single);
    });
  });
});

// =============================================================================
// Infographic Serializers
// =============================================================================

describe('infographic serializers', () => {
  describe('serializeInfographic (sync)', () => {
    it('converts dates to ISO strings', () => {
      const result = serializeInfographic(makeInfographic());
      expect(result.createdAt).toBe('2024-06-15T12:00:00.000Z');
      expect(result.updatedAt).toBe('2024-06-15T13:00:00.000Z');
    });

    it('handles null optional fields', () => {
      const result = serializeInfographic(makeInfographic());
      expect(result.prompt).toBeNull();
      expect(result.imageStorageKey).toBeNull();
      expect(result.thumbnailStorageKey).toBeNull();
      expect(result.errorMessage).toBeNull();
      expect(result.approvedAt).toBeNull();
    });

    it('preserves enum values and style properties', () => {
      const result = serializeInfographic(
        makeInfographic({
          styleProperties: [
            { key: 'Background', value: '#fff', type: 'color' },
          ],
        }),
      );
      expect(result.styleProperties).toEqual([
        { key: 'Background', value: '#fff', type: 'color' },
      ]);
      expect(result.format).toBe('portrait');
      expect(result.status).toBe('draft');
    });
  });

  describe('serializeInfographicEffect', () => {
    it('serializes infographic via Effect', async () => {
      const result = await Effect.runPromise(
        serializeInfographicEffect(makeInfographic()),
      );
      expect(result.id).toBe('inf_0123456789abcdef');
    });
  });

  describe('serializeInfographicVersion (sync)', () => {
    it('converts dates to ISO strings', () => {
      const result = serializeInfographicVersion(makeInfographicVersion());
      expect(result.createdAt).toBe('2024-06-15T12:00:00.000Z');
    });

    it('preserves all version fields', () => {
      const result = serializeInfographicVersion(makeInfographicVersion());
      expect(result.id).toBe('inv_0123456789abcdef');
      expect(result.infographicId).toBe('inf_0123456789abcdef');
      expect(result.versionNumber).toBe(1);
      expect(result.imageStorageKey).toBe('infographics/v1.png');
      expect(result.thumbnailStorageKey).toBeNull();
    });
  });
});

// =============================================================================
// Slide Deck Serializers
// =============================================================================

describe('slide deck serializers', () => {
  describe('serializeSlideDeck (sync)', () => {
    it('converts dates to ISO strings', () => {
      const result = serializeSlideDeck(makeSlideDeck());
      expect(result.createdAt).toBe('2024-06-15T12:00:00.000Z');
      expect(result.updatedAt).toBe('2024-06-15T13:00:00.000Z');
    });

    it('preserves structured slide fields', () => {
      const result = serializeSlideDeck(makeSlideDeck());
      expect(result.id).toBe('sld_0123456789abcdef');
      expect(result.theme).toBe('executive');
      expect(result.status).toBe('ready');
      expect(result.slides[0]).toEqual({
        id: 'slide-1',
        title: 'Overview',
        body: 'Summary',
        bullets: ['Point A', 'Point B'],
        layout: 'title_bullets',
      });
      expect(result.generatedHtml).toBe('<html></html>');
    });
  });

  describe('serializeSlideDeckEffect', () => {
    it('serializes slide deck via Effect', async () => {
      const result = await Effect.runPromise(
        serializeSlideDeckEffect(makeSlideDeck()),
      );
      expect(result.id).toBe('sld_0123456789abcdef');
      expect(result.createdAt).toBe(now.toISOString());
    });
  });

  describe('serializeSlideDeckVersion (sync)', () => {
    it('converts date to ISO string', () => {
      const result = serializeSlideDeckVersion(makeSlideDeckVersion());
      expect(result.createdAt).toBe('2024-06-15T12:00:00.000Z');
    });

    it('preserves version fields', () => {
      const result = serializeSlideDeckVersion(makeSlideDeckVersion());
      expect(result.id).toBe('sldv_0123456789abcdef');
      expect(result.slideDeckId).toBe('sld_0123456789abcdef');
      expect(result.versionNumber).toBe(1);
      expect(result.theme).toBe('executive');
      expect(result.generatedHtml).toBe('<html>v1</html>');
    });
  });

  describe('serializeSlideDeckVersionsEffect (batch)', () => {
    it('serializes multiple versions', async () => {
      const versions = [
        makeSlideDeckVersion({ versionNumber: 1 }),
        makeSlideDeckVersion({ versionNumber: 2 }),
      ];

      const result = await Effect.runPromise(
        serializeSlideDeckVersionsEffect(versions),
      );

      expect(result).toHaveLength(2);
      expect(result[0]?.versionNumber).toBe(1);
      expect(result[1]?.versionNumber).toBe(2);
    });
  });
});

// =============================================================================
// Job Serializers
// =============================================================================

describe('job serializers', () => {
  describe('serializeJob (sync)', () => {
    it('converts dates to ISO strings', () => {
      const result = serializeJob(makeJob());
      expect(result.createdAt).toBe('2024-06-15T12:00:00.000Z');
      expect(result.updatedAt).toBe('2024-06-15T13:00:00.000Z');
    });

    it('handles null optional timestamp fields', () => {
      const result = serializeJob(makeJob());
      expect(result.startedAt).toBeNull();
      expect(result.completedAt).toBeNull();
    });

    it('serializes startedAt and completedAt when present', () => {
      const result = serializeJob(
        makeJob({
          startedAt: now,
          completedAt: later,
        }),
      );
      expect(result.startedAt).toBe('2024-06-15T12:00:00.000Z');
      expect(result.completedAt).toBe('2024-06-15T13:00:00.000Z');
    });

    it('preserves status and type', () => {
      const result = serializeJob(makeJob());
      expect(result.type).toBe('generate-podcast');
      expect(result.status).toBe('pending');
    });
  });

  describe('serializeJobEffect', () => {
    it('serializes job via Effect', async () => {
      const result = await Effect.runPromise(serializeJobEffect(makeJob()));
      expect(result.id).toBe('job_0123456789abcdef');
      expect(result.type).toBe('generate-podcast');
    });
  });
});

// =============================================================================
// Activity Log Serializers
// =============================================================================

describe('activityLog serializers', () => {
  describe('serializeActivityLog (sync)', () => {
    it('converts dates to ISO strings', () => {
      const result = serializeActivityLog(makeActivityLog());
      expect(result.createdAt).toBe('2024-06-15T12:00:00.000Z');
    });

    it('preserves all fields', () => {
      const result = serializeActivityLog(makeActivityLog());
      expect(result.id).toBe('act_0123456789abcdef');
      expect(result.userId).toBe('user-1');
      expect(result.userName).toBe('Test User');
      expect(result.action).toBe('created');
      expect(result.entityType).toBe('document');
      expect(result.entityId).toBe('doc_123');
      expect(result.entityTitle).toBe('My Doc');
      expect(result.metadata).toBeNull();
    });
  });

  describe('serializeActivityLogEffect', () => {
    it('serializes activity log via Effect', async () => {
      const result = await Effect.runPromise(
        serializeActivityLogEffect(makeActivityLog()),
      );
      expect(result.id).toBe('act_0123456789abcdef');
      expect(result.action).toBe('created');
    });
  });
});
