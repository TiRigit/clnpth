# Projekt-Agent-Anweisungen — clnpth (KI-Redaktionssystem)

## Projekt
Name: clnpth
Typ: KI-Redaktionssystem (Mehrsprachige WordPress-Publikation)
DB-Schema: clnpth
Frontend: React + Vite + TypeScript (strict mode)
Backend: FastAPI (Python 3.12) + SQLAlchemy 2.0 + asyncpg
Editor: TipTap (Prosemirror-basiert) — noch nicht integriert
GitHub: https://github.com/TiRigit/clnpth
Status: Alle 7 Phasen implementiert, Frontend-Screens an echte API-Hooks angebunden

## Architektur-Ueberblick

```
Lokales Web-UI (FastAPI + React)
    ↕
n8n Orchestrator (localhost:5678)
    ↕
┌────────────────────────────────────┐
│ Kontext-Agent                      │
│ Redaktions-Agent (Claude)          │
│ Uebersetzungs-Team (DeepL+Mistral)│
│ SEO-Agent (Claude)                 │
│ Bild-Agent (ComfyUI/RunPod)       │
│ Supervisor (Mistral Large, EU)     │
└────────────────────────────────────┘
    ↕
WordPress REST API (Application Passwords)
```

## Verzeichnisstruktur

```
clnpth/
├── frontend/                    # React (Vite) + TypeScript
│   ├── src/
│   │   ├── screens/             # 5 Haupt-Screens (Input, Review, Queue, Archive, Supervisor)
│   │   ├── components/          # Nav, Badge, Button, Spinner, Divider, A11yPanel
│   │   ├── hooks/               # useArticles, useTranslations, useImage, useSupervisor,
│   │   │                        # usePublish, useWebSocket, useAccessibility
│   │   ├── api/                 # Typisierter API-Client (client.ts)
│   │   ├── utils/               # timeAgo etc.
│   │   ├── styles/              # Design Tokens + Accessibility CSS + lokale Fonts
│   │   └── types/               # TypeScript-Typen
│   ├── public/fonts/            # Playfair Display + JetBrains Mono (TTF, DSGVO-lokal)
│   └── vite.config.ts           # Proxy: /api → 8001, /ws → ws://8001
├── backend/
│   ├── main.py                  # FastAPI App + SPA-Serving + Static Files
│   ├── config.py                # Pydantic Settings (CLNPTH_ prefix, ../.env)
│   ├── ws.py                    # WebSocket ConnectionManager
│   ├── routes/
│   │   ├── articles.py          # CRUD + n8n-Trigger + Lernstrategie-Integration
│   │   ├── translations.py      # Trigger, List, Edit, Approve
│   │   ├── images.py            # Trigger, Status, Backends
│   │   ├── supervisor.py        # Dashboard, Evaluate, Tonality CRUD, Topics
│   │   ├── publish.py           # WordPress-Publikation (DE + Uebersetzungen)
│   │   └── webhook.py           # n8n-Callback (Artikel/Uebersetzung/Supervisor Upsert)
│   ├── services/
│   │   ├── n8n_client.py        # n8n Webhook-Trigger
│   │   ├── deepl_client.py      # DeepL API (DE→EN/ES/FR, HTML-Handling)
│   │   ├── mistral_client.py    # Mistral Review (idiomatische Qualitaet)
│   │   ├── translation_pipeline.py  # DeepL → Mistral → DB → WebSocket
│   │   ├── supervisor_agent.py  # Mistral Large Artikelbewertung (4 Kriterien)
│   │   ├── learning_strategy.py # Tonality-Profil + Themen-Ranking + Abweichungen
│   │   ├── comfyui_client.py    # ComfyUI SDXL Workflows (4 Bildtypen)
│   │   ├── runpod_client.py     # RunPod Serverless Fallback
│   │   ├── image_pipeline.py    # ComfyUI → RunPod → Speichern → DB
│   │   └── wordpress_client.py  # WP REST API v2 (Posts, Media, SEO-Meta)
│   ├── db/
│   │   ├── models.py            # SQLAlchemy: 6 Tabellen + pgVector
│   │   ├── schemas.py           # Pydantic Request/Response Schemas
│   │   └── session.py           # Async Engine (ssl=disable) + search_path
│   └── .venv/                   # Python 3.14 Virtual Environment
├── Dockerfile                   # Multi-Stage: Node frontend-build + Python backend
├── docker-compose.vps.yml       # Production: App + pgvector DB + Volumes
├── Caddyfile.block              # Reverse Proxy fuer clnpth.solvingsystems.de
├── .dockerignore
└── CLAUDE.md                    # Diese Datei
```

## Datenbank-Tabellen (Schema: clnpth)

- `redaktions_log` — Artikel-Tracking (Trigger, Status, Kontext, Sprachen)
- `artikel_archiv` — Volltext + pgVector Embeddings + SEO + Bild
- `artikel_uebersetzungen` — Sprachvarianten (DE/EN/ES/FR) + wp_post_id
- `supervisor_log` — Entscheidungen, Scores, Feedback, Abweichungen
- `tonality_profil` — Lernender Stilguide (Merkmale, Gewichtung, Belege)
- `themen_ranking` — Statistik, Freigaberate je Kategorie

## API-Endpunkte

