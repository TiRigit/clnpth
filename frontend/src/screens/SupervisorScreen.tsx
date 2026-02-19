import { useState } from "react";
import { COLORS } from "../styles/tokens";
import { useAccessibility } from "../hooks/useAccessibility";
import { useSupervisorDashboard } from "../hooks/useSupervisor";
import Badge from "../components/Badge";
import Spinner from "../components/Spinner";

export default function SupervisorScreen() {
  const { minTarget } = useAccessibility();
  const { dashboard, loading } = useSupervisorDashboard();

  // Delegation state is local (no backend endpoint)
  const [delegated, setDelegated] = useState<Record<string, boolean>>({});

  const tonality = dashboard?.tonality_profile ?? [];
  const topics = dashboard?.themen_ranking ?? [];
  const decisions = dashboard?.recent_decisions ?? [];
  const deviationStats = dashboard?.deviation_stats;

  const totalArticles = topics.reduce((sum, t) => sum + t.artikel_count, 0);
  const delegatedCount = Object.values(delegated).filter(Boolean).length;

  const subtitle = loading
    ? "Lade\u2026"
    : `Lernstatus \u00b7 ${totalArticles} Artikel verarbeitet \u00b7 Delegation: ${delegatedCount} Kategorie${delegatedCount !== 1 ? "n" : ""} aktiv`;

  if (loading && !dashboard) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner size={20} label="Lade Supervisor" />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 32 }} className="anim-fade">
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 className="serif" style={{ fontSize: 26, fontWeight: 400, marginBottom: 4 }}>
            Supervisor
          </h1>
          <p style={{ color: COLORS.textMuted, fontSize: 12 }}>
            {subtitle}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          {/* Kategorie-Delegation */}
          <section
            aria-label="Kategorie-Delegation"
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 6,
            }}
          >
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
              <h2
                style={{
                  color: COLORS.textDim,
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontWeight: 400,
                }}
              >
                Kategorie-Delegation
              </h2>
            </div>
            <div style={{ padding: 14 }}>
              {topics.map((c) => {
                const accuracy = c.freigabe_rate ?? 0;
                const isDelegated = delegated[c.thema] ?? false;
                const canDelegate = accuracy >= 90;
                return (
                  <div key={c.id} style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <div>
                        <span style={{ color: COLORS.text, fontSize: 12 }}>{c.thema}</span>
                        <span style={{ color: COLORS.textDim, fontSize: 10, marginLeft: 8 }}>
                          {c.artikel_count} Artikel
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            color:
                              accuracy >= 90
                                ? COLORS.green
                                : accuracy >= 80
                                  ? COLORS.yellow
                                  : COLORS.red,
                            fontSize: 12,
                          }}
                        >
                          {accuracy}%
                        </span>
                        <button
                          role="switch"
                          aria-checked={isDelegated}
                          aria-label={`Delegation ${c.thema} ${isDelegated ? "deaktivieren" : "aktivieren"}`}
                          disabled={!canDelegate}
                          onClick={() => canDelegate && setDelegated((p) => ({ ...p, [c.thema]: !isDelegated }))}
                          style={{
                            width: 32,
                            height: 18,
                            borderRadius: 9,
                            background: isDelegated ? COLORS.accent : COLORS.border,
                            position: "relative",
                            cursor: canDelegate ? "pointer" : "not-allowed",
                            opacity: canDelegate ? 1 : 0.5,
                            transition: "background 0.2s",
                            border: "none",
                            padding: 0,
                            minWidth: minTarget || undefined,
                            minHeight: minTarget || undefined,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <div
                            aria-hidden="true"
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: "50%",
                              background: "#0f0f0f",
                              position: "absolute",
                              top: 2,
                              left: isDelegated ? 16 : 2,
                              transition: "left 0.2s",
                            }}
                          />
                        </button>
                      </div>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuenow={accuracy}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`\u00dcbereinstimmung ${c.thema}`}
                      style={{
                        height: 4,
                        background: COLORS.surfaceHigh,
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 2,
                          transition: "width 0.5s",
                          background:
                            accuracy >= 90
                              ? COLORS.green
                              : accuracy >= 80
                                ? COLORS.yellow
                                : COLORS.red,
                          width: `${accuracy}%`,
                        }}
                      />
                    </div>
                    {accuracy < 90 && (
                      <div style={{ color: COLORS.textDim, fontSize: 10, marginTop: 3 }}>
                        Schwellwert: 90% &middot; noch {90 - accuracy}% fehlend
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Tonality-Profil */}
          <section
            aria-label="Tonality-Profil"
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 6,
            }}
          >
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
              <h2
                style={{
                  color: COLORS.textDim,
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontWeight: 400,
                }}
              >
                Tonality-Profil (gelernt)
              </h2>
            </div>
            <div style={{ padding: 14 }}>
              {tonality.map((t) => {
                const confidence = Math.round(t.gewichtung * 100);
                return (
                  <div key={t.id} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: COLORS.textMuted, fontSize: 11 }}>{t.merkmal}</span>
                      <span style={{ color: COLORS.text, fontSize: 11 }}>{t.wert}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        role="progressbar"
                        aria-valuenow={confidence}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Konfidenz ${t.merkmal}`}
                        style={{ flex: 1, height: 3, background: COLORS.surfaceHigh, borderRadius: 2 }}
                      >
                        <div
                          style={{
                            height: "100%",
                            borderRadius: 2,
                            background: COLORS.accent,
                            width: `${confidence}%`,
                            transition: "width 0.5s",
                          }}
                        />
                      </div>
                      <span style={{ color: COLORS.textDim, fontSize: 10, width: 30 }}>
                        {confidence}%
                      </span>
                    </div>
                  </div>
                );
              })}
              <div
                style={{
                  marginTop: 8,
                  padding: 10,
                  background: COLORS.surfaceHigh,
                  borderRadius: 4,
                }}
              >
                <span style={{ color: COLORS.textDim, fontSize: 10 }}>
                  Profil basiert auf {tonality.reduce((sum, t) => sum + t.belege, 0)} Belegen.
                  {deviationStats && ` Abweichungsrate: ${deviationStats.deviation_rate.toFixed(0)}%`}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Recent decisions */}
        <section
          aria-label="Letzte Supervisor-Entscheidungen"
          style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 6,
          }}
        >
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
            <h2
              style={{
                color: COLORS.textDim,
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontWeight: 400,
              }}
            >
              Letzte Supervisor-Entscheidungen
            </h2>
          </div>
          <div style={{ padding: 8 }}>
            {decisions.length === 0 && !loading && (
              <div style={{ padding: 16, textAlign: "center", color: COLORS.textDim, fontSize: 12 }}>
                Noch keine Entscheidungen.
              </div>
            )}
            {decisions.map((d, i) => {
              const match = !d.abweichung;
              return (
                <div
                  key={d.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 8px",
                    borderRadius: 4,
                    marginBottom: 2,
                    background: i % 2 === 0 ? "transparent" : COLORS.surfaceHigh,
                  }}
                >
                  <span
                    aria-label={match ? "\u00dcbereinstimmung" : "Abweichung"}
                    style={{ color: match ? COLORS.green : COLORS.yellow, fontSize: 13 }}
                  >
                    {match ? "\u2713" : "\u2260"}
                  </span>
                  <span style={{ flex: 1, color: COLORS.text, fontSize: 12 }}>
                    #{d.artikel_id}
                  </span>
                  <span style={{ color: COLORS.textDim, fontSize: 11 }}>
                    Supervisor: {d.empfehlung ?? "\u2014"}
                  </span>
                  <span style={{ color: COLORS.textDim, fontSize: 11 }}>
                    Redakteur: {d.redakteur_entscheidung ?? "\u2014"}
                  </span>
                  {d.score !== null && (
                    <Badge label={`${d.score}`} color={d.score >= 80 ? "green" : d.score >= 60 ? "yellow" : "red"} />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
