import { COLORS } from "../styles/tokens";
import { useAccessibility } from "../hooks/useAccessibility";
import Badge from "../components/Badge";

const TOPICS = [
  { topic: "KI & Regulierung", count: 18, rate: 94 },
  { topic: "Open Source Tools", count: 12, rate: 88 },
  { topic: "\u00dcbersetzungstechnik", count: 9, rate: 85 },
  { topic: "DSGVO & Datenschutz", count: 14, rate: 79 },
  { topic: "Verlags-Workflows", count: 7, rate: 71 },
  { topic: "KI-Bildgenerierung", count: 8, rate: 65 },
];

const RECENT = [
  { title: "EU AI Act 2026: Was Verlage wissen m\u00fcssen", cat: "Technologie", score: 87 },
  { title: "Mistral Large 3 im Praxistest", cat: "Technologie", score: 92 },
  { title: "Open Source AI f\u00fcr Redaktionen", cat: "Gesellschaft", score: 79 },
  { title: "DeepL vs. Google Translate 2026", cat: "Technologie", score: 88 },
];

export default function ArchiveScreen() {
  const { minTarget } = useAccessibility();
  return (
    <div style={{ flex: 1, overflow: "auto", padding: 32 }} className="anim-fade">
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div>
            <h1 className="serif" style={{ fontSize: 26, fontWeight: 400, marginBottom: 4 }}>
              Archiv
            </h1>
            <p style={{ color: COLORS.textMuted, fontSize: 12 }}>
              68 publizierte Artikel &middot; pgvector Archiv-DB
            </p>
          </div>
          <div>
            <input
              placeholder="Archiv durchsuchen\u2026"
              aria-label="Archiv durchsuchen"
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 4,
                padding: "8px 14px",
                color: COLORS.text,
                fontFamily: "inherit",
                fontSize: 12,
                outline: "none",
                width: 240,
                minHeight: minTarget || undefined,
              }}
            />
          </div>
        </div>

        {/* Themen-Ranking */}
        <section
          aria-label="Themen-Ranking"
          style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 6,
            marginBottom: 20,
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
              Themen-Ranking (nach Freigaberate)
            </h2>
          </div>
          <div
            style={{
              padding: 14,
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
            }}
          >
            {TOPICS.map((t) => (
              <div key={t.topic} style={{ background: COLORS.surfaceHigh, borderRadius: 4, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: COLORS.text, fontSize: 12 }}>{t.topic}</span>
                  <span style={{ color: COLORS.textDim, fontSize: 10 }}>{t.count}</span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={t.rate}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Freigaberate ${t.topic}`}
                  style={{ height: 3, background: COLORS.border, borderRadius: 2 }}
                >
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 2,
                      background: COLORS.accent,
                      width: `${t.rate}%`,
                    }}
                  />
                </div>
                <div style={{ color: COLORS.textDim, fontSize: 10, marginTop: 4 }}>
                  {t.rate}% Freigabe
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Zuletzt publiziert */}
        <h2
          style={{
            color: COLORS.textDim,
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 12,
            fontWeight: 400,
          }}
        >
          Zuletzt publiziert
        </h2>
        {RECENT.map((item) => (
          <article
            key={item.title}
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 6,
              padding: "14px 16px",
              marginBottom: 8,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ color: COLORS.text, fontSize: 13, marginBottom: 4 }}>{item.title}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <Badge label="DE EN ES FR" color="muted" />
                <Badge label={item.cat} color="muted" />
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: COLORS.green, fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                {item.score}
              </div>
              <div style={{ color: COLORS.textDim, fontSize: 10 }}>Score</div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
