import { AbsoluteFill } from "remotion";
import { GradientBackground, AnimatedText, Screenshot } from "../components";
import { colors } from "../styles/colors";

export const FeatureAI: React.FC = () => {
  return (
    <AbsoluteFill>
      <GradientBackground gradient="dark" />

      {/* Gradient orbs */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "10%",
          width: 450,
          height: 450,
          background: `radial-gradient(circle, ${colors.secondary}25 0%, transparent 70%)`,
          filter: "blur(90px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "20%",
          right: "15%",
          width: 300,
          height: 300,
          background: `radial-gradient(circle, ${colors.accent}20 0%, transparent 70%)`,
          filter: "blur(60px)",
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
          text="Generate podcasts with AI"
          fontSize={64}
          delay={5}
          style={{ textShadow: `0 0 40px ${colors.secondary}50` }}
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
        <Screenshot src="screenshots/podcast-editor.png" delay={15} scale={0.75} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
