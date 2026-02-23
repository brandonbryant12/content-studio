import activityRouter from './activity';
import chatRouter from './chat';
import documentRouter from './document';
import eventsRouter from './events';
import infographicRouter from './infographic';
import personaRouter from './persona';
import podcastRouter from './podcast';
import slideDeckRouter from './slide-deck';
import voiceoverRouter from './voiceover';
import voicesRouter from './voices';

export const appRouter = {
  admin: activityRouter,
  chat: chatRouter,
  documents: documentRouter,
  events: eventsRouter,
  infographics: infographicRouter,
  personas: personaRouter,
  podcasts: podcastRouter,
  slideDecks: slideDeckRouter,
  voiceovers: voiceoverRouter,
  voices: voicesRouter,
};
