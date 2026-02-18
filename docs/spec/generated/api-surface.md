# API Contract Surface (Generated)

- Endpoints: 59
- Tags: admin, chat, document, events, infographic, persona, podcast, voiceover, voices

| Method | Path | Operation ID | Tags | Streaming | Summary |
|---|---|---|---|---|---|
| GET | /admin/activity/ | admin.list | admin | no | List activity log |
| GET | /admin/activity/stats | admin.stats | admin | no | Get activity stats |
| POST | /chat/persona-chat | chat.personaChat | chat | yes |  |
| POST | /chat/research | chat.research | chat | yes |  |
| POST | /chat/synthesize-persona | chat.synthesizePersona | chat | no |  |
| POST | /chat/synthesize-research-query | chat.synthesizeResearchQuery | chat | no |  |
| POST | /chat/writing-assistant | chat.writingAssistant | chat | yes |  |
| GET | /documents/ | documents.list | document | no | List documents |
| POST | /documents/ | documents.create | document | no | Create document |
| GET | /documents/{id} | documents.get | document | no | Get document |
| PATCH | /documents/{id} | documents.update | document | no | Update document |
| DELETE | /documents/{id} | documents.delete | document | no | Delete document |
| GET | /documents/{id}/content | documents.getContent | document | no | Get document content |
| POST | /documents/{id}/retry | documents.retry | document | no | Retry processing |
| POST | /documents/from-research | documents.fromResearch | document | no | Create from research |
| POST | /documents/from-url | documents.fromUrl | document | no | Create from URL |
| POST | /documents/upload | documents.upload | document | no | Upload document |
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
