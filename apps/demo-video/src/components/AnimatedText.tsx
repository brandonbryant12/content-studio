import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "../styles/colors";

interface AnimatedTextProps {
  text: string;
  fontSize?: number;
  color?: string;
  delay?: number;
  style?: React.CSSProperties;
  wordByWord?: boolean;
  wordDelay?: number;
  centered?: boolean;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  fontSize = 80,
  color = colors.text,
  delay = 0,
  style,
  wordByWord = false,
  wordDelay = 5,
  centered = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (wordByWord) {
    const words = text.split(" ");

    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: centered ? "center" : "flex-start",
          alignItems: "center",
          ...style,
        }}
      >
        {words.map((word, index) => {
          const wordDelayFrames = delay + index * wordDelay;
          const progress = spring({
            frame: frame - wordDelayFrames,
            fps,
            config: {
              damping: 15,
              stiffness: 100,
              mass: 0.5,
            },
          });

          const opacity = interpolate(progress, [0, 1], [0, 1]);
          const translateY = interpolate(progress, [0, 1], [30, 0]);
          const scale = interpolate(progress, [0, 1], [0.8, 1]);

          return (
            <span
              key={index}
              style={{
                fontSize,
                color,
                fontWeight: 700,
                fontFamily: "system-ui, -apple-system, sans-serif",
                opacity,
                transform: `translateY(${translateY}px) scale(${scale})`,
                display: "inline-block",
                marginRight: index < words.length - 1 ? "0.35em" : 0,
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    );
  }

  const progress = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 15,
      stiffness: 100,
      mass: 0.5,
    },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [40, 0]);

  return (
    <div
      style={{
        fontSize,
        color,
        fontWeight: 700,
        fontFamily: "system-ui, -apple-system, sans-serif",
        opacity,
        transform: `translateY(${translateY}px)`,
        textAlign: centered ? "center" : "left",
        ...style,
      }}
    >
      {text}
    </div>
  );
};
