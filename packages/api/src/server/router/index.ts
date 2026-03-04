import activityRouter from './activity';
import chatRouter from './chat';
import eventsRouter from './events';
import infographicRouter from './infographic';
import personaRouter from './persona';
import podcastRouter from './podcast';
import sourceRouter from './source';
import voiceoverRouter from './voiceover';
import voicesRouter from './voices';

export const appRouter = {
  admin: activityRouter,
  chat: chatRouter,
  sources: sourceRouter,
  events: eventsRouter,
  infographics: infographicRouter,
  personas: personaRouter,
  podcasts: podcastRouter,
  voiceovers: voiceoverRouter,
  voices: voicesRouter,
};
