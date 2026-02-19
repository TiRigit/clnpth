import { COLORS } from "../styles/tokens";
import type { ArticleStatus, TriggerType } from "../types";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Spinner from "../components/Spinner";

interface QueueItem {
  id: number;
  title: string;
  status: ArticleStatus;
  langs: number;
  score: number | null;
  trigger: TriggerType;
  ago: string;
}

const QUEUE_ITEMS: QueueItem[] = [
  { id: 1, title: "EU AI Act 2026: Was Verlage wissen m\u00fcssen", status: "review", langs: 4, score: 87, trigger: "prompt", ago: "vor 3 Min." },
  { id: 2, title: "Mistral Large 3 im Praxistest", status: "generating", langs: 4, score: null, trigger: "rss", ago: "vor 12 Min." },
  { id: 3, title: "Open Source AI Tools f\u00fcr Redaktionen", status: "translating", langs: 3, score: null, trigger: "url", ago: "vor 28 Min." },
  { id: 4, title: "DeepL vs. Google Translate 2026", status: "published", langs: 4, score: 92, trigger: "calendar", ago: "vor 2 Std." },
  { id: 5, title: "DSGVO und KI-Bildgenerierung", status: "rejected", langs: 0, score: 41, trigger: "prompt", ago: "gestern" },
];

const STATUS_MAP: Record<ArticleStatus, { label: string; color: "yellow" | "blue" | "green" | "red" }> = {
  review: { label: "Freigabe ausstehend", color: "yellow" },
  generating: { label: "Wird generiert", color: "blue" },
  translating: { label: "\u00dcbersetzung l\u00e4uft", color: "blue" },
  published: { label: "Publiziert", color: "green" },
  rejected: { label: "Abgelehnt", color: "red" },
};

const FILTERS = ["Alle", "Freigabe", "In Arbeit", "Publiziert"];

interface QueueScreenProps {
  onOpenReview: () => void;
}

export default function QueueScreen({ onOpenReview }: QueueScreenProps) {
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
              5 Artikel &middot; 1 zur Freigabe
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }} role="toolbar" aria-label="Filter">
            {FILTERS.map((f) => (
              <Button
                key={f}
                variant={f === "Alle" ? "primary" : "ghost"}
                style={{ padding: "6px 12px", fontSize: 11 }}
              >
                {f}
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
            {QUEUE_ITEMS.map((item, i) => {
              const s = STATUS_MAP[item.status];
              const isClickable = item.status === "review";
              return (
                <div
                  key={item.id}
                  role="row"
                  tabIndex={isClickable ? 0 : undefined}
                  onClick={() => isClickable && onOpenReview()}
                  onKeyDown={(e) => {
                    if (isClickable && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      onOpenReview();
                    }
                  }}
                  aria-label={`${item.title}, Status: ${s.label}${item.score ? `, Score: ${item.score}` : ""}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 160px 80px 80px 80px 100px",
                    padding: "14px 16px",
                    borderBottom:
                      i < QUEUE_ITEMS.length - 1 ? `1px solid ${COLORS.border}` : "none",
                    cursor: isClickable ? "pointer" : "default",
                    background: isClickable ? COLORS.accentGlow : "transparent",
                    transition: "background 0.15s",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ color: COLORS.text, fontSize: 13, marginBottom: 2 }}>
                      {item.title}
                    </div>
                    {item.status === "generating" && (
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
                    {item.status === "translating" && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          color: COLORS.textDim,
                          fontSize: 10,
                        }}
                      >
                        <Spinner size={9} label="\u00dcbersetzung l\u00e4uft" /> EN \u2713 &middot;
                        ES l&auml;uft &middot; FR wartet
                      </div>
                    )}
                  </div>
                  <div>
                    <Badge label={s.label} color={s.color} />
                  </div>
                  <div style={{ color: COLORS.textMuted, fontSize: 12 }}>
                    {item.langs > 0 ? `${item.langs} \u00d7` : "\u2014"}
                  </div>
                  <div
                    style={{
                      color:
                        item.score !== null && item.score >= 80
                          ? COLORS.green
                          : item.score !== null && item.score >= 60
                            ? COLORS.yellow
                            : COLORS.red,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {item.score ?? "\u2014"}
                  </div>
                  <div>
                    <Badge label={item.trigger} color="muted" />
                  </div>
                  <div style={{ color: COLORS.textDim, fontSize: 11 }}>{item.ago}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
