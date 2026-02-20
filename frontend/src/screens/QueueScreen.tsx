import { useState } from "react";
import { COLORS } from "../styles/tokens";
import { useAccessibility } from "../hooks/useAccessibility";
import { useArticleList, useQueueStats } from "../hooks/useArticles";
import { api } from "../api/client";
import { timeAgo } from "../utils/timeAgo";
import type { ArticleStatus } from "../types";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Spinner from "../components/Spinner";

const STATUS_MAP: Record<ArticleStatus, { label: string; color: "yellow" | "blue" | "green" | "red" | "muted" }> = {
  review: { label: "Freigabe ausstehend", color: "yellow" },
  generating: { label: "Wird generiert", color: "blue" },
  translating: { label: "\u00dcbersetzung l\u00e4uft", color: "blue" },
  published: { label: "Publiziert", color: "green" },
  rejected: { label: "Abgelehnt", color: "red" },
  failed: { label: "Fehlgeschlagen", color: "red" },
  timeout: { label: "Timeout", color: "red" },
  paused: { label: "Pausiert", color: "muted" },
  cancelled: { label: "Abgebrochen", color: "muted" },
};

type FilterKey = "all" | "review" | "working" | "published";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "review", label: "Freigabe" },
  { key: "working", label: "In Arbeit" },
  { key: "published", label: "Publiziert" },
];

const FILTER_TO_STATUS: Record<FilterKey, string | undefined> = {
  all: undefined,
  review: "review",
  working: "generating",
  published: "published",
};

interface QueueScreenProps {
  onOpenReview: (id: number) => void;
}

export default function QueueScreen({ onOpenReview }: QueueScreenProps) {
  useAccessibility();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const { articles, loading } = useArticleList(FILTER_TO_STATUS[activeFilter]);
  const { stats } = useQueueStats();

  const subtitle = stats
    ? `${stats.total} Artikel \u00b7 ${stats.review} zur Freigabe`
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
              Warteschlange
            </h1>
            <p style={{ color: COLORS.textMuted, fontSize: 12 }}>
              {subtitle}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }} role="toolbar" aria-label="Filter">
            {FILTERS.map((f) => (
              <Button
                key={f.key}
                variant={activeFilter === f.key ? "primary" : "ghost"}
                onClick={() => setActiveFilter(f.key)}
                style={{ padding: "6px 12px", fontSize: 11 }}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        <div
          style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          {/* Table header */}
          <div
            role="row"
            aria-hidden="true"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 160px 80px 80px 80px 100px",
              padding: "10px 16px",
              borderBottom: `1px solid ${COLORS.border}`,
              color: COLORS.textDim,
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <div>Titel</div>
            <div>Status</div>
            <div>Sprachen</div>
            <div>Score</div>
            <div>Trigger</div>
            <div>Zeit</div>
          </div>

          <div role="table" aria-label="Artikel-Warteschlange">
            {loading && articles.length === 0 && (
              <div style={{ padding: 32, textAlign: "center" }}>
                <Spinner size={16} label="Lade Artikel" />
              </div>
            )}
            {!loading && articles.length === 0 && (
              <div style={{ padding: 32, textAlign: "center", color: COLORS.textDim, fontSize: 12 }}>
                Keine Artikel gefunden.
              </div>
            )}
            {articles.map((item, i) => {
              const status = (item.status as ArticleStatus) || "generating";
              const s = STATUS_MAP[status] ?? { label: item.status, color: "muted" as const };
              const isClickable = status === "review";
              const langCount = item.sprachen
                ? Object.values(item.sprachen).filter(Boolean).length
                : 0;
              return (
                <div
                  key={item.id}
                  role="row"
                  tabIndex={isClickable ? 0 : undefined}
                  onClick={() => isClickable && onOpenReview(item.id)}
                  onKeyDown={(e) => {
                    if (isClickable && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      onOpenReview(item.id);
                    }
                  }}
                  aria-label={`${item.titel}, Status: ${s.label}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 160px 80px 80px 80px 100px",
                    padding: "14px 16px",
                    borderBottom:
                      i < articles.length - 1 ? `1px solid ${COLORS.border}` : "none",
                    cursor: isClickable ? "pointer" : "default",
                    background: isClickable ? COLORS.accentGlow : "transparent",
                    transition: "background 0.15s",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ color: COLORS.text, fontSize: 13, marginBottom: 2 }}>
                      {item.titel}
                    </div>
                    {status === "generating" && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          color: COLORS.textDim,
                          fontSize: 10,
                        }}
                      >
                        <Spinner size={9} label="DE-Master wird erstellt" /> DE-Master wird
                        erstellt&hellip;
                      </div>
                    )}
                    {status === "translating" && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          color: COLORS.textDim,
                          fontSize: 10,
                        }}
                      >
                        <Spinner size={9} label="\u00dcbersetzung l\u00e4uft" /> \u00dcbersetzung
                        l&auml;uft&hellip;
                      </div>
                    )}
                    {(status === "generating" || status === "paused") && (
                      <Button
                        style={{ padding: "2px 8px", fontSize: 10, marginTop: 4 }}
                        onClick={(e) => { e.stopPropagation(); api.articles.cancel(item.id).then(() => window.location.reload()); }}
                      >
                        Abbrechen
                      </Button>
                    )}
                    {(status === "failed" || status === "timeout" || status === "cancelled") && (
                      <Button
                        style={{ padding: "2px 8px", fontSize: 10, marginTop: 4 }}
                        onClick={(e) => { e.stopPropagation(); api.articles.retry(item.id).then(() => window.location.reload()); }}
                      >
                        Wiederholen
                      </Button>
                    )}
                  </div>
                  <div>
                    <Badge label={s.label} color={s.color} />
                  </div>
                  <div style={{ color: COLORS.textMuted, fontSize: 12 }}>
                    {langCount > 0 ? `${langCount} \u00d7` : "\u2014"}
                  </div>
                  <div style={{ color: COLORS.textDim, fontSize: 13 }}>
                    {"\u2014"}
                  </div>
                  <div>
                    <Badge label={item.trigger_typ} color="muted" />
                  </div>
                  <div style={{ color: COLORS.textDim, fontSize: 11 }}>
                    {timeAgo(item.erstellt_am)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
