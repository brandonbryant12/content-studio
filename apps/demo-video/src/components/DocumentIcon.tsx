import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "../styles/colors";

interface DocumentIconProps {
  type: "pdf" | "docx" | "txt" | "pptx";
  size?: number;
  delay?: number;
  x?: number;
  y?: number;
  grayscale?: boolean;
}

const iconColors: Record<DocumentIconProps["type"], string> = {
  pdf: "#EF4444",
  docx: "#3B82F6",
  txt: "#6B7280",
  pptx: "#F97316",
};

const iconLabels: Record<DocumentIconProps["type"], string> = {
  pdf: "PDF",
  docx: "DOCX",
  txt: "TXT",
  pptx: "PPTX",
};

export const DocumentIcon: React.FC<DocumentIconProps> = ({
  type,
  size = 120,
  delay = 0,
  x = 0,
  y = 0,
  grayscale = false,
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

  const scale = interpolate(progress, [0, 1], [0, 1]);
  const opacity = interpolate(progress, [0, 0.5, 1], [0, 0.8, 1]);
  const rotate = interpolate(progress, [0, 1], [-15, 0]);

  const color = grayscale ? "#6B7280" : iconColors[type];
  const filter = grayscale ? "grayscale(100%)" : "none";

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `scale(${scale}) rotate(${rotate}deg)`,
        opacity,
        filter,
      }}
    >
      <svg
        width={size}
        height={size * 1.3}
        viewBox="0 0 80 104"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Document body */}
        <path
          d="M4 8C4 3.58172 7.58172 0 12 0H52L76 24V96C76 100.418 72.4183 104 68 104H12C7.58172 104 4 100.418 4 96V8Z"
          fill={colors.backgroundLight}
          stroke={color}
          strokeWidth="3"
        />
        {/* Folded corner */}
        <path d="M52 0V20C52 22.2091 53.7909 24 56 24H76L52 0Z" fill={color} />
        {/* Label */}
        <text
          x="40"
          y="70"
          textAnchor="middle"
          fill={color}
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="18"
          fontWeight="700"
        >
          {iconLabels[type]}
        </text>
      </svg>
    </div>
  );
};
