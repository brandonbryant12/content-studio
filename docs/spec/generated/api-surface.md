# API Contract Surface (Generated)

- Endpoints: 63
- Tags: admin, chat, events, infographic, persona, podcast, source, voiceover, voices

| Method | Path | Operation ID | Tags | Streaming | Summary |
|---|---|---|---|---|---|
| GET | /admin/activity/ | admin.activity.list | admin | no | List activity log |
| GET | /admin/activity/stats | admin.activity.stats | admin | no | Get activity stats |
| GET | /admin/users/ | admin.users.search | admin | no | Search users |
| GET | /admin/users/{userId} | admin.users.get | admin | no | Get admin user detail |
| GET | /admin/users/{userId}/entities | admin.users.entities | admin | no | List admin user entities |
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
| POST | /podcasts/{id}/generate-plan | podcasts.generatePlan | podcast | no | Generate episode plan |
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
