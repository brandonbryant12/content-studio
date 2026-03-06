# Content Studio Master Specification

This document is the source of truth for how Content Studio is expected to behave.
Product-level behavior changes must be proposed through a pull request that updates this spec.

This is a canonical behavior and audit reference, not the recommended first
read for a new owner. Start with
[`docs/onboarding/taking-ownership.md`](./onboarding/taking-ownership.md) if
you are learning the system.

## Governance

1. [`docs/master-spec.md`](./master-spec.md) is the canonical product and system behavior specification.
2. Generated sections are read-only and are refreshed from source code via `pnpm spec:generate`.
3. If code changes alter behavior but do not update the spec artifacts, `pnpm spec:check` must fail.
4. Product owners and engineers approve changes against this document before implementation merges.

## Spec Change Workflow

1. Propose behavior updates in this file (non-generated sections).
2. Run `pnpm spec:generate` to refresh generated sections and artifacts.
3. Include requirement IDs (`SPEC-<DOMAIN>-<NUMBER>`) in PR descriptions and affected tests.
4. Merge only when `pnpm spec:check` passes.

## Scope

This master spec is assembled from:

1. API contracts from `packages/api/src/contracts`
2. Domain use cases from `packages/media/src/*/use-cases`
3. Data model from `packages/db/src/schemas`
4. Web route surface from `apps/web/src/routeTree.gen.ts`
5. Existing standards in `docs/architecture`, `docs/patterns`, `docs/frontend`, and `docs/testing`

## When To Use This Doc

Use this doc when you need to:

1. confirm canonical product behavior before changing code
2. review generated API, domain, data model, or UI surface changes
3. validate that a behavior-changing PR updated the spec correctly

For orientation, runtime understanding, and day-one ownership, use
[`docs/onboarding/taking-ownership.md`](./onboarding/taking-ownership.md) and
[`docs/README.md`](./README.md) first.

## Generated Snapshot Metadata
<!-- BEGIN GENERATED:snapshot-metadata -->
# Snapshot Metadata (Generated)

- Generated at: 2026-03-05T21:24:00.955Z
- Git branch: main
- Git commit: ab071fc4

## Inventory

- API endpoints: 59
- API tags: 9
- Domains: 5
- Use cases: 57
- Database tables: 13
- Database enums: 9
- UI routes: 15
- UI feature modules: 7

## Generated Files

- `docs/spec/generated/openapi.json`
- `docs/spec/generated/api-surface.md`
- `docs/spec/generated/domain-surface.md`
- `docs/spec/generated/data-model.md`
- `docs/spec/generated/ui-surface.md`
<!-- END GENERATED:snapshot-metadata -->

## API Contract Surface
<!-- BEGIN GENERATED:api-surface -->
# API Contract Surface (Generated)

- Endpoints: 59
- Tags: admin, chat, events, infographic, persona, podcast, source, voiceover, voices

