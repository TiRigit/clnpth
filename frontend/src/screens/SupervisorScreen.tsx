import { COLORS } from "../styles/tokens";
import Badge from "../components/Badge";

const CATEGORIES = [
  { name: "Technologie", articles: 34, accuracy: 94, delegated: true },
  { name: "Gesellschaft", articles: 21, accuracy: 88, delegated: false },
  { name: "Kultur", articles: 12, accuracy: 76, delegated: false },
  { name: "Wirtschaft", articles: 8, accuracy: 62, delegated: false },
];

const TONALITY = [
  { trait: "Satzl\u00e4nge", value: "mittel (18 W\u00f6rter \u00d8)", confidence: 89 },
  { trait: "Anredeform", value: "keine direkte Anrede", confidence: 95 },
  { trait: "Metaphernnutzung", value: "sparsam", confidence: 82 },
  { trait: "Quellenanzahl", value: "3\u20135 je Artikel", confidence: 91 },
  { trait: "Kritischer Ton", value: "konstruktiv-kritisch", confidence: 87 },
];

const DECISIONS = [
  { title: "EU AI Act 2026\u2026", supervisorRec: "freigeben", redakteurDec: "freigeben", match: true, feedback: "" },
  { title: "Mistral Large 3\u2026", supervisorRec: "\u00fcberarbeiten", redakteurDec: "freigeben", match: false, feedback: "Ton ist akzeptabel f\u00fcr diese Kategorie" },
  { title: "Open Source AI\u2026", supervisorRec: "freigeben", redakteurDec: "freigeben", match: true, feedback: "" },
  { title: "DeepL vs. Google\u2026", supervisorRec: "freigeben", redakteurDec: "freigeben", match: true, feedback: "" },
];

export default function SupervisorScreen() {
  return (
    <div style={{ flex: 1, overflow: "auto", padding: 32 }} className="anim-fade">
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 className="serif" style={{ fontSize: 26, fontWeight: 400, marginBottom: 4 }}>
            Supervisor
          </h1>
          <p style={{ color: COLORS.textMuted, fontSize: 12 }}>
            Lernstatus &middot; 75 Artikel verarbeitet &middot; Delegation: 1 Kategorie aktiv
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
              {CATEGORIES.map((c) => (
                <div key={c.name} style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <div>
                      <span style={{ color: COLORS.text, fontSize: 12 }}>{c.name}</span>
                      <span style={{ color: COLORS.textDim, fontSize: 10, marginLeft: 8 }}>
                        {c.articles} Artikel
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          color:
                            c.accuracy >= 90
                              ? COLORS.green
                              : c.accuracy >= 80
                                ? COLORS.yellow
                                : COLORS.red,
                          fontSize: 12,
                        }}
                      >
                        {c.accuracy}%
                      </span>
                      <button
                        role="switch"
                        aria-checked={c.delegated}
                        aria-label={`Delegation ${c.name} ${c.delegated ? "deaktivieren" : "aktivieren"}`}
                        disabled={c.accuracy < 90}
                        style={{
                          width: 32,
                          height: 18,
                          borderRadius: 9,
                          background: c.delegated ? COLORS.accent : COLORS.border,
                          position: "relative",
                          cursor: c.accuracy >= 90 ? "pointer" : "not-allowed",
                          opacity: c.accuracy >= 90 ? 1 : 0.5,
                          transition: "background 0.2s",
                          border: "none",
                          padding: 0,
                          minWidth: 44,
                          minHeight: 44,
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
                            left: c.delegated ? 16 : 2,
                            transition: "left 0.2s",
                          }}
                        />
                      </button>
                    </div>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={c.accuracy}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`\u00dcbereinstimmung ${c.name}`}
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
                          c.accuracy >= 90
                            ? COLORS.green
                            : c.accuracy >= 80
                              ? COLORS.yellow
                              : COLORS.red,
                        width: `${c.accuracy}%`,
                      }}
                    />
                  </div>
                  {c.accuracy < 90 && (
                    <div style={{ color: COLORS.textDim, fontSize: 10, marginTop: 3 }}>
                      Schwellwert: 90% &middot; noch {90 - c.accuracy}% fehlend
                    </div>
                  )}
                </div>
              ))}
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
              {TONALITY.map((t) => (
                <div key={t.trait} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: COLORS.textMuted, fontSize: 11 }}>{t.trait}</span>
                    <span style={{ color: COLORS.text, fontSize: 11 }}>{t.value}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      role="progressbar"
                      aria-valuenow={t.confidence}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Konfidenz ${t.trait}`}
                      style={{ flex: 1, height: 3, background: COLORS.surfaceHigh, borderRadius: 2 }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 2,
                          background: COLORS.accent,
                          width: `${t.confidence}%`,
                          transition: "width 0.5s",
                        }}
                      />
                    </div>
                    <span style={{ color: COLORS.textDim, fontSize: 10, width: 30 }}>
                      {t.confidence}%
                    </span>
                  </div>
                </div>
              ))}
              <div
                style={{
                  marginTop: 8,
                  padding: 10,
                  background: COLORS.surfaceHigh,
                  borderRadius: 4,
                }}
              >
                <span style={{ color: COLORS.textDim, fontSize: 10 }}>
                  Profil basiert auf 68 freigegebenen Artikeln. N\u00e4chster Checkpoint: 100
                  Artikel.
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
            {DECISIONS.map((d, i) => (
              <div
                key={d.title}
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
                  aria-label={d.match ? "\u00dcbereinstimmung" : "Abweichung"}
                  style={{ color: d.match ? COLORS.green : COLORS.yellow, fontSize: 13 }}
                >
                  {d.match ? "\u2713" : "\u2260"}
                </span>
                <span style={{ flex: 1, color: COLORS.text, fontSize: 12 }}>{d.title}</span>
                <span style={{ color: COLORS.textDim, fontSize: 11 }}>
                  Supervisor: {d.supervisorRec}
                </span>
                <span style={{ color: COLORS.textDim, fontSize: 11 }}>
                  Redakteur: {d.redakteurDec}
                </span>
                {d.feedback && (
                  <span
                    style={{ color: COLORS.textDim, fontSize: 10, fontStyle: "italic" }}
                  >
                    \u00AB{d.feedback}\u00BB
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
