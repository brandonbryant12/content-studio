import podcastRouter from './podcast';
import postRouter from './post';
import voicesRouter from './voices';

export const appRouter = {
  podcasts: podcastRouter,
  posts: postRouter,
  voices: voicesRouter,
};
