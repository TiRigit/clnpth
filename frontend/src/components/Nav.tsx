import { COLORS } from "../styles/tokens";
import type { ScreenId } from "../types";
import { useAccessibility } from "../hooks/useAccessibility";
import A11yPanel from "./A11yPanel";

interface NavItem {
  id: ScreenId;
  icon: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "input", icon: "\u2726", label: "Eingabe" },
  { id: "review", icon: "\u25C8", label: "Redaktion" },
  { id: "queue", icon: "\u25CE", label: "Warteschlange" },
  { id: "archive", icon: "\u25A3", label: "Archiv" },
  { id: "supervisor", icon: "\u25C6", label: "Supervisor" },
];

interface NavProps {
  active: ScreenId;
  setActive: (id: ScreenId) => void;
  counts?: Partial<Record<ScreenId, number>>;
}

export default function Nav({ active, setActive, counts }: NavProps) {
  const { minTarget, accessible } = useAccessibility();
  return (
    <nav
      id="nav"
      role="navigation"
      aria-label="Hauptnavigation"
      style={{
        width: 200,
        background: COLORS.surface,
        borderRight: `1px solid ${COLORS.border}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px", borderBottom: `1px solid ${COLORS.border}` }}>
        <div
          className="serif"
          style={{ fontSize: 18, color: COLORS.accent, letterSpacing: "-0.02em" }}
        >
          Redaktion
        </div>
        <div style={{ color: COLORS.textDim, fontSize: 10, letterSpacing: "0.12em", marginTop: 2 }}>
          KI-SYSTEM v0.1
        </div>
      </div>

      {/* Items */}
      <div role="tablist" aria-label="Bereiche" style={{ flex: 1, padding: "12px 0" }}>
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          const count = counts?.[item.id] ?? 0;
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${item.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(item.id)}
              onKeyDown={(e) => {
                const idx = NAV_ITEMS.findIndex((n) => n.id === item.id);
                if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                  e.preventDefault();
                  const next = NAV_ITEMS[(idx + 1) % NAV_ITEMS.length];
                  setActive(next.id);
                } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                  e.preventDefault();
                  const prev = NAV_ITEMS[(idx - 1 + NAV_ITEMS.length) % NAV_ITEMS.length];
                  setActive(prev.id);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "10px 20px",
                cursor: "pointer",
                background: isActive ? COLORS.accentGlow : "transparent",
                borderLeft: `2px solid ${isActive ? COLORS.accent : "transparent"}`,
                borderTop: "none",
                borderRight: "none",
                borderBottom: "none",
                color: isActive ? COLORS.accent : COLORS.textMuted,
                transition: "all 0.15s",
                fontFamily: "inherit",
                fontSize: 12,
                letterSpacing: "0.04em",
                minHeight: minTarget || undefined,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span aria-hidden="true" style={{ fontSize: 11 }}>
                  {item.icon}
                </span>
                {item.label}
              </span>
              {count > 0 && (
                <span
                  aria-label={`${count} ausstehend`}
                  style={{
                    background: COLORS.accent,
                    color: "#0f0f0f",
                    borderRadius: 10,
                    padding: "1px 6px",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Status bar */}
      <div
        role="status"
        aria-label="Systemstatus"
        style={{ padding: "16px 20px", borderTop: `1px solid ${COLORS.border}` }}
      >
        {[
          { label: "n8n verbunden", color: COLORS.green, ok: true },
          { label: "Local WP aktiv", color: COLORS.green, ok: true },
          { label: "ComfyUI bereit", color: COLORS.yellow, ok: false },
        ].map((s) => (
          <div
            key={s.label}
            data-cb-status={s.ok ? "success" : "warning"}
            style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}
          >
            {accessible ? (
              <span aria-hidden="true" style={{ fontSize: 12, fontWeight: 700 }}>
                {s.ok ? "\u2713" : "\u26A0"}
              </span>
            ) : (
              <div
                aria-hidden="true"
                style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }}
              />
            )}
            <span style={{ color: COLORS.textMuted, fontSize: 10 }}>
              {s.label}
              <span className="sr-only">{s.ok ? " — aktiv" : " — eingeschraenkt"}</span>
            </span>
          </div>
        ))}
      </div>

      {/* A11y Settings */}
      <A11yPanel />
    </nav>
  );
}
