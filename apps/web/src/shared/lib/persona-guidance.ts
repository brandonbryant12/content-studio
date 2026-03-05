export const PERSONA_DEFINITION =
  'Personas are reusable podcast host profiles that keep the same point of view, speaking style, and optional voice across episodes.';

export const PERSONA_LIST_SUPPORT =
  'Use them for recurring shows, audience-specific explainers, or client-specific hosts with baked-in priorities and terminology.';

export const PERSONA_ASSIGNMENT_HELP =
  'When selected in a podcast, persona details shape how the script sounds. If the persona has a saved voice, that voice becomes the default for audio.';

export const PERSONA_TOOLTIP_HELP =
  'Use personas to keep a host or client voice consistent across episodes. If a persona has a saved voice, it becomes the default for audio.';

export const PERSONA_USE_CASES = [
  {
    title: 'Recurring show host',
    description:
      'Reuse the same persona every episode so listeners hear a familiar perspective and cadence.',
  },
  {
    title: 'Client-specific voice',
    description:
      'Bake in client priorities, terminology, and emphasis so their content stays on-message.',
  },
  {
    title: 'Audience-tailored expert',
    description:
      'Create separate personas when founders, operators, or executives need different framing on the same topic.',
  },
] as const;

export const PERSONA_CHAT_DESCRIPTION =
  'Describe the host or spokesperson you want to reuse across podcasts. I will help define their perspective, speaking style, and default voice.';

export const PERSONA_CHAT_PROMPT_INTRO =
  'Start with the audience or repeat use case. Try one of these:';

export const PERSONA_FIELD_HELP = {
  name: 'This is the speaker name shown in podcast scripts.',
  role: 'Capture the lens listeners should hear from, like analyst, advisor, or host.',
  personalityDescription:
    'Describe the persona perspective, priorities, and what they emphasize for this audience.',
  speakingStyle:
    'Describe cadence, energy, and recurring verbal habits so episodes sound consistent.',
  exampleQuotes:
    'Add short in-character lines to anchor phrasing, rhythm, and favorite turns of phrase.',
} as const;

export const PERSONA_DETAIL_GUIDANCE = [
  'Podcast scripts use the name, role, personality, speaking style, and quotes to shape how this host speaks.',
  'Reuse one persona across episodes when you want a consistent host voice for the same audience.',
  'Create separate personas for different clients or audience segments when their priorities or terminology differ.',
] as const;

export const PERSONA_PICKER_EMPTY_DESCRIPTION =
  'Create one to keep a recurring host or client voice consistent across podcasts.';

export const PERSONA_PODCAST_SECTION_HELP =
  'Select a persona to keep the same host perspective across episodes. Saved persona voices replace manual voice selection.';
