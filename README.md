# clnpth

Beschreibung folgt.

## Voraussetzungen

- Node.js 24
- PostgreSQL 16 (laeuft im Docker-Stack)
- Docker Desktop

## Setup

```bash
# Repository klonen
git clone https://github.com/TiRigit/clnpth.git
cd clnpth

# Umgebungsvariablen konfigurieren
cp .env.example .env && chmod 600 .env
# .env bearbeiten und Werte eintragen

# Abhaengigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev
```

## Projektstruktur

```
src/
├── components/
├── styles/
├── utils/
└── pages/
```

## Entwicklung

Siehe `CLAUDE.md` fuer Agent-Konfiguration und Projektkonventionen.

## Lizenz

Privat — Alle Rechte vorbehalten.
