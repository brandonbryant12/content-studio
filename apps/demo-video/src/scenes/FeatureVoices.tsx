import { AbsoluteFill } from "remotion";
import { GradientBackground, AnimatedText, Screenshot } from "../components";
import { colors } from "../styles/colors";

export const FeatureVoices: React.FC = () => {
  return (
    <AbsoluteFill>
      <GradientBackground gradient="dark" />

      {/* Gradient orbs */}
      <div
        style={{
          position: "absolute",
          top: "25%",
          right: "10%",
          width: 400,
          height: 400,
          background: `radial-gradient(circle, ${colors.accent}25 0%, transparent 70%)`,
          filter: "blur(80px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "25%",
          left: "10%",
          width: 350,
          height: 350,
          background: `radial-gradient(circle, ${colors.primary}20 0%, transparent 70%)`,
          filter: "blur(70px)",
        }}
      />

      {/* Title */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          paddingTop: 50,
        }}
      >
        <AnimatedText
          text="Create voiceovers instantly"
          fontSize={64}
          delay={5}
          style={{ textShadow: `0 0 40px ${colors.accent}50` }}
        />
      </AbsoluteFill>

      {/* Screenshot */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingTop: 60,
        }}
      >
        <Screenshot src="screenshots/voiceover-editor.png" delay={15} scale={0.75} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
