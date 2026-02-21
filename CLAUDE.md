# clnpth — Agent-Anweisungen

## Projekt

KI-Redaktionssystem (Mehrsprachige WordPress-Publikation).
Anforderungen: `docs/PRD.md`
GitHub: https://github.com/TiRigit/clnpth
DB-Schema: `clnpth`

## Tech-Stack

- **Frontend:** React 19 + Vite + TypeScript (strict mode)
- **Backend:** FastAPI (Python 3.12) + SQLAlchemy 2.0 + asyncpg
- **Editor:** TipTap (noch nicht integriert)
- **DB:** PostgreSQL 16 + pgVector
- **Orchestrator:** n8n (localhost:5678)

## Verzeichnisstruktur

```
frontend/src/
  screens/       # Input, Review, Queue, Archive, Supervisor
  components/    # Nav, Badge, Button, Spinner, Divider, A11yPanel
  hooks/         # useArticles, useTranslations, useImage, useSupervisor, usePublish, useWebSocket
  api/           # client.ts (typisiert)
  styles/        # Design Tokens + Accessibility + lokale Fonts

backend/
  routes/        # articles, translations, images, supervisor, publish, webhook
  services/      # n8n, deepl, mistral, translation_pipeline, supervisor_agent, learning_strategy,
                 # comfyui, runpod, image_pipeline, wordpress
  db/            # models.py, schemas.py, session.py
```

## Entwicklung

```bash
# Backend (Port 8001)
cd backend && source .venv/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8001 --reload

# Frontend (Port 5173, Proxy → 8001)
cd frontend && npm run dev
```

## Konfiguration (.env)

Alle mit Prefix `CLNPTH_`: DATABASE_URL, DEEPL_API_KEY, MISTRAL_API_KEY, WP_URL, WP_USER, WP_APP_PASSWORD, RUNPOD_API_KEY, RUNPOD_ENDPOINT_ID, N8N_URL, N8N_WEBHOOK_TOKEN, COMFYUI_URL

## Datenbank-Tabellen

`redaktions_log`, `artikel_archiv` (+ pgVector), `artikel_uebersetzungen`, `supervisor_log`, `tonality_profil`, `themen_ranking`

## API-Endpunkte

| Pfad | Beschreibung |
|------|-------------|
| `/api/articles/` | CRUD + n8n-Trigger |
| `/api/articles/{id}/approve` | Freigeben + Lernstrategie |
| `/api/articles/{id}/revise` | Ueberarbeiten + Re-Trigger |
| `/api/articles/{id}/translations/` | Uebersetzungen (GET/POST/PATCH) |
| `/api/articles/{id}/image/trigger` | Bildgenerierung |
| `/api/articles/{id}/publish/` | WordPress-Publikation |
| `/api/supervisor/dashboard` | Komplett-Dashboard |
| `/api/supervisor/tonality` | Tonalitaets-Profil CRUD |
| `/api/webhook/n8n` | n8n-Callback |
| `/ws/status` | WebSocket Live-Updates |

## Design Tokens

```
Hintergrund: #0f0f0f / #161616 / #1e1e1e
Akzent:      #c8a96e (warmes Gold)
Text:        #e8e4dc (warm weiss)
Schriften:   Playfair Display (Ueberschriften), JetBrains Mono (UI) — lokal, DSGVO
```

## Bekannte Probleme

- asyncpg braucht `ssl="disable"` fuer lokalen PostgreSQL
- DB-Spalten `TIMESTAMP WITHOUT TIME ZONE` — kein `datetime.now(timezone.utc)`
- Port 8000 belegt durch Paperless → Backend auf 8001

## Regeln

1. TypeScript strict mode im Frontend, Python type hints im Backend
2. Keine Credentials in Code — .env mit CLNPTH_ Prefix
3. SQL: Parametrisierte Queries
4. EU-Konformitaet: DeepL (Koeln), Mistral (Paris), lokale Fonts
5. Conventional Commits (Englisch)
