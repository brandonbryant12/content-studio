import documentRouter from './document';
import podcastRouter from './podcast';
import projectRouter from './projects';
import voicesRouter from './voices';

export const appRouter = {
  documents: documentRouter,
  podcasts: podcastRouter,
  projects: projectRouter,
  voices: voicesRouter,
};
