# Projekt-Agent-Anweisungen — Web-App

## Projekt
Name: clnpth
Typ: Web-Applikation
DB-Schema: clnpth

## Architektur
- Frontend: React/Vite oder Vanilla JS
- Styling: Globale Tokens + Projekt-Overrides (CSS Custom Properties)
- Backend: Node.js / Express (falls benoetigt)
- Datenbank: PostgreSQL Schema `clnpth` in bestehender Instanz

## Agent-Bereiche

### Style-Agent
- Zustaendig fuer: CSS, Responsive Design, Dark Mode, Barrierefreiheit
- Globale Tokens in `src/styles/global/` (Symlink, nicht editieren!)
- Projekt-Overrides in `src/styles/project.css`
- Konvention: CSS Custom Properties, BEM fuer Komponentennamen
- Pruefe immer: `prefers-reduced-motion`, `prefers-color-scheme`

### Funktions-Agent
- Zustaendig fuer: Geschaeftslogik, API-Calls, Validierung, Utils
- Code in `src/utils/` und `src/pages/`
- Konvention: TypeScript strict, async/await, Error Boundaries
- DB-Zugriff nur ueber parametrisierte Queries ($1, $2)
- Keine Secrets in Code — .env nutzen

### Komponenten-Agent
- Zustaendig fuer: UI-Komponenten in `src/components/`
- Jede Komponente = eigener Ordner mit .tsx/.css/.test
- Nutze globale Utility-Klassen (.btn, .card, .badge)
- Barrierefreiheit: ARIA-Labels, semantisches HTML, Keyboard-Navigation

### Docker-Agent
- Zustaendig fuer: `docker/` Ordner, Dockerfile, docker-compose.override.yml
- Bestehenden Stack nicht duplizieren (PostgreSQL, Ollama, n8n laufen bereits)
- Projekt-Services als docker-compose.override.yml

### Test-Agent
- Zustaendig fuer: `tests/` Ordner
- Unit-Tests fuer Utils und Komponenten
- Integration-Tests fuer API-Endpunkte
- Vor jedem Commit: Tests ausfuehren

## Agent-Registry

Dieses Projekt ist in der zentralen Agent-Registry registriert.
- **Project Head:** `head-clnpth` (koordiniert alle Domain-Agents)
- **Domain Hands:** style, function, component, test, docker, security, monitor
- **Berechtigungen:** Verwaltet via `agent-manager` (kaskadierende MCP-Autorisierung)
- **Prompt-Generierung:** `agent-manager prompt <agent-name>`

## Regeln
1. Sprache: Deutsch fuer Kommunikation, Englisch fuer Code
2. Keine Credentials in Code oder Commits
3. Git: Feature-Branches, PRs, keine Force-Pushes
4. CSS: Global Tokens → Projekt Override (nie globale Dateien editieren)
5. Sicherheit: Input validieren, Output escapen, OWASP beachten
