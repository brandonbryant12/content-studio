import documentRouter from './document';
import podcastRouter from './podcast';
import voiceoverRouter from './voiceover';
import voicesRouter from './voices';

export const appRouter = {
  documents: documentRouter,
  podcasts: podcastRouter,
  voiceovers: voiceoverRouter,
  voices: voicesRouter,
};
