import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "../styles/colors";

interface MockupFrameProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
  delay?: number;
  title?: string;
}

export const MockupFrame: React.FC<MockupFrameProps> = ({
  children,
  width = 800,
  height = 500,
  delay = 0,
  title = "Content Studio",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 15,
      stiffness: 80,
      mass: 1,
    },
  });

  const scale = interpolate(progress, [0, 1], [0.8, 1]);
  const opacity = interpolate(progress, [0, 0.5, 1], [0, 0.8, 1]);
  const translateY = interpolate(progress, [0, 1], [50, 0]);

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 16,
        overflow: "hidden",
        background: colors.backgroundLight,
        boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)`,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        opacity,
      }}
    >
      {/* Browser chrome */}
      <div
        style={{
          height: 40,
          background: colors.background,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 8,
          borderBottom: `1px solid rgba(255, 255, 255, 0.1)`,
        }}
      >
        {/* Traffic lights */}
        <div style={{ display: "flex", gap: 6 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#EF4444",
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#F59E0B",
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#10B981",
            }}
          />
        </div>

        {/* URL bar */}
        <div
          style={{
            flex: 1,
            height: 24,
            background: colors.backgroundLight,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 80,
            marginRight: 80,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: colors.textMuted,
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            {title}
          </span>
        </div>
      </div>

      {/* Content area */}
      <div
        style={{
          height: height - 40,
          background: colors.background,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
};
