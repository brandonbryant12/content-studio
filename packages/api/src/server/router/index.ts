import documentRouter from './document';
import infographicRouter from './infographic';
import podcastRouter from './podcast';
import voiceoverRouter from './voiceover';
import voicesRouter from './voices';

export const appRouter = {
  documents: documentRouter,
  infographics: infographicRouter,
  podcasts: podcastRouter,
  voiceovers: voiceoverRouter,
  voices: voicesRouter,
};
