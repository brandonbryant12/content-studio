# Card Metadata Enrichment Pipeline - Implementation Plan

## Overview

Create an AI-powered metadata enrichment pipeline that runs on-demand per card to add rich metadata about players and card attributes. Uses Anthropic Claude for intelligent analysis with web search for current player data.

## Architecture

```
Card View Request
       │
       ▼
┌─────────────────────┐
│ Check if enriched   │ ─── Yes ──► Return cached metadata
└─────────────────────┘
       │ No
       ▼
┌─────────────────────┐
│ Build enrichment    │
│ context from card   │
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│ Web Search for      │
│ current player data │
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│ Claude AI Analysis  │
│ - Player metadata   │
│ - Card attributes   │
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│ Store in            │
│ card_metadata table │
└─────────────────────┘
       │
       ▼
Return enriched card
```

## Database Schema

### New Table: `card_metadata`

```sql
CREATE TABLE card_metadata (
  -- Primary key (one row per card)
  card_id TEXT PRIMARY KEY REFERENCES card(id) ON DELETE CASCADE,

  -- Enrichment status
  enriched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  enrichment_version INTEGER NOT NULL DEFAULT 1,
  enrichment_source TEXT NOT NULL DEFAULT 'claude', -- 'claude', 'manual', 'import'

  -- Player Metadata
  team TEXT,                          -- "Los Angeles Lakers"
  team_abbreviation TEXT,             -- "LAL"
  conference TEXT,                    -- "Western Conference", "AFC"
  division TEXT,                      -- "Pacific Division", "AL East"
  position TEXT,                      -- "Point Guard", "Quarterback"
  jersey_number TEXT,                 -- "23" (text for flexibility like "00")
  college TEXT,                       -- "Duke University"
  draft_year INTEGER,                 -- 2019
  draft_pick TEXT,                    -- "1st Round, Pick 1"
  country TEXT,                       -- "USA", "Canada"
  era TEXT,                           -- "Modern Era (2010s-present)", "Classic (1980s-1999)"

  -- Player Status
  is_hall_of_famer BOOLEAN,           -- true/false
  is_active BOOLEAN,                  -- true/false (still playing)
  years_active TEXT,                  -- "2015-present" or "2003-2016"
  nickname TEXT,                      -- "The King", "Air Jordan"

  -- Achievements (stored as text for display, can parse if needed)
  championships TEXT,                 -- "4x NBA Champion (2012, 2013, 2016, 2020)"
  awards TEXT,                        -- "4x MVP, 19x All-Star, 2x Finals MVP"
  career_highlights TEXT,             -- Brief notable achievements

  -- Career Stats (sport-specific, stored as JSONB)
  career_stats JSONB,                 -- {"points": 38652, "rebounds": 10566, ...}

  -- Card-Specific Metadata
  card_category TEXT,                 -- "Rookie Card", "Base", "Insert", "Auto", "Memorabilia"
  is_rookie_card BOOLEAN,             -- true/false
  has_autograph BOOLEAN,              -- true/false
  has_relic BOOLEAN,                  -- true/false (memorabilia piece)
  manufacturer TEXT,                  -- "Panini", "Topps", "Upper Deck"
  set_type TEXT,                      -- "Prizm", "Chrome", "Select", "Base Set"
  rarity_tier TEXT,                   -- "Common", "Uncommon", "Rare", "Ultra Rare", "1/1"
  is_short_print BOOLEAN,             -- true/false

  -- Collectibility Context
  collectibility_notes TEXT,          -- AI-generated notes about the card's collectibility

  -- Raw AI response for debugging/auditing
  raw_ai_response JSONB,              -- Full AI response for reference

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX card_metadata_team_idx ON card_metadata(team);
CREATE INDEX card_metadata_conference_idx ON card_metadata(conference);
CREATE INDEX card_metadata_division_idx ON card_metadata(division);
CREATE INDEX card_metadata_position_idx ON card_metadata(position);
CREATE INDEX card_metadata_era_idx ON card_metadata(era);
CREATE INDEX card_metadata_is_rookie_idx ON card_metadata(is_rookie_card) WHERE is_rookie_card = true;
CREATE INDEX card_metadata_has_auto_idx ON card_metadata(has_autograph) WHERE has_autograph = true;
CREATE INDEX card_metadata_manufacturer_idx ON card_metadata(manufacturer);
CREATE INDEX card_metadata_rarity_idx ON card_metadata(rarity_tier);
```