| Method | Path | Operation ID | Tags | Streaming | Summary |
|---|---|---|---|---|---|
| GET | /admin/activity/ | admin.list | admin | no | List activity log |
| GET | /admin/activity/stats | admin.stats | admin | no | Get activity stats |
| POST | /chat/persona-chat | chat.personaChat | chat | yes |  |
| POST | /chat/research | chat.research | chat | yes |  |
| POST | /chat/synthesize-persona | chat.synthesizePersona | chat | no |  |
| POST | /chat/synthesize-research-query | chat.synthesizeResearchQuery | chat | no |  |
| POST | /chat/writing-assistant | chat.writingAssistant | chat | yes |  |
| GET | /events/ | events.subscribe | events | yes |  |
| GET | /infographics/ | infographics.list | infographic | no | List infographics |
| POST | /infographics/ | infographics.create | infographic | no | Create infographic |
| GET | /infographics/{id} | infographics.get | infographic | no | Get infographic |
| PATCH | /infographics/{id} | infographics.update | infographic | no | Update infographic |
| DELETE | /infographics/{id} | infographics.delete | infographic | no | Delete infographic |
| POST | /infographics/{id}/approve | infographics.approve | infographic | no | Approve infographic |
| DELETE | /infographics/{id}/approve | infographics.revokeApproval | infographic | no | Revoke approval |
| POST | /infographics/{id}/generate | infographics.generate | infographic | no | Generate infographic |
| GET | /infographics/{id}/versions | infographics.listVersions | infographic | no | List versions |
| GET | /infographics/jobs/{jobId} | infographics.getJob | infographic | no | Get job status |
| GET | /infographics/style-presets/ | infographics.stylePresets.list | infographic | no | List style presets |
| POST | /infographics/style-presets/ | infographics.stylePresets.create | infographic | no | Create style preset |
| DELETE | /infographics/style-presets/{id} | infographics.stylePresets.delete | infographic | no | Delete style preset |
| GET | /personas/ | personas.list | persona | no | List personas |
| POST | /personas/ | personas.create | persona | no | Create persona |
| GET | /personas/{id} | personas.get | persona | no | Get persona |
| PATCH | /personas/{id} | personas.update | persona | no | Update persona |
| DELETE | /personas/{id} | personas.delete | persona | no | Delete persona |
| POST | /personas/{id}/avatar | personas.generateAvatar | persona | no | Generate avatar |
| GET | /podcasts/ | podcasts.list | podcast | no | List podcasts |
| POST | /podcasts/ | podcasts.create | podcast | no | Create podcast |
| GET | /podcasts/{id} | podcasts.get | podcast | no | Get podcast |
| PATCH | /podcasts/{id} | podcasts.update | podcast | no | Update podcast |
| DELETE | /podcasts/{id} | podcasts.delete | podcast | no | Delete podcast |
| POST | /podcasts/{id}/approve | podcasts.approve | podcast | no | Approve podcast |
| DELETE | /podcasts/{id}/approve | podcasts.revokeApproval | podcast | no | Revoke approval |
| POST | /podcasts/{id}/generate | podcasts.generate | podcast | no | Generate podcast |
| POST | /podcasts/{id}/save-changes | podcasts.saveChanges | podcast | no | Save changes and regenerate audio |
| GET | /podcasts/{id}/script | podcasts.getScript | podcast | no | Get script |
| GET | /podcasts/jobs/{jobId} | podcasts.getJob | podcast | no | Get job status |
| GET | /sources/ | sources.list | source | no | List sources |
| POST | /sources/ | sources.create | source | no | Create source |
| GET | /sources/{id} | sources.get | source | no | Get source |
| PATCH | /sources/{id} | sources.update | source | no | Update source |
| DELETE | /sources/{id} | sources.delete | source | no | Delete source |
| GET | /sources/{id}/content | sources.getContent | source | no | Get source content |
| POST | /sources/{id}/retry | sources.retry | source | no | Retry processing |
| POST | /sources/from-research | sources.fromResearch | source | no | Create from research |
| POST | /sources/from-url | sources.fromUrl | source | no | Create from URL |
| POST | /sources/upload | sources.upload | source | no | Upload source |
| GET | /voiceovers/ | voiceovers.list | voiceover | no | List voiceovers |
| POST | /voiceovers/ | voiceovers.create | voiceover | no | Create voiceover |
| GET | /voiceovers/{id} | voiceovers.get | voiceover | no | Get voiceover |
| PATCH | /voiceovers/{id} | voiceovers.update | voiceover | no | Update voiceover |
| DELETE | /voiceovers/{id} | voiceovers.delete | voiceover | no | Delete voiceover |
| POST | /voiceovers/{id}/approve | voiceovers.approve | voiceover | no | Approve voiceover |
| DELETE | /voiceovers/{id}/approve | voiceovers.revokeApproval | voiceover | no | Revoke approval |
| POST | /voiceovers/{id}/generate | voiceovers.generate | voiceover | no | Generate audio |
| GET | /voiceovers/jobs/{jobId} | voiceovers.getJob | voiceover | no | Get job status |
| GET | /voices/ | voices.list | voices | no | List voices |
| POST | /voices/{voiceId}/preview | voices.preview | voices | no | Preview voice |
<!-- END GENERATED:api-surface -->

## Domain Capability Surface
<!-- BEGIN GENERATED:domain-surface -->
# Domain Capability Surface (Generated)

- Domains: 5
- Exported use cases: 57

| Domain | Use Cases | API Endpoints |
|---|---|---|
| infographic | 14 | 13 |
| persona | 6 | 6 |
| podcast | 14 | 11 |
| source | 13 | 10 |
| voiceover | 10 | 9 |

## Use Cases by Domain

### infographic

- `approve-infographic`
- `create-infographic`
- `create-style-preset`
- `delete-infographic`
- `delete-style-preset`
- `execute-generation`
- `generate-infographic`
- `get-infographic`
- `get-infographic-versions`
- `get-job`
- `list-infographics`
- `list-style-presets`
- `revoke-infographic-approval`
- `update-infographic`

### persona

- `create-persona`
- `delete-persona`
- `generate-avatar`
- `get-persona`
- `list-personas`
- `update-persona`

### podcast

- `approve-podcast`
- `create-podcast`
- `delete-podcast`
- `generate-audio`
- `generate-cover-image`
- `generate-script`
- `get-job`
- `get-podcast`
- `list-podcasts`
- `revoke-approval`
- `save-and-queue-audio`
- `save-changes`
- `start-generation`
- `update-podcast`