| Pfad | Methode | Beschreibung |
|------|---------|-------------|
| `/api/articles/` | GET, POST | Artikelliste / Erstellen + n8n-Trigger |
| `/api/articles/stats` | GET | Queue-Statistiken |
| `/api/articles/{id}` | GET | Detail mit Archiv, Uebersetzungen, Supervisor |
| `/api/articles/{id}/approve` | PATCH | Freigeben + Lernstrategie-Update |
| `/api/articles/{id}/revise` | PATCH | Ueberarbeiten + n8n Re-Trigger |
| `/api/articles/{id}/translations/` | GET, POST trigger | Uebersetzungen |
| `/api/articles/{id}/translations/{lang}` | GET, PATCH, POST approve | Einzelsprache |
| `/api/articles/{id}/image/trigger` | POST | Bildgenerierung starten |
| `/api/articles/{id}/image/status` | GET | Bildstatus |
| `/api/articles/{id}/publish/` | POST | WordPress-Publikation |
| `/api/articles/{id}/publish/status` | GET | Publikationsstatus |
| `/api/supervisor/dashboard` | GET | Komplett-Dashboard |
| `/api/supervisor/evaluate` | POST | Supervisor-Bewertung triggern |
| `/api/supervisor/tonality` | GET, POST, DELETE | Tonalitaets-Profil CRUD |
| `/api/webhook/n8n` | POST | n8n-Callback |
| `/api/health` | GET | Health-Check |
| `/ws/status` | WS | Live-Status-Updates |

## Konfiguration (.env)

Alle mit Prefix `CLNPTH_`:
- `DATABASE_URL` — PostgreSQL (asyncpg, ssl=disable lokal)
- `DEEPL_API_KEY` — DeepL Free/Pro
- `MISTRAL_API_KEY` — Mistral Large (Supervisor + Translation Review)
- `WP_URL`, `WP_USER`, `WP_APP_PASSWORD` — WordPress
- `RUNPOD_API_KEY`, `RUNPOD_ENDPOINT_ID` — RunPod (optional)
- `N8N_URL`, `N8N_WEBHOOK_TOKEN` — n8n Orchestrator
- `COMFYUI_URL` — ComfyUI (localhost:8188)

## Barrierefreiheit

Opt-Out-System (Standard: barrierearm):
- `useAccessibility` Hook mit localStorage-Persistenz
- A11yPanel: Toggle "Barrierearm" (44px Targets) / "Kompakt" (keine Min-Groesse)
- Farbenblind-Modus: Pattern-Indikatoren via CSS `data-cb-*` Attribute
- Skip-Navigation, ARIA Labels/Roles/Live-Regions, Focus-Visible
- Lokale Fonts (DSGVO): Playfair Display + JetBrains Mono (TTF)
- `prefers-reduced-motion` + `prefers-contrast: high` unterstuetzt

## Design Tokens

```
Hintergrund:    #0f0f0f (tief schwarz)
Oberflaechen:   #161616 / #1e1e1e
Akzent:         #c8a96e (warmes Gold)
Text:           #e8e4dc (warm weiss)
Gruen/Rot/Blau: #4caf7d / #e05a4e / #5a8fc8
Schriften:      Playfair Display (Ueberschriften), JetBrains Mono (UI)
```

## Entwicklung

```bash
# Backend (Port 8001, da 8000 von Paperless belegt)
cd backend && source .venv/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8001 --reload

# Frontend (Port 5173, Proxy → 8001)
cd frontend && npm run dev

# Docker-Stack (PostgreSQL muss laufen)
cd /Volumes/AI-Data/AI-Projekt && docker compose up -d postgres
```

## Bekannte Probleme

- asyncpg braucht `ssl="disable"` fuer lokalen PostgreSQL-Container
- DB-Spalten sind `TIMESTAMP WITHOUT TIME ZONE` — kein `datetime.now(timezone.utc)` verwenden
- Port 8000 belegt durch Paperless → Backend auf 8001
- TipTap-Editor noch nicht integriert
- WebSocket-Live-Updates noch nicht in Screens integriert (Hook existiert)

## Implementierungs-Phasen

- **Phase 0:** Scaffolding + DB ✓
- **Phase 1-2:** UI-Migration + Accessibility ✓
- **Phase 3:** Backend API (FastAPI + asyncpg) ✓
- **Phase 4:** Uebersetzungs-Pipeline (DeepL + Mistral) ✓
- **Phase 5:** Bild-Pipeline (ComfyUI + RunPod) ✓
- **Phase 6:** Supervisor + Lernstrategie ✓
- **Phase 7:** WordPress-Integration + Deployment ✓

## Naechste Schritte

- [ ] n8n-Workflows fuer Artikel-Pipeline erstellen
- [x] Frontend-Screens an echte Hooks anbinden (Mockdaten ersetzen)
- [ ] WebSocket-Integration (useWebSocket fuer Live-Updates in Screens)
- [ ] TipTap-Editor im ReviewScreen integrieren
- [ ] Tests schreiben (pytest Backend, Vitest Frontend)
- [ ] Erstes VPS-Deployment via `deploy clnpth`
- [ ] API-Keys in .env konfigurieren (DeepL, Mistral, WP)

## Modell-Auswahl (Subagents)

| Aufgabe | Modell | Begruendung |
|---------|--------|-------------|
| Scaffolding, Boilerplate | Haiku | Schnell, guenstig |
| Recherche, Exploration | Haiku | Lese-Tasks |
| Komponenten, API-Routen | Sonnet | Standard |
| Architektur, komplexe Refactors | Opus | Nur wenn Tiefe noetig |
| Tests, CI/CD | Sonnet | Standard |
| Barrierefreiheit-Pruefung | Sonnet | Domain-Expertise |

## Regeln

1. Sprache: Deutsch fuer Kommunikation, Englisch fuer Code
2. TypeScript strict mode im Frontend
3. Python type hints im Backend
4. Keine Credentials in Code oder Commits
5. SQL: Parametrisierte Queries, kein String-Concatenation
6. Git: Conventional Commits
7. Schriften: Lokal einbinden (DSGVO), keine Google Fonts CDN
8. EU-Konformitaet: Daten bevorzugt EU-verortet (DeepL Koeln, Mistral Paris)
