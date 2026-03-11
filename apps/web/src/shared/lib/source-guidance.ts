import { APP_NAME } from '@/constants';

export const DEEP_RESEARCH_NAME = 'Deep Research';

export const SOURCE_DEFINITION = `Sources are reusable reference materials that ${APP_NAME} turns into podcasts, voiceovers, infographics, and future edits.`;

export const SOURCE_LIST_SUPPORT =
  'Each source stores extracted text from reusable inputs so you can reference the same facts more than once.';

export const SOURCE_ASSIGNMENT_HELP =
  'Selected sources ground the output. They shape the facts, examples, and claims the model can pull from.';

export const SOURCE_DETAIL_HELP =
  'Review the extracted content here, rename it if needed, search within it, and reuse it across new outputs without uploading it again.';

export const SOURCE_MANAGER_HELP =
  'Pick the sources this podcast should rely on. Reusing strong sources keeps episodes consistent and easier to update later.';

export const SOURCE_WIZARD_STEP_DESCRIPTION =
  'Choose the sources this episode should draw from. You can reuse existing sources or create new ones here.';

export const SOURCE_WIZARD_STEP_HELP =
  'Each selected source becomes part of the factual context for the script.';

export const SOURCE_URL_DIALOG_DESCRIPTION =
  'Save a public web page as a reusable source. We extract the page text and store it for future content.';

export const SOURCE_URL_DIALOG_HELP =
  'Best for a single public article, blog post, or docs page you want to reference again.';

export const SOURCE_UPLOAD_DIALOG_DESCRIPTION =
  'Upload a file and turn it into a reusable source for future podcasts and other content.';

export const SOURCE_UPLOAD_DIALOG_HELP =
  'Good for reports, transcripts, decks, meeting notes, and other files you already have.';

export const SOURCE_RESEARCH_DIALOG_DESCRIPTION =
  'Describe a topic and AI will create a reusable research source with citations you can review and reuse later.';

export const SOURCE_RESEARCH_DIALOG_PROMPT =
  'What topic should become a reusable research source? Try one of these:';

export const SOURCE_MANAGER_DIALOG_DESCRIPTION =
  'Choose existing sources or create a new one for this podcast.';

export const SOURCE_MANAGER_DIALOG_HELP =
  'Use existing sources when you already trust the material. Upload a file or add a URL when you need a new input without leaving this workflow.';

export const SOURCE_PICKER_EMPTY_DESCRIPTION =
  'No reusable sources are available yet. Upload a file or save a URL to start grounding your content.';

export const SOURCE_IMPORT_OPTIONS = [
  {
    title: 'Upload a file',
    description: 'Use reports, transcripts, decks, or notes you already have.',
  },
  {
    title: 'Add a public URL',
    description:
      'Save a single article, blog post, or docs page as a reusable source.',
  },
  {
    title: DEEP_RESEARCH_NAME,
    description:
      'Let AI gather citations around a topic and create a source you can review later.',
  },
] as const;
