import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { colors } from "../styles/colors";

type GradientType = keyof typeof colors.gradients;

interface GradientBackgroundProps {
  gradient?: GradientType;
  animate?: boolean;
  pulseIntensity?: number;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  gradient = "dark",
  animate = false,
  pulseIntensity = 0.1,
}) => {
  const frame = useCurrentFrame();

  const opacity = animate
    ? interpolate(Math.sin(frame / 30), [-1, 1], [1 - pulseIntensity, 1])
    : 1;

  return (
    <AbsoluteFill
      style={{
        background: colors.gradients[gradient],
        opacity,
      }}
    />
  );
};
