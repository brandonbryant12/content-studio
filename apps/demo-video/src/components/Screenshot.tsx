import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors } from "../styles/colors";

interface ScreenshotProps {
  src: string;
  delay?: number;
  scale?: number;
  width?: number;
  zoomIn?: boolean;
  float?: boolean;
}

export const Screenshot: React.FC<ScreenshotProps> = ({
  src,
  delay = 0,
  scale = 0.85,
  width = 1400,
  zoomIn = true,
  float = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entry animation
  const entryProgress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 20, stiffness: 100 },
  });

  const entryScale = interpolate(entryProgress, [0, 1], [0.9, 1]);
  const opacity = interpolate(entryProgress, [0, 0.3, 1], [0, 0.8, 1]);
  const translateY = interpolate(entryProgress, [0, 1], [60, 0]);

  // Subtle zoom effect over time
  const zoomProgress = zoomIn
    ? interpolate(frame - delay, [0, 200], [1, 1.05], { extrapolateRight: "clamp" })
    : 1;

  // Floating effect
  const floatY = float ? Math.sin((frame - delay) / 25) * 4 : 0;

  // Glow pulse
  const glowIntensity = 0.4 + Math.sin((frame - delay) / 30) * 0.15;

  return (
    <div
      style={{
        transform: `scale(${entryScale * scale * zoomProgress}) translateY(${translateY + floatY}px)`,
        opacity,
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: `
          0 0 80px ${colors.primary}${Math.round(glowIntensity * 60).toString(16).padStart(2, "0")},
          0 25px 60px -15px rgba(0, 0, 0, 0.6),
          0 0 0 1px ${colors.primary}30
        `,
        position: "relative",
      }}
    >
      {/* Gradient overlay for depth */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, transparent 70%, ${colors.background}40 100%)`,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      <Img src={staticFile(src)} style={{ width, display: "block" }} />
    </div>
  );
};
