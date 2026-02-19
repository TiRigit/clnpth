import { COLORS } from "../styles/tokens";

type BadgeColor = "accent" | "green" | "red" | "blue" | "yellow" | "muted";

interface BadgeProps {
  label: string;
  color?: BadgeColor;
}

const COLOR_MAP: Record<BadgeColor, { bg: string; text: string; border: string }> = {
  accent: { bg: COLORS.accentGlow, text: COLORS.accent, border: COLORS.accentDim },
  green: { bg: COLORS.greenDim, text: COLORS.green, border: "rgba(76,175,125,0.3)" },
  red: { bg: COLORS.redDim, text: COLORS.red, border: "rgba(224,90,78,0.3)" },
  blue: { bg: COLORS.blueDim, text: COLORS.blue, border: "rgba(90,143,200,0.3)" },
  yellow: { bg: COLORS.yellowDim, text: COLORS.yellow, border: "rgba(212,168,67,0.3)" },
  muted: { bg: "rgba(255,255,255,0.04)", text: COLORS.textMuted, border: COLORS.border },
};

export default function Badge({ label, color = "accent" }: BadgeProps) {
  const s = COLOR_MAP[color];
  return (
    <span
      role="status"
      style={{
        background: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
        borderRadius: 3,
        padding: "2px 8px",
        fontSize: 10,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontWeight: 400,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
