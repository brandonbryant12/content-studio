import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBackground, Logo } from "../components";
import { colors } from "../styles/colors";

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Everything fades in from dark
  const fadeProgress = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  const comingSoonProgress = spring({
    frame: frame - 50,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const comingSoonScale = interpolate(comingSoonProgress, [0, 1], [0.8, 1]);
  const comingSoonOpacity = interpolate(comingSoonProgress, [0, 1], [0, 1]);

  // Subtle pulse for CTA
  const pulse = Math.sin(frame / 20) * 0.05 + 1;

  return (
    <AbsoluteFill>
      <GradientBackground gradient="dark" />

      {/* Gradient overlay that fades in */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at center, ${colors.primary}15 0%, transparent 60%)`,
          opacity: fadeProgress,
        }}
      />

      {/* Multiple gradient orbs */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "30%",
          width: 400,
          height: 400,
          background: `radial-gradient(circle, ${colors.primary}20 0%, transparent 70%)`,
          filter: "blur(100px)",
          opacity: fadeProgress,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "20%",
          right: "30%",
          width: 350,
          height: 350,
          background: `radial-gradient(circle, ${colors.secondary}20 0%, transparent 70%)`,
          filter: "blur(80px)",
          opacity: fadeProgress,
        }}
      />

      {/* Logo centered */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 100,
        }}
      >
        <div style={{ opacity: fadeProgress }}>
          <Logo size={180} delay={15} showText glowIntensity={1.5} />
        </div>
      </AbsoluteFill>

      {/* Coming Soon text */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 150,
        }}
      >
        <div
          style={{
            transform: `scale(${comingSoonScale * pulse})`,
            opacity: comingSoonOpacity,
          }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              fontFamily: "system-ui, -apple-system, sans-serif",
              color: colors.text,
              textShadow: `0 0 60px ${colors.primary}60`,
              letterSpacing: "0.1em",
            }}
          >
            Coming Soon
          </div>
        </div>
      </AbsoluteFill>

      {/* Website URL (subtle) */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 60,
        }}
      >
        <div
          style={{
            opacity: interpolate(frame, [80, 100], [0, 0.6], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            fontSize: 20,
            color: colors.textMuted,
            fontFamily: "system-ui, -apple-system, sans-serif",
            letterSpacing: "0.05em",
          }}
        >
          contentstudio.ai
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
