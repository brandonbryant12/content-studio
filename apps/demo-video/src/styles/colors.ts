export const colors = {
  primary: "#7C3AED", // Violet
  secondary: "#EC4899", // Pink
  accent: "#06B6D4", // Cyan
  background: "#0F172A", // Dark slate
  backgroundLight: "#1E1B4B", // Dark indigo
  text: "#F8FAFC", // Light
  textMuted: "#94A3B8", // Slate-400
  success: "#10B981", // Emerald

  gradients: {
    hero: "linear-gradient(135deg, #7C3AED 0%, #EC4899 50%, #06B6D4 100%)",
    dark: "linear-gradient(180deg, #1E1B4B 0%, #0F172A 100%)",
    vibrant: "linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)",
    accent: "linear-gradient(135deg, #06B6D4 0%, #7C3AED 100%)",
  },
} as const;

export type Colors = typeof colors;