## Package Structure

```
packages/card/src/
├── metadata/
│   ├── index.ts                    # Public exports
│   ├── types.ts                    # Metadata types and schemas
│   ├── errors.ts                   # MetadataError with Data.TaggedError
│   ├── repos/
│   │   ├── index.ts
│   │   └── metadata-repo.ts        # CRUD for card_metadata table
│   ├── services/
│   │   ├── index.ts
│   │   ├── anthropic-client.ts     # Claude API client
│   │   └── web-search-client.ts    # Web search for current data
│   └── use-cases/
│       ├── index.ts
│       ├── enrich-card.ts          # Main enrichment use case
│       └── get-metadata.ts         # Get or enrich metadata
```

## Implementation Files

### 1. Types (`packages/card/src/metadata/types.ts`)

```typescript
import { z } from 'zod';

// Validation schemas
export const CardMetadataSchema = z.object({
  cardId: z.string(),
  enrichedAt: z.date(),
  enrichmentVersion: z.number(),
  enrichmentSource: z.enum(['claude', 'manual', 'import']),

  // Player metadata
  team: z.string().nullable(),
  teamAbbreviation: z.string().nullable(),
  conference: z.string().nullable(),
  division: z.string().nullable(),
  position: z.string().nullable(),
  jerseyNumber: z.string().nullable(),
  college: z.string().nullable(),
  draftYear: z.number().nullable(),
  draftPick: z.string().nullable(),
  country: z.string().nullable(),
  era: z.string().nullable(),

  // Player status
  isHallOfFamer: z.boolean().nullable(),
  isActive: z.boolean().nullable(),
  yearsActive: z.string().nullable(),
  nickname: z.string().nullable(),

  // Achievements
  championships: z.string().nullable(),
  awards: z.string().nullable(),
  careerHighlights: z.string().nullable(),
  careerStats: z.record(z.unknown()).nullable(),

  // Card metadata
  cardCategory: z.string().nullable(),
  isRookieCard: z.boolean().nullable(),
  hasAutograph: z.boolean().nullable(),
  hasRelic: z.boolean().nullable(),
  manufacturer: z.string().nullable(),
  setType: z.string().nullable(),
  rarityTier: z.string().nullable(),
  isShortPrint: z.boolean().nullable(),

  collectibilityNotes: z.string().nullable(),
});

export type CardMetadata = z.infer<typeof CardMetadataSchema>;

// Era classifications
export const ERA_CLASSIFICATIONS = {
  VINTAGE: 'Vintage (Pre-1980)',
  CLASSIC: 'Classic (1980-1999)',
  MODERN: 'Modern (2000-2009)',
  CONTEMPORARY: 'Contemporary (2010-2019)',
  CURRENT: 'Current Era (2020-present)',
} as const;

// Card categories
export const CARD_CATEGORIES = {
  ROOKIE: 'Rookie Card',
  BASE: 'Base Card',
  INSERT: 'Insert',
  PARALLEL: 'Parallel',
  AUTO: 'Autograph',
  MEMORABILIA: 'Memorabilia/Relic',
  AUTO_MEMORABILIA: 'Auto + Memorabilia',
  PATCH: 'Patch Card',
} as const;
```

### 2. Errors (`packages/card/src/metadata/errors.ts`)

