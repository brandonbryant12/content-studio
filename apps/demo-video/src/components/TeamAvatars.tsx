import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "../styles/colors";

interface TeamAvatarsProps {
  count?: number;
  size?: number;
  delay?: number;
  showConnections?: boolean;
  showCheckmarks?: boolean;
  checkmarkDelay?: number;
}

const avatarColors = [
  colors.primary,
  colors.secondary,
  colors.accent,
  "#10B981",
  "#F59E0B",
];

export const TeamAvatars: React.FC<TeamAvatarsProps> = ({
  count = 4,
  size = 80,
  delay = 0,
  showConnections = false,
  showCheckmarks = false,
  checkmarkDelay = 20,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const positions = [
    { x: 0, y: 0 },
    { x: size * 1.8, y: -size * 0.5 },
    { x: size * 3.6, y: 0 },
    { x: size * 1.8, y: size * 1.2 },
  ].slice(0, count);

  const centerX = size * 1.8;
  const centerY = size * 0.35;

  return (
    <div style={{ position: "relative", width: size * 4.5, height: size * 2.5 }}>
      {/* Connection lines */}
      {showConnections && (
        <svg
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
        >
          {positions.map((pos, i) => {
            const lineProgress = spring({
              frame: frame - delay - i * 8,
              fps,
              config: { damping: 20, stiffness: 80 },
            });
            const lineLength = interpolate(lineProgress, [0, 1], [0, 1]);
            const x1 = pos.x + size / 2;
            const y1 = pos.y + size / 2;

            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x1 + (centerX - x1 + size / 2) * lineLength}
                y2={y1 + (centerY - y1 + size / 2) * lineLength}
                stroke={colors.primary}
                strokeWidth="2"
                opacity={0.4}
                strokeDasharray="8 4"
              />
            );
          })}
        </svg>
      )}

      {/* Avatars */}
      {positions.map((pos, i) => {
        const avatarProgress = spring({
          frame: frame - delay - i * 6,
          fps,
          config: { damping: 12, stiffness: 100 },
        });

        const scale = interpolate(avatarProgress, [0, 1], [0, 1]);
        const opacity = interpolate(avatarProgress, [0, 0.5, 1], [0, 0.8, 1]);

        const checkProgress = spring({
          frame: frame - delay - checkmarkDelay - i * 8,
          fps,
          config: { damping: 10, stiffness: 150 },
        });

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: pos.x,
              top: pos.y,
              transform: `scale(${scale})`,
              opacity,
            }}
          >
            {/* Avatar circle */}
            <div
              style={{
                width: size,
                height: size,
                borderRadius: "50%",
                background: avatarColors[i % avatarColors.length],
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: size * 0.4,
                fontWeight: 700,
                color: colors.text,
                fontFamily: "system-ui, -apple-system, sans-serif",
                boxShadow: `0 4px 20px ${avatarColors[i % avatarColors.length]}40`,
              }}
            >
              {String.fromCharCode(65 + i)}
            </div>

            {/* Checkmark */}
            {showCheckmarks && (
              <div
                style={{
                  position: "absolute",
                  bottom: -5,
                  right: -5,
                  width: size * 0.4,
                  height: size * 0.4,
                  borderRadius: "50%",
                  background: colors.success,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${interpolate(checkProgress, [0, 1], [0, 1])})`,
                  boxShadow: `0 2px 10px ${colors.success}60`,
                }}
              >
                <svg
                  width={size * 0.2}
                  height={size * 0.2}
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    stroke={colors.text}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
