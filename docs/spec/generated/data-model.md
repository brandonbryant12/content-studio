# Data Model Surface (Generated)

- Tables: 14
- Enums: 9

## Tables

| Table | Symbol | Source |
|---|---|---|
| account | `account` | `packages/db/src/schemas/auth.ts` |
| activity_log | `activityLog` | `packages/db/src/schemas/activity-log.ts` |
| ai_usage_event | `aiUsageEvent` | `packages/db/src/schemas/ai-usage-events.ts` |
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