```typescript
import { Data } from 'effect';

export class MetadataError extends Data.TaggedError('MetadataError')<{
  readonly code:
    | 'NOT_FOUND'
    | 'ENRICHMENT_FAILED'
    | 'AI_ERROR'
    | 'SEARCH_ERROR'
    | 'RATE_LIMITED'
    | 'INVALID_RESPONSE';
  readonly message: string;
  readonly cause?: unknown;
}> {}

export const MetadataErrors = {
  NotFound: (message = 'Card metadata not found') =>
    new MetadataError({ code: 'NOT_FOUND', message }),
  EnrichmentFailed: (message: string, cause?: unknown) =>
    new MetadataError({ code: 'ENRICHMENT_FAILED', message, cause }),
  AIError: (message: string, cause?: unknown) =>
    new MetadataError({ code: 'AI_ERROR', message, cause }),
  SearchError: (message: string, cause?: unknown) =>
    new MetadataError({ code: 'SEARCH_ERROR', message, cause }),
  RateLimited: (message = 'Rate limit exceeded') =>
    new MetadataError({ code: 'RATE_LIMITED', message }),
  InvalidResponse: (message: string) =>
    new MetadataError({ code: 'INVALID_RESPONSE', message }),
} as const;
```

### 3. Anthropic Client (`packages/card/src/metadata/services/anthropic-client.ts`)

```typescript
import { Context, Effect, Layer, Config, Duration, Data, RateLimiter } from 'effect';

export class AnthropicError extends Data.TaggedError('AnthropicError')<{
  readonly code: 'API_ERROR' | 'RATE_LIMITED' | 'PARSE_ERROR' | 'NETWORK_ERROR';
  readonly message: string;
  readonly status?: number;
}> {}

export interface AnthropicClient {
  readonly analyzeCard: (input: CardAnalysisInput) =>
    Effect.Effect<CardAnalysisResult, AnthropicError>;
}

export const AnthropicClient = Context.GenericTag<AnthropicClient>('@card/AnthropicClient');

interface CardAnalysisInput {
  playerName: string;
  productName: string;
  consoleName: string;
  sport: string;
  year?: number;
  webSearchContext?: string; // Additional context from web search
}

interface CardAnalysisResult {
  team: string | null;
  teamAbbreviation: string | null;
  conference: string | null;
  division: string | null;
  position: string | null;
  jerseyNumber: string | null;
  college: string | null;
  draftYear: number | null;
  draftPick: string | null;
  country: string | null;
  era: string | null;
  isHallOfFamer: boolean | null;
  isActive: boolean | null;
  yearsActive: string | null;
  nickname: string | null;
  championships: string | null;
  awards: string | null;
  careerHighlights: string | null;
  careerStats: Record<string, unknown> | null;
  cardCategory: string | null;
  isRookieCard: boolean | null;
  hasAutograph: boolean | null;
  hasRelic: boolean | null;
  manufacturer: string | null;
  setType: string | null;
  rarityTier: string | null;
  isShortPrint: boolean | null;
  collectibilityNotes: string | null;
}

const makeClient = Effect.gen(function* () {
  const apiKey = yield* Config.string('ANTHROPIC_API_KEY');

  // Rate limit: 50 requests per minute (conservative)
  const rateLimiter = yield* RateLimiter.make({
    limit: 50,
    interval: Duration.minutes(1),
  });

  const analyzeCard = (input: CardAnalysisInput) =>
    rateLimiter(
      Effect.gen(function* () {
        const prompt = buildAnalysisPrompt(input);

        const response = yield* Effect.tryPromise({
          try: () => fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 2048,
              messages: [{ role: 'user', content: prompt }],
            }),
          }),
          catch: (cause) =>
            new AnthropicError({ code: 'NETWORK_ERROR', message: String(cause) }),
        });

        if (response.status === 429) {
          return yield* Effect.fail(
            new AnthropicError({ code: 'RATE_LIMITED', message: 'Rate limited', status: 429 })
          );
        }

        if (!response.ok) {
          return yield* Effect.fail(
            new AnthropicError({ code: 'API_ERROR', message: `HTTP ${response.status}`, status: response.status })
          );
        }

        const data = yield* Effect.tryPromise({
          try: () => response.json(),
          catch: (cause) =>
            new AnthropicError({ code: 'PARSE_ERROR', message: String(cause) }),
        });

        // Parse the structured JSON from Claude's response
        const result = yield* parseAnalysisResponse(data);
        return result;
      })
    ).pipe(
      Effect.timeout(Duration.seconds(30)),
      Effect.withSpan('AnthropicClient.analyzeCard'),
    );

  return { analyzeCard } satisfies AnthropicClient;
});

export const AnthropicClientLive = Layer.scoped(AnthropicClient, makeClient);

// Mock for testing
export const AnthropicClientMock = (responses: Map<string, CardAnalysisResult>) =>
  Layer.succeed(AnthropicClient, {
    analyzeCard: (input) =>
      Effect.gen(function* () {
        const result = responses.get(input.playerName);
        if (!result) {
          // Return empty metadata for unknown players
          return {
            team: null, teamAbbreviation: null, conference: null,
            division: null, position: null, jerseyNumber: null,
            college: null, draftYear: null, draftPick: null,
            country: null, era: null, isHallOfFamer: null,
            isActive: null, yearsActive: null, nickname: null,
            championships: null, awards: null, careerHighlights: null,
            careerStats: null, cardCategory: null, isRookieCard: null,
            hasAutograph: null, hasRelic: null, manufacturer: null,
            setType: null, rarityTier: null, isShortPrint: null,
            collectibilityNotes: null,
          };
        }
        return result;
      }),
  });
```

