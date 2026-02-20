import { COLORS } from "../styles/tokens";
import { useAccessibility } from "../hooks/useAccessibility";

export default function A11yPanel() {
  const { accessible, toggle } = useAccessibility();

  return (
    <div
      role="region"
      aria-label="Barrierefreiheit"
      style={{ padding: "12px 20px", borderTop: `1px solid ${COLORS.border}` }}
    >
      <button
        role="switch"
        aria-checked={accessible}
        aria-label={`Barrierefreier Modus ${accessible ? "aktiv" : "inaktiv"}: Hoher Kontrast, grosse Schaltflaechen, Farbenblind-Unterstuetzung`}
        onClick={toggle}
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
        <span style={{ color: accessible ? "#ffffff" : COLORS.textMuted, fontSize: 10 }}>
          Barrierearm
        </span>
        <div
          aria-hidden="true"
          style={{
            width: 24,
            height: 14,
            borderRadius: 7,
            background: accessible ? "#ffffff" : COLORS.border,
            position: "relative",
            transition: "background 0.2s",
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: accessible ? "#000000" : "#0f0f0f",
              position: "absolute",
              top: 2,
              left: accessible ? 12 : 2,
              transition: "left 0.2s",
            }}
          />
        </div>
      </button>
    </div>
  );
}
