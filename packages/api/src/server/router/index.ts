import documentRouter from './document';
import podcastRouter from './podcast';
import postRouter from './post';
import projectRouter from './projects';
import voicesRouter from './voices';

export const appRouter = {
  documents: documentRouter,
  podcasts: podcastRouter,
  posts: postRouter,
  projects: projectRouter,
  voices: voicesRouter,
};
