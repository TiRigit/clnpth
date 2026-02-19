import { useState } from "react";
import { COLORS } from "../styles/tokens";
import type { Language, Source, SupervisorResult, ImageResult } from "../types";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Spinner from "../components/Spinner";

const DEMO_ARTICLE = {
  title: "EU AI Act 2026: Was Verlage jetzt wissen m\u00fcssen",
  lead: "Mit dem vollst\u00e4ndigen Inkrafttreten des EU AI Acts stehen Medienh\u00e4user und Kleinverlage vor konkreten Compliance-Anforderungen \u2014 besonders bei KI-gest\u00fctzter \u00dcbersetzung und automatisierter Inhaltserstellung.",
  body: "Der EU AI Act klassifiziert redaktionelle KI-Systeme in der Regel als Anwendungen mit niedrigem Risiko (Art. 6 Abs. 2). Dennoch gelten f\u00fcr automatisiert erstellte oder \u00fcbersetzte Inhalte Transparenzpflichten, die viele Verlage noch nicht umgesetzt haben.\n\nBesonders kritisch: die Kennzeichnungspflicht f\u00fcr KI-generierte Bilder und Texte, die seit Februar 2026 in Kraft ist. Wer Inhalte ohne entsprechende Metadaten (IPTC, C2PA) publiziert, riskiert Bu\u00dfgelder bis zu 15 Millionen Euro oder 3 % des weltweiten Jahresumsatzes.\n\nF\u00fcr die \u00dcbersetzungsbranche bedeutet das: DeepL und vergleichbare EU-Anbieter sind konform, solange die Ausgabe als maschinell \u00fcbersetzt gekennzeichnet wird. Eine redaktionelle Nachbearbeitung \u2014 etwa durch Mistral-basierte Review-Agenten \u2014 kann als menschliche Kontrolle gelten und die Kennzeichnungspflicht abschw\u00e4chen.",
  sources: [
    { title: "EU AI Act Volltext (EUR-Lex)", url: "https://eur-lex.europa.eu/...", auto: true },
    { title: "Bericht Q1 2026 (internes Dokument)", url: null, auto: true },
    { title: "Interview Notizen (Attachment)", url: null, auto: true },
  ] as Source[],
  supervisor: {
    score: 87,
    recommendation: "freigeben",
    reasoning:
      "Artikel entspricht dem Tonality-Profil (sachlich-kritisch, konstruktiv). Struktur und L\u00e4nge im Normbereich. Quellen vollst\u00e4ndig. Einziger Hinweis: Absatz 3 verwendet \u2018riskiert\u2019 \u2014 im Profil leicht unter dem Durchschnitt f\u00fcr juristische Themen. Empfehle Freigabe.",
    tonalityTags: ["sachlich", "kritisch", "konstruktiv"],
    flags: [],
  } as SupervisorResult,
  translations: {
    en: { titel: "EU AI Act 2026: What Publishers Need to Know Now", ready: true },
    es: { titel: "EU AI Act 2026: Lo que los editores deben saber ahora", ready: true },
    fr: { titel: "EU AI Act 2026: Ce que les \u00e9diteurs doivent savoir", ready: true },
  },
  image: {
    prompt:
      "Editorial illustration: EU regulation document transforming into digital content streams, clean geometric style, muted blue-grey palette",
    url: null,
    status: "ready",
    altTexts: {},
  } as ImageResult,
};

const LANG_LABELS: Record<Language, string> = { de: "DE", en: "EN", es: "ES", fr: "FR" };
const LANGS: Language[] = ["de", "en", "es", "fr"];

export default function ReviewScreen() {
  const [activeLang, setActiveLang] = useState<Language>("de");
  const [editedTitle, setEditedTitle] = useState(DEMO_ARTICLE.title);
  const [editedBody, setEditedBody] = useState(DEMO_ARTICLE.body);
  const [editedLead, setEditedLead] = useState(DEMO_ARTICLE.lead);
  const [sources, setSources] = useState(DEMO_ARTICLE.sources);
  const [feedback, setFeedback] = useState("");
  const [decision, setDecision] = useState<"publish" | "revise" | null>(null);
  const [imgStatus, setImgStatus] = useState<"ready" | "generating">("ready");

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
              <Badge label="Technologie" color="muted" />
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
            <Button variant="danger" onClick={() => setDecision("revise")}>
              \u00dcberarbeiten
            </Button>
            <Button variant="success" onClick={() => setDecision("publish")}>
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
                const trans = DEMO_ARTICLE.translations[l as Exclude<Language, "de">];
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
                      minHeight: 44,
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
                    : (DEMO_ARTICLE.translations[activeLang as Exclude<Language, "de">]?.titel ??
                        "") + " \u2014 \u00dcbersetzung Lead\u2026"
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
                    : `${DEMO_ARTICLE.translations[activeLang as Exclude<Language, "de">]?.titel ?? ""}\n\n[\u00dcbersetzung via DeepL + Mistral Review \u2014 vollst\u00e4ndiger Text hier]`
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
                        minHeight: 44,
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
                        minWidth: 44,
                        minHeight: 44,
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
                background:
                  DEMO_ARTICLE.supervisor.recommendation === "freigeben"
                    ? COLORS.greenDim
                    : COLORS.yellowDim,
                border: `1px solid ${
                  DEMO_ARTICLE.supervisor.recommendation === "freigeben"
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
                    aria-label={`Score: ${DEMO_ARTICLE.supervisor.score} von 100`}
                    style={{ color: COLORS.green, fontSize: 18, fontWeight: 600 }}
                  >
                    {DEMO_ARTICLE.supervisor.score}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <span aria-hidden="true" style={{ fontSize: 14 }}>
                  \u2713
                </span>
                <span style={{ color: COLORS.green, fontSize: 12, fontWeight: 600 }}>
                  Empfehlung: Freigeben
                </span>
              </div>
              <p style={{ color: COLORS.textMuted, fontSize: 11, lineHeight: 1.6, marginBottom: 10 }}>
                {DEMO_ARTICLE.supervisor.reasoning}
              </p>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {DEMO_ARTICLE.supervisor.tonalityTags.map((t) => (
                  <Badge key={t} label={t} color="muted" />
                ))}
              </div>
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
                  label={imgStatus === "ready" ? "Bereit" : "Generiert\u2026"}
                  color={imgStatus === "ready" ? "green" : "yellow"}
                />
              </div>
              <div
                style={{
                  height: 140,
                  background: "linear-gradient(135deg, #1a2035 0%, #1e2d4a 50%, #1a2a3a 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div aria-hidden="true" style={{ fontSize: 32, marginBottom: 4, opacity: 0.4 }}>
                    \u25C8
                  </div>
                  <div style={{ color: COLORS.textDim, fontSize: 10 }}>Illustration</div>
                </div>
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
                  {DEMO_ARTICLE.image.prompt}
                </div>
                <Button
                  style={{
                    width: "100%",
                    fontSize: 10,
                    justifyContent: "center",
                    display: "flex",
                  }}
                  onClick={() => setImgStatus("generating")}
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
                    meine-seite.de &rsaquo; technologie
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
                    onClick={() => setDecision("revise")}
                    style={{ flex: 1, justifyContent: "center", display: "flex" }}
                  >
                    \u00dcberarbeiten
                  </Button>
                  <Button
                    variant="success"
                    onClick={() => setDecision("publish")}
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
