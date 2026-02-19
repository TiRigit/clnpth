# FAQ — clnpth

Haeufig gestellte Fragen zu clnpth.

---

## Setup & Installation

### Wie starte ich das Projekt lokal?

```bash
# Voraussetzungen: Node.js 24, PostgreSQL laeuft (Docker-Stack)
cp .env.example .env && chmod 600 .env
# .env mit korrekten Werten fuellen, dann:
npm install && npm run dev
```

### Welche Umgebungsvariablen brauche ich?

Siehe `.env.example` — alle noetige Variablen sind dort dokumentiert.

---

## Entwicklung

### Wo finde ich die Agent-Konfiguration?

In `CLAUDE.md` — dort sind alle Domain-Agents und ihre Zustaendigkeiten beschrieben.

### Wie fuehre ich Tests aus?

```bash
npm test
```

---

## Datenbank

### Welches DB-Schema nutzt das Projekt?

Schema: `clnpth` in der bestehenden PostgreSQL-Instanz (ai-postgres Container).

---

*Letzte Aktualisierung: 2026-02-19*
