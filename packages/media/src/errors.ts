export {
  DocumentNotFound,
  DocumentError,
  DocumentTooLargeError,
  UnsupportedDocumentFormat,
  DocumentParseError,
  DocumentContentNotFound,
  DocumentAlreadyProcessing,
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
  PersonaNotFound,
  NotPersonaOwner,
} from './errors/index';

import type {
  DocumentNotFound,
  DocumentError,
  DocumentTooLargeError,
  UnsupportedDocumentFormat,
  DocumentParseError,
  DocumentContentNotFound,
  DocumentAlreadyProcessing,
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
  PersonaNotFound,
  NotPersonaOwner,
} from './errors/index';

export type MediaError =
  | DocumentNotFound
  | DocumentError
  | DocumentTooLargeError
  | UnsupportedDocumentFormat
  | DocumentParseError
  | DocumentContentNotFound
  | UrlFetchError
  | InvalidUrlError
  | DocumentAlreadyProcessing
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
  | PersonaNotFound
  | NotPersonaOwner;
