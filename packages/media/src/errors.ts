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
  ScriptNotFound,
  PodcastError,
  NotPodcastOwner,
  ProjectNotFound,
  MediaNotFound,
  UrlFetchError,
  InvalidUrlError,
  VoiceoverNotFound,
  VoiceoverError,
  InvalidVoiceoverAudioGeneration,
  InfographicNotFound,
  NotInfographicOwner,
  InfographicError,
  StylePresetNotFound,
  PersonaNotFound,
  NotPersonaOwner,
  AdminUserNotFound,
} from './errors/index';

import type {
  SourceNotFound,
  SourceError,
  SourceTooLargeError,
  UnsupportedSourceFormat,
  SourceParseError,
  SourceContentNotFound,
  SourceAlreadyProcessing,
  DeepResearchDisabled,
  PodcastNotFound,
  ScriptNotFound,
  PodcastError,
  NotPodcastOwner,
  ProjectNotFound,
  MediaNotFound,
  UrlFetchError,
  InvalidUrlError,
  VoiceoverNotFound,
  VoiceoverError,
  InvalidVoiceoverAudioGeneration,
  InfographicNotFound,
  NotInfographicOwner,
  InfographicError,
  StylePresetNotFound,
  PersonaNotFound,
  NotPersonaOwner,
  AdminUserNotFound,
} from './errors/index';

export type MediaError =
  | SourceNotFound
  | SourceError
  | SourceTooLargeError
  | UnsupportedSourceFormat
  | SourceParseError
  | SourceContentNotFound
  | UrlFetchError
  | InvalidUrlError
  | SourceAlreadyProcessing
  | DeepResearchDisabled
  | PodcastNotFound
  | ScriptNotFound
  | PodcastError
  | ProjectNotFound
  | MediaNotFound
  | NotPodcastOwner
  | VoiceoverNotFound
  | VoiceoverError
  | InvalidVoiceoverAudioGeneration
  | InfographicNotFound
  | NotInfographicOwner
  | InfographicError
  | StylePresetNotFound
  | PersonaNotFound
  | NotPersonaOwner
  | AdminUserNotFound;
