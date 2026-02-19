import { COLORS } from "../styles/tokens";

interface SpinnerProps {
  size?: number;
  label?: string;
}

export default function Spinner({ size = 16, label = "Laden..." }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      style={{
        width: size,
        height: size,
        border: `2px solid ${COLORS.border}`,
        borderTop: `2px solid ${COLORS.accent}`,
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
        display: "inline-block",
      }}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
}