### 4. Enrich Card Use Case (`packages/card/src/metadata/use-cases/enrich-card.ts`)

```typescript
import { Effect } from 'effect';
import { Db, DbError } from '@repo/db';
import { AnthropicClient } from '../services/anthropic-client';
import { WebSearchClient } from '../services/web-search-client';
import * as MetadataRepo from '../repos/metadata-repo';
import * as CardsRepo from '../../repos/cards-repo';
import { MetadataErrors, MetadataError } from '../errors';
import type { CardMetadata } from '../types';

export const enrichCard = (
  cardId: string,
): Effect.Effect<
  CardMetadata,
  DbError | MetadataError,
  typeof Db.Identifier | AnthropicClient | WebSearchClient
> =>
  Effect.gen(function* () {
    // 1. Check if already enriched
    const existing = yield* MetadataRepo.getByCardId(cardId);
    if (existing) {
      return existing;
    }

    // 2. Get card details
    const card = yield* CardsRepo.getById(cardId);
    if (!card) {
      return yield* Effect.fail(MetadataErrors.NotFound(`Card ${cardId} not found`));
    }

    // 3. Extract player name from product name
    const playerName = extractPlayerName(card.productName);
    if (!playerName) {
      return yield* Effect.fail(
        MetadataErrors.EnrichmentFailed('Could not extract player name from card')
      );
    }

    // 4. Web search for current player data
    const webSearch = yield* WebSearchClient;
    const searchContext = yield* webSearch.searchPlayer({
      playerName,
      sport: card.sport,
      team: null, // Unknown at this point
    }).pipe(
      Effect.catchAll(() => Effect.succeed(null)), // Don't fail if search fails
    );

    // 5. Call Claude for analysis
    const anthropic = yield* AnthropicClient;
    const analysis = yield* anthropic.analyzeCard({
      playerName,
      productName: card.productName,
      consoleName: card.consoleName,
      sport: card.sport,
      year: card.year ?? undefined,
      webSearchContext: searchContext ?? undefined,
    }).pipe(
      Effect.mapError((e) => MetadataErrors.AIError(e.message, e)),
    );

    // 6. Store metadata
    const metadata: MetadataRepo.MetadataInsert = {
      cardId,
      enrichmentSource: 'claude',
      enrichmentVersion: 1,
      ...analysis,
      rawAiResponse: analysis as Record<string, unknown>,
    };

    yield* MetadataRepo.upsert(metadata);

    // 7. Return the metadata
    return yield* MetadataRepo.getByCardId(cardId).pipe(
      Effect.flatMap((m) =>
        m ? Effect.succeed(m) : Effect.fail(MetadataErrors.NotFound())
      ),
    );
  }).pipe(Effect.withSpan('enrichCard', { attributes: { cardId } }));

/**
 * Get metadata if exists, or enrich the card first
 */
export const getOrEnrichMetadata = (
  cardId: string,
): Effect.Effect<
  CardMetadata | null,
  DbError | MetadataError,
  typeof Db.Identifier | AnthropicClient | WebSearchClient
> =>
  Effect.gen(function* () {
    const existing = yield* MetadataRepo.getByCardId(cardId);
    if (existing) {
      return existing;
    }

    // Try to enrich, but return null if it fails
    return yield* enrichCard(cardId).pipe(
      Effect.catchTag('MetadataError', () => Effect.succeed(null)),
    );
  });
```

