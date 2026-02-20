import { useState, useRef, type ChangeEvent } from "react";
import { useAccessibility } from "../hooks/useAccessibility";
import { useCreateArticle } from "../hooks/useArticles";
import { useFeatures } from "../hooks/useFeatures";
import { api } from "../api/client";
import { COLORS } from "../styles/tokens";
import type { TriggerType } from "../types";
import Button from "../components/Button";
import Spinner from "../components/Spinner";

const TRIGGER_TYPES: { id: TriggerType; icon: string; label: string }[] = [
  { id: "prompt", icon: "\u2726", label: "Freitext-Prompt" },
  { id: "url", icon: "\u2B21", label: "URL-Eingabe" },
  { id: "rss", icon: "\u25CE", label: "RSS-Thema" },
  { id: "calendar", icon: "\u25A3", label: "Redaktionskalender" },
  { id: "image", icon: "\u25C8", label: "Bild-Prompt" },
];

const CATEGORIES = ["Technologie", "Gesellschaft", "Kultur", "Wirtschaft", "Wissenschaft"];

const IMAGE_TYPES = ["Illustration", "Infografik", "Foto-realistisch", "Animation"];

interface Attachment {
  name: string;
  size: string;
  type: string;
}

interface InputScreenProps {
  onSubmit: () => void;
}

