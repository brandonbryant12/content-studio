import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "../styles/colors";

interface LogoProps {
  size?: number;
  delay?: number;
  showText?: boolean;
  glowIntensity?: number;
}

export const Logo: React.FC<LogoProps> = ({
  size = 120,
  delay = 0,
  showText = true,
  glowIntensity = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 12,
      stiffness: 80,
      mass: 0.8,
    },
  });

  const scale = interpolate(progress, [0, 1], [0.5, 1]);
  const opacity = interpolate(progress, [0, 0.5, 1], [0, 0.8, 1]);
  const rotate = interpolate(progress, [0, 1], [-180, 0]);

  const textProgress = spring({
    frame: frame - delay - 15,
    fps,
    config: {
      damping: 15,
      stiffness: 100,
    },
  });

  const textOpacity = interpolate(textProgress, [0, 1], [0, 1]);
  const textY = interpolate(textProgress, [0, 1], [20, 0]);

  // Pulsing glow
  const glowPulse =
    Math.sin((frame - delay) / 20) * 0.3 * glowIntensity + glowIntensity;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
      }}
    >
      {/* Logo icon */}
      <div
        style={{
          transform: `scale(${scale}) rotate(${rotate}deg)`,
          opacity,
          filter: `drop-shadow(0 0 ${30 * glowPulse}px ${colors.primary}80)`,
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer ring */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="url(#logoGradient)"
            strokeWidth="4"
            fill="none"
          />
          {/* Audio wave bars */}
          <rect x="30" y="35" width="8" height="30" rx="4" fill={colors.primary} />
          <rect x="42" y="25" width="8" height="50" rx="4" fill={colors.secondary} />
          <rect x="54" y="30" width="8" height="40" rx="4" fill={colors.accent} />
          <rect x="66" y="38" width="8" height="24" rx="4" fill={colors.primary} />

          <defs>
            <linearGradient
              id="logoGradient"
              x1="0"
              y1="0"
              x2="100"
              y2="100"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor={colors.primary} />
              <stop offset="0.5" stopColor={colors.secondary} />
              <stop offset="1" stopColor={colors.accent} />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Logo text */}
      {showText && (
        <div
          style={{
            opacity: textOpacity,
            transform: `translateY(${textY}px)`,
          }}
        >
          <span
            style={{
              fontSize: size * 0.35,
              fontWeight: 700,
              fontFamily: "system-ui, -apple-system, sans-serif",
              background: colors.gradients.hero,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Content Studio
          </span>
        </div>
      )}
    </div>
  );
};
