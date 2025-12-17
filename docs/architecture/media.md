# Media Architecture

Media entities are generated outputs derived from source content. Currently: podcasts. Future: video, graphics, articles, social posts.

## Content Flow

```
Source Documents
      │
      ▼
  Generation (AI)
      │
      ▼
Generated Media (draft)
      │
      ▼
 Compliance Check
      │
      ▼
 Published Output
```

## Data Model

**Source content** lives in projects. Projects track which documents they contain.

**Generated media** references:
- The project it belongs to (1:1)
- The source documents used (direct array of IDs, no junction table)
- Generation context (prompts, model info) for audit

**Publication state** tracked on the media entity:
- Draft: Generated but not published
- Ready: User has marked as ready for review
- Published: Passed compliance, available for distribution
- Rejected: Failed compliance check

## Generation Pipeline

1. User selects source documents from project
2. Script generation: LLM creates structured content
3. Audio/video synthesis: AI produces media file
4. Store result with references to sources

Long-running operations use background jobs. Client polls for status.

## Compliance & Export

Publishing requires passing compliance gates:

| Gate | Purpose |
|------|---------|
| Ownership | User owns all source documents |
| Readiness | Content has required artifacts (audio URL, etc.) |
| Constraints | Length/size within acceptable bounds |

Gates are pluggable. Add new checks without modifying core logic.

**Export flow**:
1. Check compliance (dry run)
2. If blocked, return list of issues
3. If warnings only, user can proceed
4. On publish: update status, record who/when

## Adding Media Types

Each media type follows the same pattern:

1. **Schema**: Table with `projectId`, `sourceDocumentIds[]`, publish fields
2. **Service**: Generation logic, CRUD operations
3. **API**: Contract and handlers
4. **Compliance**: Reuse existing gates, add type-specific ones

No junction tables. No polymorphic resolution. Just direct relationships.

## Future Media Types

| Type | AI Pipeline | Format |
|------|-------------|--------|
| Video | Script → TTS → Video gen | MP4 |
| Article | Source → LLM → HTML/MD | Markdown |
| Graphic | Prompt → Image gen | PNG/SVG |
| Social | Source → Short-form | Platform-specific |

All share: project containment, source tracking, compliance, publish workflow.
