import { AbsoluteFill } from "remotion";
import { GradientBackground, AnimatedText, Logo } from "../components";
import { colors } from "../styles/colors";

interface HookSceneProps {
  tagline: string;
}

export const HookScene: React.FC<HookSceneProps> = ({ tagline }) => {
  return (
    <AbsoluteFill>
      <GradientBackground gradient="dark" animate pulseIntensity={0.08} />

      {/* Gradient orb */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 500,
          height: 500,
          background: `radial-gradient(circle, ${colors.primary}40 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />

      {/* Logo + Tagline */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          gap: 40,
        }}
      >
        <Logo size={100} delay={5} showText={false} glowIntensity={1.5} />
        <AnimatedText
          text={tagline}
          fontSize={80}
          wordByWord
          wordDelay={5}
          delay={15}
          style={{
            textShadow: `0 0 40px ${colors.primary}60`,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
