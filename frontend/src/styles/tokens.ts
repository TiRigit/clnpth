export const COLORS = {
  bg: "#0f0f0f",
  surface: "#161616",
  surfaceHigh: "#1e1e1e",
  border: "#2a2a2a",
  borderHot: "#3d3d3d",
  accent: "#c8a96e",
  accentDim: "#9a7d4a",
  accentGlow: "rgba(200,169,110,0.12)",
  text: "#e8e4dc",
  textMuted: "#7a7570",
  textDim: "#4a4642",
  green: "#4caf7d",
  greenDim: "rgba(76,175,125,0.12)",
  red: "#e05a4e",
  redDim: "rgba(224,90,78,0.12)",
  blue: "#5a8fc8",
  blueDim: "rgba(90,143,200,0.12)",
  yellow: "#d4a843",
  yellowDim: "rgba(212,168,67,0.12)",
} as const;

export type ColorKey = keyof typeof COLORS;

export const FONTS = {
  serif: "'Playfair Display', serif",
  mono: "'JetBrains Mono', monospace",
} as const;

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;
