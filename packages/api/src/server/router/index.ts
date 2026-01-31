import brandRouter from './brand';
import documentRouter from './document';
import podcastRouter from './podcast';
import voiceoverRouter from './voiceover';
import voicesRouter from './voices';

export const appRouter = {
  brands: brandRouter,
  documents: documentRouter,
  podcasts: podcastRouter,
  voiceovers: voiceoverRouter,
  voices: voicesRouter,
};