## Implementation Phases

### Phase 1: Database & Types (1-2 files)
1. Add `card_metadata` table to `packages/db/src/schemas/cards.ts`
2. Create `packages/card/src/metadata/types.ts`
3. Create `packages/card/src/metadata/errors.ts`

### Phase 2: Repository Layer (1 file)
1. Create `packages/card/src/metadata/repos/metadata-repo.ts`
   - `getByCardId()`
   - `upsert()`
   - `bulkGetByCardIds()`
   - `deleteByCardId()`

### Phase 3: AI Client (2 files)
1. Create `packages/card/src/metadata/services/anthropic-client.ts`
   - Rate-limited Claude API integration
   - Structured prompt for card analysis
   - JSON response parsing
2. Create `packages/card/src/metadata/services/web-search-client.ts`
   - Simple web search for current player data
   - Cache recent searches

### Phase 4: Use Cases (2 files)
1. Create `packages/card/src/metadata/use-cases/enrich-card.ts`
   - Main enrichment logic
   - Combines web search + AI analysis
2. Create `packages/card/src/metadata/use-cases/get-metadata.ts`
   - Get existing or trigger enrichment

### Phase 5: Integration & Testing
1. Export from `packages/card/src/metadata/index.ts`
2. Add router endpoint for on-demand enrichment
3. Write tests with `@effect/vitest`

## Claude Prompt Template

```
You are a sports card metadata expert. Analyze this trading card and provide structured metadata.

CARD INFORMATION:
- Player Name: {playerName}
- Product Name: {productName}
- Set/Console Name: {consoleName}
- Sport: {sport}
- Year: {year}

CURRENT PLAYER DATA (from web search):
{webSearchContext}

Please analyze this card and provide the following metadata in JSON format:

{
  "team": "Current or card-era team name",
  "teamAbbreviation": "Team abbreviation (e.g., LAL, NYY)",
  "conference": "Sports conference (e.g., Western Conference, AFC)",
  "division": "Division (e.g., Pacific Division, NL West)",
  "position": "Player position",
  "jerseyNumber": "Jersey number",
  "college": "College attended",
  "draftYear": 2019,
  "draftPick": "1st Round, Pick 1",
  "country": "Country of origin",
  "era": "One of: Vintage (Pre-1980), Classic (1980-1999), Modern (2000-2009), Contemporary (2010-2019), Current Era (2020-present)",
  "isHallOfFamer": true/false,
  "isActive": true/false,
  "yearsActive": "2015-present or 2003-2016",
  "nickname": "Famous nickname if any",
  "championships": "e.g., 4x NBA Champion (2012, 2013, 2016, 2020)",
  "awards": "e.g., 4x MVP, 19x All-Star",
  "careerHighlights": "Brief notable achievements",
  "careerStats": {"points": 38652, "rebounds": 10566},
  "cardCategory": "One of: Rookie Card, Base Card, Insert, Parallel, Autograph, Memorabilia/Relic, Patch Card",
  "isRookieCard": true/false,
  "hasAutograph": true/false,
  "hasRelic": true/false,
  "manufacturer": "Panini, Topps, Upper Deck, etc.",
  "setType": "Prizm, Chrome, Select, etc.",
  "rarityTier": "Common, Uncommon, Rare, Ultra Rare, 1/1",
  "isShortPrint": true/false,
  "collectibilityNotes": "Brief notes about this card's collectibility"
}

Respond ONLY with valid JSON. Use null for unknown fields.
```

## Dependencies to Add

```json
// packages/card/package.json
{
  "dependencies": {
    "zod": "catalog:"
  }
}
```

## Testing Plan

1. Unit tests for metadata repo operations
2. Unit tests for player name extraction
3. Integration tests with mock Anthropic client
4. E2E test with real Claude API (manual/CI with secrets)

## Approval Checklist

- [ ] Database schema design approved
- [ ] Metadata fields comprehensive
- [ ] Anthropic client approach approved
- [ ] Web search integration approach approved
- [ ] Testing strategy approved
