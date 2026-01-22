import { interpolate, useCurrentFrame } from "remotion";
import { colors } from "../styles/colors";

interface WaveformAnimationProps {
  width?: number;
  height?: number;
  barCount?: number;
  color?: string;
  delay?: number;
  speed?: number;
}

export const WaveformAnimation: React.FC<WaveformAnimationProps> = ({
  width = 400,
  height = 100,
  barCount = 40,
  color = colors.primary,
  delay = 0,
  speed = 1,
}) => {
  const frame = useCurrentFrame();
  const activeFrame = Math.max(0, frame - delay);

  const barWidth = width / barCount - 4;
  const bars = Array.from({ length: barCount }, (_, i) => {
    const phase = i * 0.3;
    const time = (activeFrame * speed) / 10;
    const amplitude = Math.sin(time + phase) * 0.5 + 0.5;
    const secondary = Math.sin(time * 1.5 + phase * 2) * 0.3;
    const barHeight = interpolate(
      amplitude + secondary,
      [0, 1.3],
      [height * 0.1, height]
    );

    const fadeIn = interpolate(activeFrame, [0, 30], [0, 1], {
      extrapolateRight: "clamp",
    });

    return (
      <rect
        key={i}
        x={i * (barWidth + 4)}
        y={(height - barHeight) / 2}
        width={barWidth}
        height={barHeight}
        rx={barWidth / 2}
        fill={color}
        opacity={fadeIn}
      />
    );
  });

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {bars}
    </svg>
  );
};
