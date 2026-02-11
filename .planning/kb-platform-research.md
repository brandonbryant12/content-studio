# Knowledge Base Platform Research

> Compiled: 2026-02-11 | Purpose: Inform Content Studio KB feature design

---

## Table of Contents

1. [Platform Analysis](#platform-analysis)
   - [Notion AI](#1-notion-ai)
   - [Jasper AI](#2-jasper-ai)
   - [Copy.ai](#3-copyai)
   - [Descript](#4-descript)
   - [Google NotebookLM](#5-google-notebooklm)
   - [ChatGPT Projects](#6-chatgpt-projectsmemory)
   - [Perplexity Spaces](#7-perplexity-spaces)
2. [Cross-Platform Comparison Matrix](#cross-platform-comparison-matrix)
3. [Google Deep Research API](#google-deep-research-api--integration-opportunities)
4. [URL Scraping & Content Extraction](#url-scraping--content-extraction-best-practices)
5. [Common KB Features Users Expect](#common-knowledge-base-features-users-expect)
6. [Key Takeaways for Content Studio](#key-takeaways-for-content-studio)

---

## Platform Analysis

### 1. Notion AI

**Overview:** Workspace-first platform with AI layered on top. Knowledge lives in pages/databases; AI queries across the workspace.

#### Content Types Supported
- Rich text pages, databases (20+ property types)
- Embedded files & media (images, PDFs, videos)
- Connected external sources: Slack, Google Drive, Microsoft Teams, Confluence
- Web bookmarks/embeds

#### Organization Model
- Hierarchical pages & sub-pages (tree structure)
- Databases with views (table, board, calendar, gallery, list, timeline)
- Tags via multi-select properties, relations between databases
- Teamspaces for organizational grouping

#### How Knowledge Is Used in Generation
- AI queries across the entire workspace scope
- Can reference specific pages or databases in prompts
- Auto-fill database properties based on page content
- AI Agents (Notion 3.0, Sept 2025) work autonomously for up to 20 minutes across hundreds of pages
- Multi-model support: GPT-5, Claude Opus 4.1, o3 -- users choose per task

#### Research / Deep-Dive Features
- AI Agents can analyze document change history (not just current content)
- AI-powered note transcription (works across apps, even when screen locked)
- Summarization of long documents, flagging outdated info

#### UI/UX Patterns
- Slash commands (`/ai`) for inline AI actions
- Side panel for AI chat with workspace context
- Ask AI floating button on pages
- Agent task queue showing autonomous work progress

#### Limitations & Pain Points
- **"Walled garden"**: Static copy of knowledge, no real-time external data
- AI limited to 20 responses on Free/Plus plans (effectively paywalled)
- Performance degrades with large datasets
- Automation is passive (auto-fill) not active (workflows)
- Sync hiccups with connected sources

#### Pricing (KB-relevant)
| Plan | Price | AI Access |
|------|-------|-----------|
| Free | $0 | 20 AI responses (one-time trial) |
| Plus | $12/user/mo | 20 AI responses (one-time trial) |
| Business | $20/user/mo | Unlimited AI, full workspace AI |
| Enterprise | Custom | Unlimited AI, SSO, audit log |

---

### 2. Jasper AI

**Overview:** Marketing-focused AI content platform. Knowledge base is tightly integrated with brand voice to produce on-brand content.

#### Content Types Supported
- Text documents, PDFs, whitepapers
- Audio files
- Images
- Video files
- URLs / web pages
- Product specs, case studies, audience personas

#### Organization Model
- Three pillars: **Voice**, **Knowledge Base**, **Style Guide**
- Knowledge assets are individual items (documents, URLs, etc.)
- Brand Voice profiles group voice + knowledge + style together
- Business plan: unlimited brand voices for multiple brands/products

#### How Knowledge Is Used in Generation
- Knowledge Base items are automatically referenced during content generation
- Brand Voice ensures tone/style consistency
- Style Guide enforces grammar rules, terminology, formatting
- Visual Guidelines maintain brand look for AI-generated images
- Content Agent Studio: upload 3 content samples to generate infinite on-brand variations

#### Research / Deep-Dive Features
- No dedicated deep research feature
- Relies on knowledge base context + LLM general knowledge
- Agentic AI for automated ideation, drafting, optimization workflows

#### UI/UX Patterns
- Dedicated Brand Voice setup wizard
- `#` tag system to reference knowledge in prompts
- Side-by-side editor with AI suggestions
- Template library with brand voice pre-applied
- Campaign-level content management

#### Limitations & Pain Points
- Pro plan limited to only 5 multi-modal Knowledge assets
- No free tier for knowledge base features
- Knowledge retrieval accuracy can vary with large knowledge bases
- No real-time web search integration in knowledge context
- Primarily marketing-focused; less useful for technical/research content

#### Pricing (KB-relevant)
| Plan | Price | KB Assets |
|------|-------|-----------|
| Creator | $39/mo ($29 annual) | Limited |
| Pro | $69/seat/mo ($59 annual) | 5 multi-modal assets |
| Business | Custom | Unlimited assets, unlimited brand voices, API |

**File upload limit:** 300MB per file (increased from 100MB in 2025).

---

### 3. Copy.ai

**Overview:** AI content platform with "Infobase" as its knowledge center. Evolved from copywriting tool to agentic workflow platform.

#### Content Types Supported
- Text entries (manual input)
- Documents (up to 10MB per item)
- Brand guidelines, product details
- Value propositions, messaging frameworks
- Content samples (3 samples seed the Content Agent Studio)

#### Organization Model
- **Infobase**: centralized repository with taggable items
- Items tagged for quick reference via `#` in prompts
- Chat Projects group conversations by topic
- Workflow Builder organizes automated content pipelines

#### How Knowledge Is Used in Generation
- Reference Infobase items via `#tag` in Chat or Workflows
- Brand Voice feature trained on uploaded content
- Persists across all chat sessions and workflow executions
- Content Agent Studio: upload 3 content samples, generates variations maintaining voice/structure
- Workflows can chain multiple knowledge-informed steps

#### Research / Deep-Dive Features
- No dedicated research mode
- Agents can research accounts (Prospecting Cockpit) for sales use cases
- Translation + Localization agent for multi-language content

#### UI/UX Patterns
- `#` reference system for Infobase items in prompts
- Workflow builder (visual, drag-and-drop)
- Template marketplace
- LLM model selector (GPT series, Claude, o1/o3)

#### Limitations & Pain Points
- 10MB limit per Infobase item
- Free tier limited to 2,000 words in Chat
- Advanced plan ($249/mo) required for Workflow Builder
- No URL/web scraping for knowledge ingestion
- Infobase organization is flat (tags only, no hierarchy)

#### Pricing (KB-relevant)
| Plan | Price | KB Features |
|------|-------|-------------|
| Free | $0 | Infobase + Brand Voice (2,000 words) |
| Starter | $49/mo | Unlimited words, all LLMs |
| Advanced | $249/mo (5 users) | Workflow Builder, 2k workflow credits |
| Enterprise | Custom | Custom limits, SSO |

---

### 4. Descript

**Overview:** AI-powered video/podcast editing platform. Not a traditional knowledge base platform, but has brand and content intelligence features relevant to content repurposing.

#### Content Types Supported
- Video files (4K multitrack)
- Audio files / podcasts
- Transcripts (auto-generated)
- Text overlays and captions
- Voice clones (Overdub)
- Screen recordings

#### Organization Model
- Project-based (each video/podcast is a project)
- Team sharing and collaboration within projects
- No formal "knowledge base" feature
- Brand Studio for corporate branding assets

#### How Knowledge Is Used in Generation
- Transcripts are the primary "knowledge" layer
- AI Actions generate show notes, social clips, summaries from transcript content
- Underlord AI co-editor interprets natural language commands against project content
- Voice clones maintain speaker consistency
- Brand Studio maintains visual brand consistency

#### Research / Deep-Dive Features
- None -- Descript is an editing tool, not a research platform

#### UI/UX Patterns
- Text-based editing (edit video by editing transcript text)
- Natural language command bar (Underlord)
- Side-by-side transcript + timeline view
- Drag-and-drop scene composition

#### Limitations & Pain Points
- No standalone knowledge base feature
- Content intelligence is project-scoped (no cross-project knowledge)
- Limited to audio/video content types
- Voice cloning accuracy varies
- Heavy resource usage for 4K editing

#### Pricing
| Plan | Price | Key Features |
|------|-------|-------------|
| Free | $0 | 1 watermarked video export, 1 hr transcription |
| Hobbyist | $24/mo | 10 hrs transcription, basic AI |
| Creator | $33/mo | Unlimited exports, full AI Actions |
| Business | $40/user/mo | Team features, Brand Studio |
| Enterprise | Custom | SSO, advanced security |

**Relevance to Content Studio:** Descript's transcript-as-knowledge pattern and show notes generation are directly analogous to Content Studio's podcast workflow. Their approach to content repurposing (podcast -> blog post, social clips) is a key use case for a KB.

---

### 5. Google NotebookLM

**Overview:** Research-first AI tool. Users upload sources, and AI grounds all responses in those sources. The closest existing product to a "knowledge base for content creation."

#### Content Types Supported
- PDFs (from Drive or local upload)
- Google Docs
- Google Sheets
- Google Slides
- .docx files
- Web URLs (pasted)
- YouTube video transcripts
- Images
- Audio files
- Copied text/notes

#### Organization Model
- **Notebooks**: top-level containers (like projects)
- **Sources**: documents/files within a notebook (50-600 depending on plan)
- No tags or sub-folders within notebooks
- Each notebook is independent (no cross-notebook querying)

#### How Knowledge Is Used in Generation
- ALL AI responses are grounded in uploaded sources (no hallucination from general knowledge)
- Inline citations with source references
- Multiple output formats: summaries, FAQs, study guides, timelines, mind maps
- Audio Overviews: AI-generated podcast-style discussions of sources
- Blog Post format for content creation
- Slide Decks generated from sources
- Data Tables: structured comparison extraction from text

#### Research / Deep-Dive Features
- **Deep Research**: AI creates a research plan, browses 15-25+ websites, generates source-grounded report
  - Fast mode: 30-45 seconds, 10-15 sources
  - Deep mode: 3-5 minutes, 15-25 sources
- Reports can be added directly as notebook sources
- Runs in background while user continues working
- Mind Map for exploring connections between concepts
- Timeline generation from source content
- Learning Guide for personalized tutoring
- Audio Overviews in Brief, Critique, and Debate formats

#### UI/UX Patterns
- Source panel (left) + Chat/Output panel (right)
- Source selection: check/uncheck which sources AI should reference
- Suggested questions based on uploaded sources
- Citation highlights linking response to specific source passages
- One-click output format buttons (Summary, FAQ, Study Guide, etc.)
- Background task indicator for Deep Research

#### Limitations & Pain Points
- **Google ecosystem lock-in**: only supports Google Drive, Docs, Sheets, Slides natively
- No Notion, Obsidian, or third-party integrations
- No offline mode
- Gemini-only (no model choice)
- Individual notebooks are siloed (no cross-notebook search)
- Source limits can be restrictive for large research projects
- No API for developers (consumer product only)
- No collaborative editing (view-only sharing until recently)

#### Pricing (KB-relevant)
| Plan | Price | Sources/Notebook | Key Limits |
|------|-------|-----------------|------------|
| Free | $0 | 50 | Basic features |
| Plus | ~$14/mo (Workspace) | 300 | Enhanced limits |
| Pro | $19.99/mo | 300+ | Deep Research, priority |
| Ultra | $249.99/mo | 600 | 50x generation limits, no watermarks |

**Key Insight for Content Studio:** NotebookLM's source-grounded generation with inline citations is the gold standard for knowledge-informed content creation. The source selection UI (check/uncheck) is elegant and worth emulating.

---

### 6. ChatGPT Projects/Memory

**Overview:** General-purpose AI chat with persistent memory and project workspaces. Knowledge is either conversational memory or uploaded files within projects.

#### Content Types Supported
- Text files, PDFs, Word docs, presentations, spreadsheets
- Images (for vision analysis)
- Code files
- Audio (for transcription/analysis)
- Conversational memory (automatic or explicit)
- Web search results (ephemeral, not stored)

#### Organization Model
- **Projects**: workspaces grouping chats + files + custom instructions
- **Memory**: persistent facts learned from conversations
- **Custom GPTs**: specialized assistants with pre-loaded knowledge files
- Each project has its own "memory" and "knowledge" scope
- Projects are shareable with teams (as of Oct 2025)

#### How Knowledge Is Used in Generation
- Files are analyzed via retrieval when relevant to the query
- Project-level memory persists across all chats in that project
- Global memory spans all conversations unless scoped to a project
- Custom instructions per project guide tone/behavior
- Synthesis, extraction, comparison tasks across uploaded files
- **Pulse**: async daily research based on past chats, memory, and feedback

#### Research / Deep-Dive Features
- Web browsing (real-time search during generation)
- Pulse: background research delivered as visual summaries
- Deep Research mode (extended reasoning + search)
- Canvas for collaborative document editing

#### UI/UX Patterns
- Sidebar with project list and chat history
- File attachment drag-and-drop in chat
- Memory management panel (view, delete, add memories)
- Project settings for custom instructions and model selection
- Inline file references in responses

#### Limitations & Pain Points
- **20 files per project** limit (users report even lower effective limits)
- File processing can be slow for large documents
- Memory can be imprecise (remembers wrong things or forgets important things)
- No structured knowledge organization (files are flat list)
- No tagging or categorization of knowledge
- Knowledge retrieval accuracy varies significantly
- Custom GPTs have separate knowledge limits (20 files, 512MB each)

#### Pricing (KB-relevant)
| Plan | Price | Key KB Features |
|------|-------|----------------|
| Free | $0 | Basic memory, limited uploads (3/day) |
| Plus | $20/mo | Projects, 80 files/3hrs, enhanced memory |
| Team | $25/user/mo | Shared projects, admin controls |
| Pro | $200/mo | Extended file limits, priority |
| Enterprise | Custom | SSO, data retention controls |

---

### 7. Perplexity Spaces

**Overview:** Research-focused AI search engine with collaborative knowledge spaces. Strongest at web research and citation-backed answers.

#### Content Types Supported
- PDFs, CSVs, spreadsheets
- Word documents, slide decks
- Code snippets
- Images
- Audio and video files (with auto-transcription)
- Web search results (saved to threads)
- URLs (scraped and indexed)

#### Organization Model
- **Spaces**: project-level knowledge hubs with custom AI instructions
- **Collections**: topic-based folders for organizing saved threads
- **Threads**: individual research sessions (conversations)
- Spaces can have uploaded files + custom instructions + preferred AI model
- Enterprise: organization-wide file repository (up to 500 files)

#### How Knowledge Is Used in Generation
- Uploaded files in a Space are searched alongside web results
- Internal Knowledge Search (Enterprise): queries against org-wide repository
- Custom AI instructions per Space guide response style
- Thread files are temporary (7-day retention)
- Space files are persistent
- Citations always included with source links

#### Research / Deep-Dive Features
- **Deep Research**: multi-step research agent with comprehensive reports
- **Perplexity Pages**: converts research threads into formatted, shareable articles
- **Labs**: data visualization, charts, dashboards, structured reports
- Real-time web search with up-to-the-minute information
- Finance-specific features (live price data, market research)
- Quiz/flashcard generation from research

#### UI/UX Patterns
- Search-first interface (no chat history until you search)
- Source cards showing where information came from
- "Focus" modes: All, Academic, Writing, YouTube, Reddit, etc.
- Collaborative Space with viewer/contributor roles
- Thread continuation for iterative research
- Pages editor for publishing research

#### Limitations & Pain Points
- 40MB per file upload limit
- PNG/JPEG not supported for Internal Knowledge Search
- Thread files auto-delete after 7 days
- No integration with external tools (Notion, Slack, etc.)
- Spaces limited in file count for non-enterprise
- Pro plan required for meaningful file upload usage
- No API access to Spaces features (API is search-only)

#### Pricing (KB-relevant)
| Plan | Price | Key KB Features |
|------|-------|----------------|
| Free | $0 | Basic search, very limited uploads |
| Pro | $20/mo ($200/yr) | Spaces, file uploads, Deep Research |
| Max | $200/mo ($2000/yr) | Extended limits |
| Enterprise Pro | $40/user/mo | Internal Knowledge Search, 500 org files |

---

## Cross-Platform Comparison Matrix

| Feature | Notion AI | Jasper | Copy.ai | NotebookLM | ChatGPT | Perplexity |
|---------|-----------|--------|---------|------------|---------|------------|
| **File Upload** | Via pages | Yes (300MB) | Yes (10MB) | Yes | Yes (512MB) | Yes (40MB) |
| **URL Ingestion** | Limited | Yes | No | Yes | Via search | Yes |
| **Web Search** | No | No | No | Deep Research | Yes | Core feature |
| **Organization** | Pages/DBs | Brand profiles | Tags | Notebooks | Projects | Spaces |
| **Hierarchy** | Deep tree | Flat | Flat (tags) | 2-level | 2-level | 2-level |
| **Source Citations** | No | No | No | Yes (inline) | Sometimes | Yes (always) |
| **Audio Sources** | No | Yes | No | Yes | Yes | Yes |
| **Video Sources** | No | Yes | No | YouTube | Yes | Yes |
| **Cross-project KB** | Workspace-wide | Per brand | Global Infobase | Per notebook | Per project | Per space |
| **Collaboration** | Full | Team plan | Team plan | View/share | Shared projects | Contributor roles |
| **API Access** | Yes | Business | Enterprise | No | Yes | Search only |
| **Free Tier KB** | 20 AI queries | No | 2K words | 50 sources | 3 files/day | Very limited |
| **Deep Research** | No | No | No | Yes | Yes | Yes |
| **Brand Voice** | No | Core feature | Yes | No | Via memory | Via instructions |

---

## Google Deep Research API -- Integration Opportunities

### What It Is
Google's Deep Research is an autonomous research agent available via the **Interactions API** (public beta, Dec 2025). It creates a research plan, browses hundreds of web pages, and synthesizes findings into a comprehensive report.

### API Details
- **Endpoint**: Interactions API (same endpoint for standard Gemini models and agents)
- **Agent ID**: `deep-research-pro-preview-12-2025`
- **Input**: Text queries + multimodal inputs (images, PDFs, audio, video)
- **Output**: Structured research reports with source citations
- **Execution**: Background mode (`background=True`) -- returns immediately, poll for results
- **Tools**: Built-in `google_search` and `url_context`; supports MCP tool servers

### Integration Pattern
```python
# Start a deep research task
interaction = client.interactions.create(
    input="Research the history of podcast monetization trends 2020-2025",
    agent="deep-research-pro-preview-12-2025",
    background=True
)

# Poll for completion
result = client.interactions.get(interaction.id)
```

### Key Features for Content Studio
1. **Background execution**: Start research, let user continue working (like NotebookLM)
2. **Multimodal input**: Could feed existing podcast transcripts + topic to get deeper research
3. **MCP support**: Could connect our own tools as data sources
4. **Conversation continuity**: `previous_interaction_id` for follow-up research
5. **Source grounding**: All outputs cite web sources

### Pricing Considerations
- Per-token pricing: $0.0004 - $0.0015 depending on model tier
- High-throughput "Deep Think" can cost $250+/mo
- Background tasks may have different rate limits than synchronous requests

### Integration Ideas for Content Studio
- **"Research" button** on any content topic -- kicks off Deep Research in background
- **Pre-production research** for podcasts: user enters topic, gets comprehensive brief with sources
- **Fact-checking**: run Deep Research against claims in generated content
- **Source discovery**: find authoritative sources to add to the knowledge base
- **Competitive analysis**: research competitors for marketing content

---

## URL Scraping & Content Extraction Best Practices

### Tool Landscape (2025-2026)

| Tool | Type | Best For | Pricing |
|------|------|----------|---------|
| **Firecrawl** | Hosted service | Enterprise-scale, schema-first extraction | $83/mo (100k credits) |
| **Crawl4AI** | Open-source (Python) | Maximum control, self-hosted | Free (infra costs) |
| **Jina Reader** | API service | Quick prototyping, simple extraction | Free (1M tokens) |
| **Apify** | Platform | Complex workflows, proxy management | From $49/mo |

### Recommended Approach for Content Studio

**Primary**: Jina Reader API for simple URL-to-markdown conversion
- Free tier generous (1M tokens)
- Returns clean markdown from any URL
- Handles JavaScript-rendered pages
- Simple REST API: `GET https://r.jina.ai/{url}`

**Fallback**: Firecrawl for complex/JS-heavy sites
- Better JavaScript rendering
- Schema-based structured extraction
- Handles pagination and multi-page crawls

### Content Extraction Pipeline
1. **Fetch**: URL -> HTML (handle JS rendering, redirects, auth walls)
2. **Extract**: HTML -> Clean text/markdown (remove nav, ads, boilerplate)
3. **Chunk**: Split into semantic sections (respect headings, paragraphs)
4. **Embed**: Generate vector embeddings for each chunk
5. **Store**: Save chunks + embeddings + metadata in vector DB
6. **Index**: Build search index for retrieval

### Chunking Best Practices
- **Chunk size**: 500-1000 tokens per chunk (balance precision vs. context)
- **Overlap**: 10-20% overlap between chunks to preserve context at boundaries
- **Strategy**: Semantic chunking (split on headings/sections) > fixed-size
- **Metadata**: Store source URL, title, section heading, date, chunk index
- **Rule of thumb**: If a chunk makes sense to a human without context, it will work for the LLM

### Legal / Ethical Considerations
- Respect `robots.txt` and Terms of Service
- Rate limit requests (1-2 req/sec per domain)
- Cache aggressively to avoid redundant fetches
- Honor `noindex` meta tags
- Store extracted content, not raw HTML (reduces legal exposure)
- Allow users to delete scraped content and re-scrape for freshness

---

## Common Knowledge Base Features Users Expect

Based on cross-platform research and user feedback patterns:

### Must-Have (Table Stakes)
1. **Multi-format upload**: PDF, DOCX, TXT, CSV, images at minimum
2. **URL/web content import**: Paste a URL, extract and store content
3. **Manual text entry**: Quick notes, facts, brand guidelines
4. **Search across all knowledge**: Full-text + semantic search
5. **Organization**: At least folders/collections; tags are a bonus
6. **Reference in generation**: Explicitly select which knowledge to use
7. **Source attribution**: Know which KB item informed the output
8. **CRUD operations**: Add, view, edit, delete knowledge items
9. **File size limits**: At least 10MB, ideally 50-100MB+

### Expected (Differentiators)
10. **Automatic chunking & indexing**: User uploads, system handles RAG pipeline
11. **Knowledge freshness indicators**: Show when content was last updated
12. **Selective context**: Choose which items/collections to include per generation
13. **Cross-content-type knowledge**: Same KB used for podcasts, blog posts, voiceovers
14. **Brand voice / style persistence**: KB informs not just facts but tone
15. **Bulk import**: Upload multiple files at once
16. **Content preview**: View/read KB items without downloading

### Delighters (Competitive Advantage)
17. **Deep Research integration**: One-click web research that feeds KB
18. **Auto-refresh URLs**: Periodically re-scrape URLs for updated content
19. **Knowledge graph / relationships**: Link related KB items
20. **Usage analytics**: Which KB items are referenced most in generation
21. **Collaborative KB**: Team members can contribute and curate
22. **Version history**: Track changes to KB items over time
23. **AI-suggested knowledge gaps**: "You write about X but have no KB entries for it"

---

## Key Takeaways for Content Studio

### 1. NotebookLM Is the North Star for Research-Backed Content
- Source-grounded generation with inline citations is the gold standard
- The check/uncheck source selection UI is simple and powerful
- Deep Research for web-sourced knowledge is a killer feature
- Audio Overviews (AI podcast from sources) directly overlaps with Content Studio's podcast feature

### 2. Jasper's Brand Voice Model Is the North Star for Content Consistency
- Three-pillar approach (Voice + Knowledge + Style) is well-structured
- Knowledge base items enrich generation with facts; voice/style control tone
- Content Studio should separate "what to know" (KB) from "how to sound" (personas/brand voice)

### 3. The `#` Reference Pattern Is a UI Standard
- Both Jasper and Copy.ai use `#` to reference knowledge in prompts
- This is familiar to users and easy to implement
- Content Studio could use `#` to reference KB items when configuring content generation

### 4. Organization Should Be Simple But Flexible
- Most platforms use flat or 2-level hierarchy (not deep nesting)
- Tags + collections/folders cover 90% of organization needs
- Cross-project/global knowledge (like Copy.ai's Infobase) is more useful than per-project silos
- Allow both global KB and per-project/per-content scoping

### 5. Deep Research Is the Next Frontier
- Google Deep Research API is now available for integration
- NotebookLM, ChatGPT, and Perplexity all offer deep research
- Content Studio could differentiate by integrating research directly into the content creation workflow
- "Research this topic" -> KB entries -> generate podcast/article/voiceover

### 6. URL Ingestion Is Expected but Under-Delivered
- Most platforms support URLs but extraction quality varies
- Firecrawl or Jina Reader can provide clean content extraction
- Auto-refresh for URLs is a differentiator almost no one does well

### 7. Source Attribution Builds Trust
- NotebookLM and Perplexity always cite sources -- users love this
- Content Studio should track which KB items informed each generation
- This also helps users understand and improve their KB over time

### 8. File Limits Are a Common Pain Point
- ChatGPT: 20 files per project
- NotebookLM: 50-600 sources per notebook
- Content Studio should aim for generous limits or usage-based pricing rather than hard caps

### 9. Content Repurposing Is the Killer Use Case
- One piece of knowledge -> podcast episode + blog post + social clips + voiceover
- Descript's transcript-as-knowledge approach maps well to podcast workflows
- The KB should be content-type agnostic: same knowledge feeds all output types

### 10. Privacy & Data Control Matter
- Users want to know: Is my data used for training? Where is it stored?
- Self-hosted options or clear data policies are competitive advantages
- Allow users to fully delete knowledge (including from vector stores)
