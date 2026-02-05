import audienceSegmentRouter from './audience-segment';
import documentRouter from './document';
import personaRouter from './persona';
import podcastRouter from './podcast';
import voiceoverRouter from './voiceover';
import voicesRouter from './voices';

export const appRouter = {
  audienceSegments: audienceSegmentRouter,
  documents: documentRouter,
  personas: personaRouter,
  podcasts: podcastRouter,
  voiceovers: voiceoverRouter,
  voices: voicesRouter,
};
