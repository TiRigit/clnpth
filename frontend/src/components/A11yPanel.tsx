import { COLORS } from "../styles/tokens";
import { useAccessibility } from "../hooks/useAccessibility";

export default function A11yPanel() {
  const { accessible, colorblind, toggle } = useAccessibility();

  return (
    <div
      role="region"
      aria-label="Darstellungsoptionen"
      style={{ padding: "12px 20px", borderTop: `1px solid ${COLORS.border}` }}
    >
      <div
        style={{
          color: COLORS.textDim,
          fontSize: 9,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        Darstellung
      </div>

      {/* Barrierearm Toggle */}
      <button
        role="switch"
        aria-checked={accessible}
        onClick={() => toggle("accessible")}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "5px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          marginBottom: 4,
        }}
      >
        <span style={{ color: COLORS.textMuted, fontSize: 10 }}>Barrierearm</span>
        <div
          aria-hidden="true"
          style={{
            width: 24,
            height: 14,
            borderRadius: 7,
            background: accessible ? COLORS.accent : COLORS.border,
            position: "relative",
            transition: "background 0.2s",
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#0f0f0f",
              position: "absolute",
              top: 2,
              left: accessible ? 12 : 2,
              transition: "left 0.2s",
            }}
          />
        </div>
      </button>

      {/* Farbenblind Toggle */}
      <button
        role="switch"
        aria-checked={colorblind}
        onClick={() => toggle("colorblind")}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "5px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <span style={{ color: COLORS.textMuted, fontSize: 10 }}>Farbenblind</span>
        <div
          aria-hidden="true"
          style={{
            width: 24,
            height: 14,
            borderRadius: 7,
            background: colorblind ? COLORS.accent : COLORS.border,
            position: "relative",
            transition: "background 0.2s",
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#0f0f0f",
              position: "absolute",
              top: 2,
              left: colorblind ? 12 : 2,
              transition: "left 0.2s",
            }}
          />
        </div>
      </button>
    </div>
  );
}
