import { useState, useEffect } from "react";
import { useAccessibility } from "../hooks/useAccessibility";
import { useArticleDetail } from "../hooks/useArticles";
import { useTranslations } from "../hooks/useTranslations";
import { useImage } from "../hooks/useImage";
import { api } from "../api/client";
import { COLORS } from "../styles/tokens";
import type { Language, Source } from "../types";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Spinner from "../components/Spinner";

const LANG_LABELS: Record<Language, string> = { de: "DE", en: "EN", es: "ES", fr: "FR" };
const LANGS: Language[] = ["de", "en", "es", "fr"];

interface ReviewScreenProps {
  articleId: number;
}

export default function ReviewScreen({ articleId }: ReviewScreenProps) {
  const [activeLang, setActiveLang] = useState<Language>("de");
  const { minTarget } = useAccessibility();
  const { article, loading: articleLoading, error: articleError } = useArticleDetail(articleId);
  const { translations } = useTranslations(articleId);
  const { image, trigger: triggerImage } = useImage(articleId);

  const [editedTitle, setEditedTitle] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [editedLead, setEditedLead] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [feedback, setFeedback] = useState("");
  const [decision, setDecision] = useState<"publish" | "revise" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Build translations map: lang -> translation
  const translationMap = translations.reduce<Record<string, { titel: string | null; lead: string | null; body: string | null; ready: boolean }>>(
    (acc, t) => {
      acc[t.sprache] = {
        titel: t.titel,
        lead: t.lead,
        body: t.body,
        ready: t.status === "approved" || t.status === "reviewed",
      };
      return acc;
    },
    {}
  );

  // Initialize editor state from article data
  useEffect(() => {
    if (article) {
      setEditedTitle(article.titel);
      setEditedBody(article.body ?? "");
      setEditedLead(article.lead ?? "");
      const mappedSources = (article.quellen ?? []).map((q: unknown) => {
        if (typeof q === "object" && q !== null) {
          const obj = q as Record<string, unknown>;
          return {
            title: String(obj.title ?? obj.titel ?? ""),
            url: typeof obj.url === "string" ? obj.url : null,
            auto: Boolean(obj.auto ?? true),
          };
        }
        return { title: String(q), url: null, auto: true };
      });
      setSources(mappedSources);
    }
  }, [article]);

  // Supervisor data
  const supervisor = article?.supervisor;
  const supervisorScore = supervisor?.supervisor_score ?? null;
  const supervisorRec = supervisor?.supervisor_empfehlung ?? null;
  const supervisorReasoning = supervisor?.supervisor_begruendung ?? "";
  const tonalityTags = supervisor?.tonality_tags ?? [];
  const isApproved = supervisorRec === "freigeben";

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await api.articles.approve(articleId, feedback || undefined);
      setDecision("publish");
    } catch {
      // silent
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevise = async () => {
    setActionLoading(true);
    try {
      await api.articles.revise(articleId, feedback || undefined);
      setDecision("revise");
    } catch {
      // silent
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenImage = () => {
    const prompt = image.bild_prompt ?? editedTitle;
    triggerImage(prompt, "illustration");
  };

  if (articleLoading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner size={20} label="Artikel wird geladen" />
      </div>
    );
  }

  if (articleError || !article) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: COLORS.red, fontSize: 13 }}>
          {articleError ?? "Artikel nicht gefunden"}
        </div>
      </div>
    );
  }

  if (decision)
    return (
      <div
        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
        className="anim-fade"
        role="status"
        aria-live="polite"
      >
        <div style={{ textAlign: "center" }}>
          <div aria-hidden="true" style={{ fontSize: 40, marginBottom: 16 }}>
            {decision === "publish" ? "\u2713" : "\u21A9"}
          </div>
          <div
            className="serif"
            style={{
              fontSize: 22,
              color: decision === "publish" ? COLORS.green : COLORS.yellow,
              marginBottom: 8,
            }}
          >
            {decision === "publish"
              ? "Artikel freigegeben"
              : "Zur \u00dcberarbeitung zur\u00fcckgegeben"}
          </div>
          <div style={{ color: COLORS.textMuted, fontSize: 12 }}>
            {decision === "publish"
              ? "Wird an Local WP \u00fcbermittelt und als Draft gesetzt."
              : "Feedback an Agenten \u00fcbermittelt."}
          </div>
          {feedback && (
            <div
              style={{
                marginTop: 12,
                color: COLORS.textDim,
                fontSize: 11,
                fontStyle: "italic",
              }}
            >
              Feedback: {feedback}
            </div>
          )}
        </div>
      </div>
    );

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 28 }} className="anim-fade">
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <Badge label="Zur Freigabe" color="yellow" />
              {article.kategorie && <Badge label={article.kategorie} color="muted" />}
              <Badge label="KI-generiert" color="muted" />
            </div>
            <input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              aria-label="Artikel-Titel bearbeiten"
              className="serif"
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 24,
                color: COLORS.text,
                fontWeight: 400,
                width: "100%",
                fontFamily: "'Playfair Display', serif",
                lineHeight: 1.3,
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 20 }}>
            <Button>Vorschau</Button>
            <Button variant="danger" onClick={handleRevise} disabled={actionLoading}>
              \u00dcberarbeiten
            </Button>
            <Button variant="success" onClick={handleApprove} disabled={actionLoading}>
              \u2713 Freigeben
            </Button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
          {/* Main content */}
          <div>
            {/* Language tabs */}
            <div
              role="tablist"
              aria-label="Sprachversionen"
              style={{
                display: "flex",
                gap: 4,
                marginBottom: 16,
                borderBottom: `1px solid ${COLORS.border}`,
                paddingBottom: 12,
              }}
            >
              {LANGS.map((l) => {
                const trans = translationMap[l];
                return (
                  <button
                    key={l}
                    role="tab"
                    aria-selected={activeLang === l}
                    aria-controls={`panel-lang-${l}`}
                    onClick={() => setActiveLang(l)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 4,
                      cursor: "pointer",
                      background: activeLang === l ? COLORS.accentGlow : "transparent",
                      border: `1px solid ${activeLang === l ? COLORS.accent : COLORS.border}`,
                      color: activeLang === l ? COLORS.accent : COLORS.textMuted,
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      transition: "all 0.15s",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontFamily: "inherit",
                      minHeight: minTarget || undefined,
                    }}
                  >
                    {LANG_LABELS[l]}
                    {l !== "de" && trans && (
                      <span
                        aria-label={trans.ready ? "Fertig" : "In Arbeit"}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: trans.ready ? COLORS.green : COLORS.yellow,
                        }}
                      />
                    )}
                  </button>
                );
              })}
              <span
                style={{
                  marginLeft: "auto",
                  color: COLORS.textDim,
                  fontSize: 10,
                  alignSelf: "center",
                }}
              >
                {activeLang === "de"
                  ? "Master \u2014 bearbeitbar"
                  : "DeepL + Mistral Review \u2014 bearbeitbar"}
              </span>
            </div>

            {/* Lead */}
            <div
              id={`panel-lang-${activeLang}`}
              role="tabpanel"
              style={{ marginBottom: 16 }}
            >
              <label
                htmlFor="lead-editor"
                style={{
                  color: COLORS.textDim,
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                  display: "block",
                }}
              >
                Lead
              </label>
              <textarea
                id="lead-editor"
                value={
                  activeLang === "de"
                    ? editedLead
                    : (translationMap[activeLang]?.lead ?? translationMap[activeLang]?.titel ?? "")
                }
                onChange={(e) => activeLang === "de" && setEditedLead(e.target.value)}
                style={{
                  width: "100%",
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 6,
                  padding: "12px 14px",
                  color: COLORS.text,
                  fontFamily: "inherit",
                  fontSize: 13,
                  resize: "vertical",
                  outline: "none",
                  lineHeight: 1.7,
                  minHeight: 80,
                }}
              />
            </div>

            {/* Body */}
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="body-editor"
                style={{
                  color: COLORS.textDim,
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                  display: "block",
                }}
              >
                Artikeltext
              </label>
              {/* Toolbar */}
              <div
                role="toolbar"
                aria-label="Textformatierung"
                style={{
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  borderBottom: "none",
                  borderRadius: "6px 6px 0 0",
                  padding: "8px 12px",
                  display: "flex",
                  gap: 4,
                }}
              >
                {["B", "I", "H2", "H3", "\u2014", "Link", "Quote"].map((t) => (
                  <button
                    key={t}
                    aria-label={
                      t === "B"
                        ? "Fett"
                        : t === "I"
                          ? "Kursiv"
                          : t === "\u2014"
                            ? "Trennlinie"
                            : t
                    }
                    style={{
                      background: "transparent",
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 3,
                      padding: "3px 8px",
                      color: COLORS.textMuted,
                      cursor: "pointer",
                      fontSize: 11,
                      fontFamily: "inherit",
                      minWidth: 32,
                      minHeight: 32,
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <textarea
                id="body-editor"
                value={
                  activeLang === "de"
                    ? editedBody
                    : (translationMap[activeLang]?.body ?? "")
                }
                onChange={(e) => activeLang === "de" && setEditedBody(e.target.value)}
                style={{
                  width: "100%",
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: "0 0 6px 6px",
                  padding: "16px 14px",
                  color: COLORS.text,
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 14,
                  resize: "vertical",
                  outline: "none",
                  lineHeight: 1.8,
                  minHeight: 260,
                }}
              />
            </div>

            {/* Sources */}
            <div
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
              }}
            >
              <div
                style={{
                  padding: "10px 14px",
                  borderBottom: `1px solid ${COLORS.border}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    color: COLORS.textDim,
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Quellen
                </span>
                <span style={{ color: COLORS.textDim, fontSize: 10 }}>
                  KI-vorausgef\u00fcllt &middot; bearbeitbar
                </span>
              </div>
              <div style={{ padding: 12 }}>
                {sources.map((s, i) => (
                  <div
                    key={i}
                    style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}
                  >
                    <Badge label={s.auto ? "KI" : "Manuell"} color={s.auto ? "blue" : "muted"} />
                    <input
                      value={s.title}
                      onChange={(e) =>
                        setSources((p) =>
                          p.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)),
                        )
                      }
                      aria-label={`Quelle ${i + 1}`}
                      style={{
                        flex: 1,
                        background: COLORS.surfaceHigh,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 4,
                        padding: "5px 10px",
                        color: COLORS.text,
                        fontFamily: "inherit",
                        fontSize: 12,
                        outline: "none",
                        minHeight: minTarget || undefined,
                      }}
                    />
                    <button
                      onClick={() => setSources((p) => p.filter((_, j) => j !== i))}
                      aria-label={`Quelle ${s.title} entfernen`}
                      style={{
                        color: COLORS.textDim,
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                        fontSize: 14,
                        minWidth: minTarget || undefined,
                        minHeight: minTarget || undefined,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
                <Button
                  style={{ fontSize: 11, padding: "5px 10px" }}
                  onClick={() =>
                    setSources((p) => [...p, { title: "", url: null, auto: false }])
                  }
                >
                  + Quelle hinzuf\u00fcgen
                </Button>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div>
            {/* Supervisor Box */}
            <div
              role="region"
              aria-label="Supervisor-Empfehlung"
              style={{
                background: isApproved ? COLORS.greenDim : COLORS.yellowDim,
                border: `1px solid ${
                  isApproved
                    ? "rgba(76,175,125,0.3)"
                    : "rgba(212,168,67,0.3)"
                }`,
                borderRadius: 6,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    color: COLORS.textDim,
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Supervisor
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: COLORS.textMuted, fontSize: 11 }}>Score</span>
                  <span
                    aria-label={supervisorScore !== null ? `Score: ${supervisorScore} von 100` : "Kein Score"}
                    style={{
                      color: supervisorScore !== null && supervisorScore >= 70 ? COLORS.green : COLORS.yellow,
                      fontSize: 18,
                      fontWeight: 600,
                    }}
                  >
                    {supervisorScore ?? "\u2014"}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <span aria-hidden="true" style={{ fontSize: 14 }}>
                  {isApproved ? "\u2713" : "\u2260"}
                </span>
                <span
                  style={{
                    color: isApproved ? COLORS.green : COLORS.yellow,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Empfehlung: {supervisorRec ?? "ausstehend"}
                </span>
              </div>
              {supervisorReasoning && (
                <p style={{ color: COLORS.textMuted, fontSize: 11, lineHeight: 1.6, marginBottom: 10 }}>
                  {supervisorReasoning}
                </p>
              )}
              {tonalityTags.length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {tonalityTags.map((t) => (
                    <Badge key={t} label={t} color="muted" />
                  ))}
                </div>
              )}
            </div>

            {/* Image preview */}
            <div
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                marginBottom: 12,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "10px 14px",
                  borderBottom: `1px solid ${COLORS.border}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    color: COLORS.textDim,
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Beitragsbild
                </span>
                <Badge
                  label={image.status === "ready" ? "Bereit" : image.status === "generating" ? "Generiert\u2026" : "Ausstehend"}
                  color={image.status === "ready" ? "green" : image.status === "generating" ? "yellow" : "muted"}
                />
              </div>
              <div
                style={{
                  height: 140,
                  background: image.bild_url
                    ? `url(${image.bild_url}) center/cover`
                    : "linear-gradient(135deg, #1a2035 0%, #1e2d4a 50%, #1a2a3a 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                {!image.bild_url && (
                  <div style={{ textAlign: "center" }}>
                    <div aria-hidden="true" style={{ fontSize: 32, marginBottom: 4, opacity: 0.4 }}>
                      {image.status === "generating" ? "" : "\u25C8"}
                    </div>
                    <div style={{ color: COLORS.textDim, fontSize: 10 }}>
                      {image.status === "generating" ? "Wird generiert\u2026" : "Illustration"}
                    </div>
                    {image.status === "generating" && <Spinner size={16} />}
                  </div>
                )}
                <div
                  style={{
                    position: "absolute",
                    bottom: 8,
                    left: 8,
                    background: "rgba(0,0,0,0.6)",
                    borderRadius: 3,
                    padding: "2px 6px",
                  }}
                >
                  <span style={{ color: COLORS.textDim, fontSize: 9 }}>
                    KI-generiertes Bild &middot; C2PA \u2713
                  </span>
                </div>
              </div>
              <div style={{ padding: 10 }}>
                <div style={{ color: COLORS.textDim, fontSize: 10, marginBottom: 6 }}>Prompt:</div>
                <div
                  style={{ color: COLORS.textMuted, fontSize: 10, lineHeight: 1.5, marginBottom: 10 }}
                >
                  {image.bild_prompt ?? "Kein Prompt"}
                </div>
                <Button
                  style={{
                    width: "100%",
                    fontSize: 10,
                    justifyContent: "center",
                    display: "flex",
                  }}
                  onClick={handleRegenImage}
                  disabled={image.status === "generating"}
                >
                  \u21BA Neu generieren
                </Button>
              </div>
            </div>

            {/* SEO Preview */}
            <div
              role="region"
              aria-label="SEO-Vorschau"
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                marginBottom: 12,
              }}
            >
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${COLORS.border}` }}>
                <span
                  style={{
                    color: COLORS.textDim,
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  SEO
                </span>
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ color: COLORS.textDim, fontSize: 10, marginBottom: 4 }}>
                  Google-Vorschau
                </div>
                <div
                  style={{
                    background: COLORS.surfaceHigh,
                    borderRadius: 4,
                    padding: 10,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ color: COLORS.blue, fontSize: 12, marginBottom: 2 }}>
                    {editedTitle.substring(0, 55)}&hellip;
                  </div>
                  <div style={{ color: "#5f9e6e", fontSize: 10, marginBottom: 4 }}>
                    meine-seite.de &rsaquo; {(article.kategorie ?? "artikel").toLowerCase()}
                  </div>
                  <div style={{ color: COLORS.textMuted, fontSize: 11, lineHeight: 1.5 }}>
                    {editedLead.substring(0, 100)}&hellip;
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: COLORS.textMuted, fontSize: 10 }}>
                    Titel: {editedTitle.length}/60 Zeichen
                  </span>
                  <Badge
                    label={editedTitle.length <= 60 ? "OK" : "Zu lang"}
                    color={editedTitle.length <= 60 ? "green" : "red"}
                  />
                </div>
              </div>
            </div>

            {/* Feedback */}
            <div
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
              }}
            >
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${COLORS.border}` }}>
                <span
                  style={{
                    color: COLORS.textDim,
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Feedback an Supervisor
                </span>
              </div>
              <div style={{ padding: 12 }}>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Optional: Was soll der Supervisor lernen?"
                  aria-label="Feedback an Supervisor"
                  style={{
                    width: "100%",
                    background: COLORS.surfaceHigh,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 4,
                    padding: "8px 10px",
                    color: COLORS.text,
                    fontFamily: "inherit",
                    fontSize: 11,
                    resize: "vertical",
                    outline: "none",
                    lineHeight: 1.6,
                    minHeight: 70,
                    marginBottom: 10,
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <Button
                    variant="danger"
                    onClick={handleRevise}
                    disabled={actionLoading}
                    style={{ flex: 1, justifyContent: "center", display: "flex" }}
                  >
                    \u00dcberarbeiten
                  </Button>
                  <Button
                    variant="success"
                    onClick={handleApprove}
                    disabled={actionLoading}
                    style={{ flex: 1, justifyContent: "center", display: "flex" }}
                  >
                    \u2713 Freigeben
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
