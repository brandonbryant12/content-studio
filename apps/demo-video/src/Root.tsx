import { Composition } from "remotion";
import { DemoVideo, DemoVideoProps } from "./DemoVideo";

const FPS = 30;
const DURATION_SECONDS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="DemoVideo"
        component={DemoVideo}
        durationInFrames={DURATION_SECONDS * FPS}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          tagline: "Create podcasts in minutes",
          musicFile: "music.mp3", // Add your music file to public/music.mp3
        } satisfies DemoVideoProps}
      />
      {/* Version without music for testing */}
      <Composition
        id="DemoVideo-NoMusic"
        component={DemoVideo}
        durationInFrames={DURATION_SECONDS * FPS}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          tagline: "Create podcasts in minutes",
        } satisfies DemoVideoProps}
      />
    </>
  );
};
