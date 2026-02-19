# Projekt-Agent-Anweisungen — clnpth (KI-Redaktionssystem)

## Projekt
Name: clnpth
Typ: KI-Redaktionssystem (Mehrsprachige WordPress-Publikation)
DB-Schema: clnpth
Frontend: React + Vite + TypeScript (strict mode)
Backend: FastAPI (Python 3.12) + SQLAlchemy 2.0
Editor: TipTap (Prosemirror-basiert)

## Architektur-Ueberblick

```
Lokales Web-UI (FastAPI + React)
    ↕
n8n Orchestrator (localhost:5678)
    ↕
┌────────────────────────────┐
│ Kontext-Agent              │
│ Redaktions-Agent (Claude)  │
│ Uebersetzungs-Team         │ ← DeepL + Mistral Review
│ SEO-Agent (Claude)         │
│ Bild-Agent (ComfyUI)       │
│ Supervisor (Mistral Large) │
└────────────────────────────┘
    ↕
WordPress REST API (Local App → Hetzner)
```

## Verzeichnisstruktur

```
clnpth/
├── frontend/                    # React (Vite) + TypeScript
│   ├── src/
│   │   ├── screens/             # 5 Haupt-Screens
│   │   ├── components/          # Wiederverwendbare UI-Bausteine
│   │   ├── hooks/               # Custom Hooks (WebSocket, Artikel, A11y)
│   │   ├── styles/              # Design Tokens + Accessibility CSS
│   │   └── types/               # TypeScript-Typen
│   └── package.json
├── backend/
│   ├── main.py                  # FastAPI App
│   ├── config.py                # Pydantic Settings
│   ├── routes/                  # API-Endpunkte
│   ├── services/                # Externe Dienste (n8n, WP, DeepL, ComfyUI)
│   ├── db/                      # SQLAlchemy Models + Alembic Migrations
│   └── tests/
├── CLAUDE.md                    # Diese Datei
└── docker-compose.yml           # Dev-Overrides (nutzt bestehenden PG-Stack)
```

## Datenbank-Tabellen (Schema: clnpth)

- `redaktions_log` — Artikel-Tracking (Trigger, Status, Kontext)
- `artikel_archiv` — Volltext + pgVector Embeddings
- `artikel_uebersetzungen` — Sprachvarianten (DE/EN/ES/FR)
- `supervisor_log` — Entscheidungen, Scores, Feedback
- `tonality_profil` — Lernender Stilguide
- `themen_ranking` — Statistik, Freigaberate je Kategorie
- `rss_archiv` — Gefilterte Feed-Eintraege

## Barrierefreiheit (WCAG AAA)

WICHTIG: Barrierefreiheit ist Kernfeature, nicht Nachruestung.
- Touch-Targets: min 44x44px
- Skip-Navigation: "Zum Hauptinhalt", "Zur Navigation"
- ARIA: Labels, Roles, Live-Regions fuer Status-Updates
- Tastatur: Tab-Reihenfolge, Focus-Visible, Escape-Schliessung
- Farbenblind-Modus: Pattern-Indikatoren zusaetzlich zu Farben
- Zoom: CSS rem-basiert, 200% ohne Layout-Bruch
- Reduzierte Bewegung: `prefers-reduced-motion` respektieren
- Hoher Kontrast: `prefers-contrast: high` unterstuetzen
- TipTap-Editor: Toolbar per Tastatur navigierbar

## Design Tokens

```
Hintergrund:    #0f0f0f (tief schwarz)
Oberflaechen:   #161616 / #1e1e1e
Akzent:         #c8a96e (warmes Gold)
Text:           #e8e4dc (warm weiss)
Gruen/Rot/Blau: #4caf7d / #e05a4e / #5a8fc8
Schriften:      Playfair Display (Ueberschriften), JetBrains Mono (UI)
```

## Modell-Auswahl (Subagents)

| Aufgabe | Modell | Begruendung |
|---------|--------|-------------|
| Scaffolding, Boilerplate | Haiku | Schnell, guenstig |
| Recherche, Exploration | Haiku | Lese-Tasks |
| Komponenten, API-Routen | Sonnet | Standard |
| Architektur, komplexe Refactors | Opus | Nur wenn Tiefe noetig |
| Tests, CI/CD | Sonnet | Standard |
| Barrierefreiheit-Pruefung | Sonnet | Domain-Expertise |

## Implementierungs-Phasen

- **Phase 0:** Scaffolding + DB ← AKTUELL
- **Phase 1:** UI-Grundgeruest + Eingabe-Screen
- **Phase 2:** Redaktions-Screen + Queue
- **Phase 3:** n8n + Claude Integration
- **Phase 4:** Uebersetzungs-Pipeline (DeepL + Mistral)
- **Phase 5:** Bild-Pipeline (ComfyUI + RunPod)
- **Phase 6:** Supervisor + Lernstrategie
- **Phase 7:** WordPress-Integration + Deployment

## Agent-Registry

- **Project Head:** `head-clnpth` (koordiniert alle Domain-Agents)
- **Domain Hands:** style, function, component, test, docker, security, monitor

## Regeln

1. Sprache: Deutsch fuer Kommunikation, Englisch fuer Code
2. TypeScript strict mode im Frontend
3. Python type hints im Backend
4. Keine Credentials in Code oder Commits
5. SQL: Parametrisierte Queries, kein String-Concatenation
6. Git: Feature-Branches, Conventional Commits
7. Schriften: Lokal einbinden (DSGVO), keine Google Fonts CDN
8. EU-Konformitaet: Daten bevorzugt EU-verortet (DeepL Koeln, Mistral Paris)