### source

- `await-sources-ready`
- `create-from-research`
- `create-from-url`
- `create-source`
- `delete-source`
- `get-source`
- `get-source-content`
- `list-sources`
- `process-research`
- `process-url`
- `retry-processing`
- `update-source`
- `upload-source`

### voiceover

- `approve-voiceover`
- `create-voiceover`
- `delete-voiceover`
- `generate-audio`
- `get-job`
- `get-voiceover`
- `list-voiceovers`
- `revoke-approval`
- `start-generation`
- `update-voiceover`
<!-- END GENERATED:domain-surface -->

## Data Model Surface
<!-- BEGIN GENERATED:data-model -->
# Data Model Surface (Generated)

- Tables: 13
- Enums: 9

## Tables

| Table | Symbol | Source |
|---|---|---|
| account | `account` | `packages/db/src/schemas/auth.ts` |
| activity_log | `activityLog` | `packages/db/src/schemas/activity-log.ts` |
| infographic | `infographic` | `packages/db/src/schemas/infographics.ts` |
| infographic_style_preset | `infographicStylePreset` | `packages/db/src/schemas/style-presets.ts` |
| infographic_version | `infographicVersion` | `packages/db/src/schemas/infographics.ts` |
| job | `job` | `packages/db/src/schemas/jobs.ts` |
| persona | `persona` | `packages/db/src/schemas/personas.ts` |
| podcast | `podcast` | `packages/db/src/schemas/podcasts.ts` |
| session | `session` | `packages/db/src/schemas/auth.ts` |
| source | `source` | `packages/db/src/schemas/sources.ts` |
| user | `user` | `packages/db/src/schemas/auth.ts` |
| verification | `verification` | `packages/db/src/schemas/auth.ts` |
| voiceover | `voiceover` | `packages/db/src/schemas/voiceovers.ts` |

## Enums

| Enum | Symbol | Values | Source |
|---|---|---|---|
| content_type | `contentTypeEnum` | source, podcast, video, article, social, graphic | `packages/db/src/schemas/media-types.ts` |
| infographic_format | `infographicFormatEnum` | portrait, square, landscape, og_card | `packages/db/src/schemas/infographics.ts` |
| infographic_status | `infographicStatusEnum` | draft, generating, ready, failed | `packages/db/src/schemas/infographics.ts` |
| job_status | `jobStatusEnum` | pending, processing, completed, failed | `packages/db/src/schemas/jobs.ts` |
| podcast_format | `podcastFormatEnum` | voice_over, conversation | `packages/db/src/schemas/podcasts.ts` |
| source_origin | `sourceOriginEnum` | manual, upload_txt, upload_pdf, upload_docx, upload_pptx, url, research | `packages/db/src/schemas/sources.ts` |
| source_status | `sourceStatusEnum` | ready, processing, failed | `packages/db/src/schemas/sources.ts` |
| version_status | `versionStatusEnum` | drafting, generating_script, script_ready, generating_audio, ready, failed | `packages/db/src/schemas/podcasts.ts` |
| voiceover_status | `voiceoverStatusEnum` | drafting, generating_audio, ready, failed | `packages/db/src/schemas/voiceovers.ts` |
<!-- END GENERATED:data-model -->

## UI Surface
<!-- BEGIN GENERATED:ui-surface -->
# UI Surface (Generated)

- Routes: 15
- Feature modules: 7

## Routes

| Path | Access |
|---|---|
| / | public |
| /admin/activity | protected |
| /dashboard | protected |
| /infographics/ | protected |
| /infographics/$infographicId | protected |
| /login | public |
| /personas/ | protected |
| /personas/$personaId | protected |
| /podcasts/ | protected |
| /podcasts/$podcastId | protected |
| /register | public |
| /sources/ | protected |
| /sources/$sourceId | protected |
| /voiceovers/ | protected |
| /voiceovers/$voiceoverId | protected |

## Feature Modules

- `admin`
- `dashboard`
- `infographics`
- `personas`
- `podcasts`
- `sources`
- `voiceovers`
<!-- END GENERATED:ui-surface -->

## Related Standards

1. [`docs/architecture/overview.md`](./architecture/overview.md)
2. [`docs/architecture/access-control.md`](./architecture/access-control.md)
3. [`docs/architecture/observability.md`](./architecture/observability.md)
4. [`docs/patterns/use-case.md`](./patterns/use-case.md)
5. [`docs/patterns/api-handler.md`](./patterns/api-handler.md)
6. [`docs/testing/overview.md`](./testing/overview.md)
