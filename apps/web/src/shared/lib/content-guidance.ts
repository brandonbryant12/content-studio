export const PODCAST_DEFINITION =
  'Podcasts turn your sources into an AI-generated script and audio draft you can review, edit, and regenerate.';

export const PODCAST_LIST_SUPPORT =
  'Start with one or more sources, optionally assign personas for recurring hosts, then guide the AI with duration and script direction.';

export const PODCAST_FLOW_STEPS = [
  {
    title: 'Start from sources',
    description:
      'Choose the reports, web pages, or research briefs the episode should draw from.',
  },
  {
    title: 'Optionally add personas',
    description:
      'Assign personas when you want a recurring host voice or audience-specific point of view.',
  },
  {
    title: 'Generate, edit, iterate',
    description:
      'The first script draft is AI-generated. Edit lines manually or update script direction to tell AI what to change before regenerating.',
  },
] as const;

export const PODCAST_SCRIPT_HELP =
  'This script starts as an AI-generated draft from your selected sources and settings. You can edit any line manually, then save to regenerate audio, or update script direction to tell AI how the next draft should change.';

export const VOICEOVER_DEFINITION =
  'Voiceovers turn written narration into spoken audio with your chosen voice.';

export const VOICEOVER_LIST_SUPPORT =
  'Write the script yourself or use the Writing Assistant to refine the draft before generating audio.';

export const VOICEOVER_FLOW_STEPS = [
  {
    title: 'Write or paste a draft',
    description:
      'Start with the narration you want spoken, even if it is rough.',
  },
  {
    title: 'Use the Writing Assistant',
    description:
      'Ask AI for hooks, rewrites, shorter reads, or tone shifts using the current script as context.',
  },
  {
    title: 'Generate audio',
    description:
      'Choose a voice, generate the read, then keep refining the script until it lands.',
  },
] as const;

export const WRITING_ASSISTANT_HELP =
  'The Writing Assistant uses your current script as context. Ask it for stronger openings, tighter pacing, tone changes, or alternate phrasings, then apply the rewrites directly to the editor.';

export const INFOGRAPHIC_DEFINITION =
  'Infographics turn a prompt into a generated visual draft that you can refine through prompt, style, and format changes.';

export const INFOGRAPHIC_LIST_SUPPORT =
  'Start from a written prompt, choose a format, then iterate on new versions without losing the earlier ones.';

export const INFOGRAPHIC_FLOW_STEPS = [
  {
    title: 'Describe the outcome',
    description:
      'Explain the visual you want in plain English so the first draft has a clear direction.',
  },
  {
    title: 'Choose format and style',
    description:
      'Set the aspect ratio and style controls that shape the final look.',
  },
  {
    title: 'Generate new versions',
    description:
      'Keep the good versions, then iterate with new prompt instructions instead of starting over.',
  },
] as const;

export const INFOGRAPHIC_PROMPT_HELP =
  'The prompt is the main creative brief for the image. Use it to describe the visual goal, content hierarchy, and tone you want the generator to aim for.';

export const INFOGRAPHIC_CREATE_HELP =
  'Create a draft if you want to set things up first, or add a prompt now to generate the first version immediately.';
