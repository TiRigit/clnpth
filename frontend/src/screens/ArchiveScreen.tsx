import { COLORS } from "../styles/tokens";
import { useAccessibility } from "../hooks/useAccessibility";
import { useArticleList } from "../hooks/useArticles";
import { useSupervisorDashboard } from "../hooks/useSupervisor";
import Badge from "../components/Badge";
import Spinner from "../components/Spinner";

export default function ArchiveScreen() {
  const { minTarget } = useAccessibility();
  const { articles, loading: articlesLoading } = useArticleList("published");
  const { dashboard, loading: dashLoading } = useSupervisorDashboard();

  const topics = dashboard?.themen_ranking ?? [];
  const subtitle = articles.length > 0
    ? `${articles.length} publizierte Artikel \u00b7 pgvector Archiv-DB`
    : "Lade\u2026";

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
              {subtitle}
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
            {dashLoading && topics.length === 0 && (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 20 }}>
                <Spinner size={14} label="Lade Themen" />
              </div>
            )}
            {topics.map((t) => {
              const rate = t.freigabe_rate ?? 0;
              return (
                <div key={t.id} style={{ background: COLORS.surfaceHigh, borderRadius: 4, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: COLORS.text, fontSize: 12 }}>{t.thema}</span>
                    <span style={{ color: COLORS.textDim, fontSize: 10 }}>{t.artikel_count}</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={rate}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Freigaberate ${t.thema}`}
                    style={{ height: 3, background: COLORS.border, borderRadius: 2 }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 2,
                        background: COLORS.accent,
                        width: `${rate}%`,
                      }}
                    />
                  </div>
                  <div style={{ color: COLORS.textDim, fontSize: 10, marginTop: 4 }}>
                    {rate}% Freigabe
                  </div>
                </div>
              );
            })}
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
        {articlesLoading && articles.length === 0 && (
          <div style={{ textAlign: "center", padding: 20 }}>
            <Spinner size={14} label="Lade Artikel" />
          </div>
        )}
        {articles.map((item) => {
          const langStr = item.sprachen
            ? Object.entries(item.sprachen)
                .filter(([, v]) => v)
                .map(([k]) => k.toUpperCase())
                .join(" ")
            : "";
          return (
            <article
              key={item.id}
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
                <div style={{ color: COLORS.text, fontSize: 13, marginBottom: 4 }}>{item.titel}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {langStr && <Badge label={langStr} color="muted" />}
                  {item.kategorie && <Badge label={item.kategorie} color="muted" />}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: COLORS.textDim, fontSize: 10 }}>
                  {item.trigger_typ}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
