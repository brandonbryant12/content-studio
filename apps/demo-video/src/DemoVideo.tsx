import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import {
  HookScene,
  FeatureUpload,
  FeatureAI,
  FeatureVoices,
  CTAScene,
} from "./scenes";

export type DemoVideoProps = {
  tagline: string;
  musicFile?: string;
};

// Scene durations in frames (at 30fps) - 30 second total
const SCENE_DURATIONS = {
  hook: 105, // 3.5s
  upload: 180, // 6s
  ai: 165, // 5.5s
  voices: 165, // 5.5s
  cta: 195, // 6.5s
};

const TRANSITION_DURATION = 15;

export const DemoVideo: React.FC<DemoVideoProps> = ({ tagline, musicFile }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Audio volume with fade in/out
  const getVolume = () => {
    const fadeInEnd = 1.5 * fps; // 1.5 second fade in
    const fadeOutStart = durationInFrames - 2 * fps; // 2 second fade out

    if (frame < fadeInEnd) {
      return interpolate(frame, [0, fadeInEnd], [0, 0.5]);
    }
    if (frame > fadeOutStart) {
      return interpolate(frame, [fadeOutStart, durationInFrames], [0.5, 0]);
    }
    return 0.5;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#0F172A" }}>
      {/* Background music */}
      {musicFile && (
        <Audio src={staticFile(musicFile)} volume={getVolume()} />
      )}

      <TransitionSeries>
        {/* Hook */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.hook}>
          <HookScene tagline={tagline} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION_DURATION })}
        />

        {/* Upload Documents */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.upload}>
          <FeatureUpload />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION_DURATION })}
        />

        {/* AI Generation */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.ai}>
          <FeatureAI />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION_DURATION })}
        />

        {/* Voiceovers */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.voices}>
          <FeatureVoices />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION_DURATION })}
        />

        {/* CTA */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.cta}>
          <CTAScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
