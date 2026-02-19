import { COLORS } from "../styles/tokens";

interface DividerProps {
  label?: string;
}

export default function Divider({ label }: DividerProps) {
  return (
    <div
      role="separator"
      style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}
    >
      <div style={{ flex: 1, height: 1, background: COLORS.border }} />
      {label && (
        <span
          style={{
            color: COLORS.textDim,
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      )}
      <div style={{ flex: 1, height: 1, background: COLORS.border }} />
    </div>
  );
}
