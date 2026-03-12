import { Layer } from 'effect';
import type { ActivityLogRepo } from './activity';
import type { AdminRepo } from './admin';
import type { InfographicRepo, StylePresetRepo } from './infographic';
import type { PersonaRepo } from './persona';
import type { PodcastRepo } from './podcast';
import type { SourceRepo } from './source';
import type { VoiceoverRepo } from './voiceover';
import type { Db } from '@repo/db/effect';
import type { Storage } from '@repo/storage';
import { ActivityLogRepoLive } from './activity';
import { AdminRepoLive } from './admin';
import { InfographicRepoLive, StylePresetRepoLive } from './infographic';
import { PersonaRepoLive } from './persona';
import { PodcastRepoLive } from './podcast';
import { SourceRepoLive } from './source';
import { VoiceoverRepoLive } from './voiceover';

export {
  SourceNotFound,
  SourceError,
  SourceTooLargeError,
  UnsupportedSourceFormat,
  SourceParseError,
  SourceContentNotFound,
  SourceAlreadyProcessing,
  DeepResearchDisabled,
  PodcastNotFound,
  PodcastError,
  ScriptNotFound,
  NotPodcastOwner,
  VoiceoverNotFound,
  VoiceoverError,
  InvalidVoiceoverAudioGeneration,
  ProjectNotFound,
  MediaNotFound,
  UrlFetchError,
  InvalidUrlError,
  InfographicNotFound,
  NotInfographicOwner,
  InfographicError,
  StylePresetNotFound,
  AdminUserNotFound,
  PersonaNotFound,
  NotPersonaOwner,
  type MediaError,
} from './errors';

export type Media =
  | ActivityLogRepo
  | AdminRepo
  | InfographicRepo
  | PersonaRepo
  | PodcastRepo
  | SourceRepo
  | StylePresetRepo
  | VoiceoverRepo;

export const MediaLive: Layer.Layer<Media, never, Db | Storage> =
  Layer.mergeAll(
    ActivityLogRepoLive,
    AdminRepoLive,
    InfographicRepoLive,
    PersonaRepoLive,
    PodcastRepoLive,
    SourceRepoLive,
    StylePresetRepoLive,
    VoiceoverRepoLive,
  );
