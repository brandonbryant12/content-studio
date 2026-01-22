import { AbsoluteFill, Sequence } from "remotion";
import { GradientBackground, AnimatedText, Screenshot } from "../components";
import { colors } from "../styles/colors";

export const FeatureUpload: React.FC = () => {
  return (
    <AbsoluteFill>
      <GradientBackground gradient="dark" />

      {/* Multiple gradient orbs */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          right: "10%",
          width: 400,
          height: 400,
          background: `radial-gradient(circle, ${colors.primary}25 0%, transparent 70%)`,
          filter: "blur(80px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "30%",
          left: "5%",
          width: 300,
          height: 300,
          background: `radial-gradient(circle, ${colors.secondary}20 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />

      {/* Title */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          paddingTop: 50,
        }}
      >
        <AnimatedText
          text="Upload your documents"
          fontSize={64}
          delay={5}
          style={{ textShadow: `0 0 40px ${colors.primary}50` }}
        />
      </AbsoluteFill>

      {/* Screenshots */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingTop: 60,
        }}
      >
        <Sequence from={0} durationInFrames={90}>
          <Screenshot src="screenshots/dashboard.png" delay={15} scale={0.75} />
        </Sequence>
        <Sequence from={75}>
          <Screenshot src="screenshots/upload-dialog.png" delay={5} scale={0.75} />
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
