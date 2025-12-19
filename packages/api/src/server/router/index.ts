import documentRouter from './document';
import podcastRouter from './podcast';
import voicesRouter from './voices';

export const appRouter = {
  documents: documentRouter,
  podcasts: podcastRouter,
  voices: voicesRouter,
};
