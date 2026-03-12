import type { AdminUserNotFound } from './errors/admin-errors';
import type {
  InfographicError,
  InfographicNotFound,
  NotInfographicOwner,
  StylePresetNotFound,
} from './errors/infographic-errors';
import type { NotPersonaOwner, PersonaNotFound } from './errors/persona-errors';
import type {
  NotPodcastOwner,
  PodcastError,
  PodcastNotFound,
  ScriptNotFound,
} from './errors/podcast-errors';
import type { MediaNotFound, ProjectNotFound } from './errors/project-errors';
import type {
  DeepResearchDisabled,
  SourceAlreadyProcessing,
  SourceContentNotFound,
  SourceError,
  SourceNotFound,
  SourceParseError,
  SourceTooLargeError,
  UnsupportedSourceFormat,
} from './errors/source-errors';
import type { InvalidUrlError, UrlFetchError } from './errors/url-errors';
import type {
  InvalidVoiceoverAudioGeneration,
  VoiceoverError,
  VoiceoverNotFound,
} from './errors/voiceover-errors';

export {
  SourceNotFound,
  SourceError,
  SourceTooLargeError,
  UnsupportedSourceFormat,
  SourceParseError,
  SourceContentNotFound,
  SourceAlreadyProcessing,
  DeepResearchDisabled,
} from './errors/source-errors';
export {
  PodcastNotFound,
  ScriptNotFound,
  PodcastError,
  NotPodcastOwner,
} from './errors/podcast-errors';
export { ProjectNotFound, MediaNotFound } from './errors/project-errors';
export { UrlFetchError, InvalidUrlError } from './errors/url-errors';
export {
  VoiceoverNotFound,
  VoiceoverError,
  InvalidVoiceoverAudioGeneration,
} from './errors/voiceover-errors';
export {
  InfographicNotFound,
  NotInfographicOwner,
  InfographicError,
  StylePresetNotFound,
} from './errors/infographic-errors';
export { PersonaNotFound, NotPersonaOwner } from './errors/persona-errors';
export { AdminUserNotFound } from './errors/admin-errors';

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