export default function InputScreen({ onSubmit }: InputScreenProps) {
  const [trigger, setTrigger] = useState<TriggerType>("prompt");
  const { minTarget } = useAccessibility();
  const { features } = useFeatures();
  const [text, setText] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [urls, setUrls] = useState([""]);
  const [category, setCategory] = useState("Technologie");
  const [langs, setLangs] = useState({ de: true, en: true, es: true, fr: true });
  const [imageType, setImageType] = useState("Illustration");
  const [rssUrl, setRssUrl] = useState("");
  const [rssItems, setRssItems] = useState<{ title: string; link: string; selected: boolean }[]>([]);
  const [rssLoading, setRssLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { create, submitting, error } = useCreateArticle();

  const handleSubmit = async () => {
    // Bulk mode: multiple topics
    if (bulkMode && features.bulk_input) {
      const topics = text.split("\n").map((t) => t.trim()).filter(Boolean);
      if (topics.length === 0) return;
      try {
        await api.articles.bulk({ topics, kategorie: category, sprachen: langs, bild_typ: imageType.toLowerCase() });
        onSubmit();
      } catch { /* silent */ }
      return;
    }

    // RSS mode: selected items
    if (trigger === "rss" && rssItems.some((i) => i.selected)) {
      const selected = rssItems.filter((i) => i.selected);
      if (features.bulk_input && selected.length > 1) {
        await api.articles.bulk({ topics: selected.map((i) => i.title), kategorie: category, sprachen: langs });
      } else {
        for (const item of selected) {
          await create({ trigger_typ: "rss", text: item.title, kategorie: category, sprachen: langs, urls: [item.link] });
        }
      }
      onSubmit();
      return;
    }

    if (!text.trim() && trigger === "prompt") return;
    const result = await create({
      trigger_typ: trigger,
      text,
      kategorie: category,
      sprachen: langs,
      urls: urls.filter((u) => u.trim()),
      bild_typ: imageType.toLowerCase(),
    });
    if (result) {
      onSubmit();
    }
  };

  const handleRssLoad = async () => {
    if (!rssUrl.trim()) return;
    setRssLoading(true);
    try {
      const result = await api.rss.parse(rssUrl);
      setRssItems(result.items.map((i) => ({ ...i, selected: false })));
    } catch { /* silent */ }
    setRssLoading(false);
  };

  const toggleLang = (l: string) =>
    setLangs((p) => ({ ...p, [l]: !p[l as keyof typeof p] }));

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).map((f) => ({
      name: f.name,
      size: (f.size / 1024).toFixed(0) + " KB",
      type: f.name.split(".").pop() ?? "file",
    }));
    setAttachments((p) => [...p, ...newFiles]);
  };

  const placeholders: Record<TriggerType, string> = {
    prompt:
      "Schreib frei \u2014 ein Satz, ein Absatz, Stichworte, Ideen. Das System erkennt Kontext, recherchiert und strukturiert automatisch.\n\nBeispiel: \u00ABArtikel \u00fcber EU AI Act Auswirkungen auf Kleinverlage, besonders \u00dcbersetzungstools. Kritisch, aber konstruktiv. Verweise auf unseren Bericht vom M\u00e4rz.\u00BB",
    url: "Recherche-Anweisung: Was soll mit den URLs geschehen?\n\nBeispiel: \u00ABFasse zusammen und vergleiche mit unserem Q1-Bericht. Fokus auf regulatorische Auswirkungen f\u00fcr Kleinverlage.\u00BB",
    rss: "Thema, Kontext, Zielgruppe...",
    calendar: "Thema, Kontext, Zielgruppe...",
    image: "Beschreibe das gew\u00fcnschte Bild oder Illustrationskonzept...",
  };

  const fieldLabels: Record<TriggerType, string> = {
    prompt: "Eingabe / Briefing",
    url: "Recherche-Anweisung",
    rss: "Thema / Notizen",
    calendar: "Thema / Notizen",
    image: "Bild-Beschreibung",
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }} className="anim-fade">
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1
            className="serif"
            style={{ fontSize: 28, color: COLORS.text, fontWeight: 400, marginBottom: 4 }}
          >
            Neuer Artikel
          </h1>
          <p style={{ color: COLORS.textMuted, fontSize: 12 }}>
            Lose Eingabe — das System strukturiert und recherchiert den Kontext.
          </p>
        </div>

        {/* Trigger Selector */}
        <fieldset
          style={{ border: "none", marginBottom: 24, padding: 0 }}
        >
          <legend
            style={{
              color: COLORS.textDim,
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Ausl&ouml;ser
          </legend>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="radiogroup">
            {TRIGGER_TYPES.map((t) => (
              <button
                key={t.id}
                role="radio"
                aria-checked={trigger === t.id}
                onClick={() => setTrigger(t.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "8px 14px",
                  border: `1px solid ${trigger === t.id ? COLORS.accent : COLORS.border}`,
                  background: trigger === t.id ? COLORS.accentGlow : COLORS.surface,
                  borderRadius: 4,
                  cursor: "pointer",
                  color: trigger === t.id ? COLORS.accent : COLORS.textMuted,
                  transition: "all 0.15s",
                  fontSize: 12,
                  fontFamily: "inherit",
                  minHeight: minTarget || undefined,
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 10 }}>
                  {t.icon}
                </span>
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20 }}>
          {/* Main input area */}
          <div>
            {/* Bulk toggle */}
            {features.bulk_input && trigger === "prompt" && (
              <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
                {(["Einzeln", "Mehrere"] as const).map((mode) => (
                  <Button
                    key={mode}
                    variant={
                      (mode === "Einzeln" && !bulkMode) || (mode === "Mehrere" && bulkMode)
                        ? "primary"
                        : "ghost"
                    }
                    onClick={() => setBulkMode(mode === "Mehrere")}
                    style={{ padding: "5px 12px", fontSize: 11 }}
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            )}

            {/* RSS feed input */}
            {trigger === "rss" && features.rss && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: COLORS.textDim, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                  RSS-Feed URL
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input
                    value={rssUrl}
                    onChange={(e) => setRssUrl(e.target.value)}
                    placeholder="https://example.com/feed.xml"
                    aria-label="RSS-Feed URL"
                    style={{ flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: "8px 12px", color: COLORS.text, fontFamily: "inherit", fontSize: 12, outline: "none" }}
                  />
                  <Button onClick={handleRssLoad} disabled={rssLoading} style={{ padding: "8px 12px" }}>
                    {rssLoading ? "Lade..." : "Feed laden"}
                  </Button>
                </div>
                {rssItems.length > 0 && (
                  <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: 12, maxHeight: 240, overflow: "auto" }}>
                    {rssItems.map((item, i) => (
                      <label key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer", fontSize: 12, color: COLORS.text }}>
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => setRssItems((prev) => prev.map((it, j) => j === i ? { ...it, selected: !it.selected } : it))}
                        />
                        {item.title}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Text area */}
            <div
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                overflow: "hidden",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  padding: "10px 16px",
                  borderBottom: `1px solid ${COLORS.border}`,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <label
                  htmlFor="article-input"
                  style={{
                    color: COLORS.textDim,
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {bulkMode ? "Themen (1 pro Zeile)" : fieldLabels[trigger]}
                </label>
                <span aria-live="polite" style={{ color: COLORS.textDim, fontSize: 10 }}>
                  {text.length} Zeichen
                </span>
              </div>
              <textarea
                id="article-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholders[trigger]}
                style={{
                  width: "100%",
                  minHeight: 180,
                  background: "transparent",
                  border: "none",
                  color: COLORS.text,
                  fontFamily: "inherit",
                  fontSize: 13,
                  padding: 16,
                  resize: "vertical",
                  outline: "none",
                  lineHeight: 1.7,
                }}
              />
            </div>

            {/* URL inputs */}
            {(trigger === "url" || trigger === "prompt") && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    color: COLORS.textDim,
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  {trigger === "url" ? "Quell-URLs" : "Kontext-URLs (optional)"}
                </div>
                {urls.map((u, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input
                      value={u}
                      onChange={(e) =>
                        setUrls((p) => p.map((x, j) => (j === i ? e.target.value : x)))
                      }
                      placeholder="https://..."
                      aria-label={`Kontext-URL ${i + 1}`}
                      style={{
                        flex: 1,
                        background: COLORS.surface,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 4,
                        padding: "8px 12px",
                        color: COLORS.text,
                        fontFamily: "inherit",
                        fontSize: 12,
                        outline: "none",
                        minHeight: minTarget || undefined,
                      }}
                    />
                    {i === urls.length - 1 && (
                      <Button
                        onClick={() => setUrls((p) => [...p, ""])}
                        aria-label="Weitere URL hinzuf&uuml;gen"
                        style={{ padding: "8px 12px" }}
                      >
                        +
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Attachments */}
            <div
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  padding: "10px 16px",
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
                  Attachments
                </span>
                <Button
                  onClick={() => fileRef.current?.click()}
                  style={{ padding: "4px 10px", fontSize: 10 }}
                >
                  + Datei
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                  aria-label="Dateien hochladen"
                />
              </div>
              {attachments.length === 0 ? (
                <div
                  style={{
                    padding: "24px 16px",
                    textAlign: "center",
                    color: COLORS.textDim,
                    fontSize: 11,
                  }}
                >
                  PDFs, Bilder, Texte — per Drag & Drop oder Klick
                </div>
              ) : (
                <ul style={{ padding: 8, listStyle: "none" }}>
                  {attachments.map((a, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        borderRadius: 4,
                        background: COLORS.surfaceHigh,
                        marginBottom: 4,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: COLORS.accent, fontSize: 10 }}>
                          {a.type === "pdf"
                            ? "PDF"
                            : a.type === "txt"
                              ? "TXT"
                              : "IMG"}
                        </span>
                        <span style={{ color: COLORS.text, fontSize: 12 }}>{a.name}</span>
                        <span style={{ color: COLORS.textDim, fontSize: 10 }}>{a.size}</span>
                      </div>
                      <button
                        onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))}
                        aria-label={`${a.name} entfernen`}
                        style={{
                          color: COLORS.textDim,
                          cursor: "pointer",
                          fontSize: 12,
                          padding: "4px 8px",
                          background: "none",
                          border: "none",
                          fontFamily: "inherit",
                          minWidth: minTarget || undefined,
                          minHeight: minTarget || undefined,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        &times;
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div>
            {/* Kategorie */}
            <fieldset
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                marginBottom: 12,
                padding: 0,
              }}
            >
              <legend
                style={{
                  padding: "10px 14px",
                  color: COLORS.textDim,
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  width: "100%",
                  borderBottom: `1px solid ${COLORS.border}`,
                  display: "block",
                }}
              >
                Kategorie
              </legend>
              <div style={{ padding: 12 }} role="radiogroup">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    role="radio"
                    aria-checked={category === c}
                    onClick={() => setCategory(c)}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: 4,
                      cursor: "pointer",
                      marginBottom: 2,
                      background: category === c ? COLORS.accentGlow : "transparent",
                      color: category === c ? COLORS.accent : COLORS.textMuted,
                      fontSize: 12,
                      transition: "all 0.12s",
                      border: "none",
                      fontFamily: "inherit",
                      textAlign: "left",
                      minHeight: minTarget || undefined,
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Sprachen */}
            <fieldset
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                marginBottom: 12,
                padding: 0,
              }}
            >
              <legend
                style={{
                  padding: "10px 14px",
                  color: COLORS.textDim,
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  width: "100%",
                  borderBottom: `1px solid ${COLORS.border}`,
                  display: "block",
                }}
              >
                Sprachen
              </legend>
              <div style={{ padding: 12 }}>
                {(
                  [
                    ["de", "Deutsch (Master)"],
                    ["en", "English"],
                    ["es", "Espa\u00f1ol"],
                    ["fr", "Fran\u00e7ais"],
                  ] as const
                ).map(([l, label]) => (
                  <button
                    key={l}
                    onClick={() => l !== "de" && toggleLang(l)}
                    role="switch"
                    aria-checked={langs[l]}
                    aria-label={`${label} ${langs[l] ? "aktiviert" : "deaktiviert"}`}
                    disabled={l === "de"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: 4,
                      cursor: l === "de" ? "default" : "pointer",
                      marginBottom: 2,
                      background: "transparent",
                      border: "none",
                      fontFamily: "inherit",
                      minHeight: minTarget || undefined,
                    }}
                  >
                    <span
                      style={{
                        color: langs[l] ? COLORS.text : COLORS.textDim,
                        fontSize: 12,
                      }}
                    >
                      {label}
                    </span>
                    <div
                      aria-hidden="true"
                      style={{
                        width: 28,
                        height: 16,
                        borderRadius: 8,
                        background: langs[l] ? COLORS.accent : COLORS.border,
                        position: "relative",
                        transition: "background 0.2s",
                      }}
                    >
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: "#0f0f0f",
                          position: "absolute",
                          top: 2,
                          left: langs[l] ? 14 : 2,
                          transition: "left 0.2s",
                        }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Bild-Typ */}
            <fieldset
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                marginBottom: 20,
                padding: 0,
              }}
            >
              <legend
                style={{
                  padding: "10px 14px",
                  color: COLORS.textDim,
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  width: "100%",
                  borderBottom: `1px solid ${COLORS.border}`,
                  display: "block",
                }}
              >
                Bild-Generierung
              </legend>
              <div style={{ padding: 12 }} role="radiogroup">
                {IMAGE_TYPES.map((t) => (
                  <button
                    key={t}
                    role="radio"
                    aria-checked={imageType === t}
                    onClick={() => setImageType(t)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      padding: "4px 0",
                      minHeight: minTarget || undefined,
                      width: "100%",
                    }}
                  >
                    <div
                      aria-hidden="true"
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        border: `1px solid ${imageType === t ? COLORS.accent : COLORS.border}`,
                        background: imageType === t ? COLORS.accentGlow : "transparent",
                      }}
                    />
                    <span
                      style={{
                        color: imageType === t ? COLORS.text : COLORS.textMuted,
                        fontSize: 12,
                      }}
                    >
                      {t}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Submit */}
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={submitting || (!text.trim() && trigger === "prompt")}
              aria-label="Artikel generieren"
              style={{
                width: "100%",
                padding: 12,
                fontSize: 13,
                justifyContent: "center",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              {submitting ? (
                <>
                  <Spinner size={14} label="Agenten arbeiten" /> Agenten arbeiten&hellip;
                </>
              ) : (
                "\u2726 Artikel generieren"
              )}
            </Button>

            {/* Error */}
            {error && (
              <div
                role="alert"
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: "rgba(224,90,78,0.1)",
                  borderRadius: 6,
                  border: "1px solid rgba(224,90,78,0.3)",
                  color: COLORS.red,
                  fontSize: 11,
                }}
              >
                {error}
              </div>
            )}

            {/* Progress */}
            {submitting && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: COLORS.surface,
                  borderRadius: 6,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                {["Kontext analysiert", "Archiv durchsucht", "DE-Artikel wird erstellt\u2026"].map(
                  (s, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                        color: i < 2 ? COLORS.green : COLORS.accent,
                        fontSize: 11,
                      }}
                    >
                      {i < 2 ? "\u2713" : <Spinner size={10} />} {s}
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
