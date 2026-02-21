# Product Requirements — clnpth (KI-Redaktionssystem)

## Vision

Mehrsprachiges KI-Redaktionssystem fuer WordPress-Publikationen. Automatisiert den Workflow von Themenrecherche ueber Artikelgenerierung, Uebersetzung, Bildproduktion bis zur WordPress-Veroeffentlichung.

## Zielgruppe

Redaktionsteam (Solo/Klein) mit WordPress-Website, das regelmaessig mehrsprachige Inhalte publiziert.

## Kern-Features

### 1. Artikel-Pipeline
- Thema eingeben → KI generiert Artikelentwurf (via n8n + Claude)
- Review im Web-UI mit TipTap-Editor
- Freigabe/Ueberarbeitung durch Redakteur

### 2. Uebersetzungs-Pipeline
- DE → EN/ES/FR via DeepL (maschinell) + Mistral (idiomatische Pruefung)
- Sprachversionen einzeln freigeben
- Qualitaetsbewertung pro Sprache

### 3. Bild-Pipeline
- 4 Bildtypen: Hero, Social, Thumbnail, Infografik
- ComfyUI lokal (SDXL) oder RunPod (Flux) als Fallback
- Bilder direkt an WordPress-Media-Library

### 4. Supervisor + Lernstrategie
- Automatische Artikelbewertung (4 Kriterien: Tonalitaet, Faktentreue, SEO, Zielgruppe)
- Lernender Stilguide (Tonality-Profil passt sich durch Feedback an)
- Themen-Ranking: Statistik + Freigaberate je Kategorie

### 5. WordPress-Integration
- REST API v2 (Application Passwords)
- Post erstellen + Uebersetzungen als verknuepfte Posts
- SEO-Meta (Yoast/RankMath kompatibel)

## Nicht-funktionale Anforderungen

- **Datenschutz:** EU-konforme Dienste (DeepL Koeln, Mistral Paris), lokale Fonts (DSGVO)
- **Barrierefreiheit:** WCAG AAA, 44px Touch-Targets, Farbenblind-Modus, Skip-Nav
- **Performance:** Async durchgehend (Backend + Frontend), WebSocket fuer Live-Updates
- **Sicherheit:** Parametrisierte Queries, Input-Validierung, kein Credential-Leak

## Aktueller Status

Alle 7 Implementierungsphasen abgeschlossen. Frontend-Screens an echte API-Hooks angebunden.

## Offene Anforderungen

1. n8n-Workflows fuer die Artikel-Pipeline erstellen
2. TipTap-Editor im ReviewScreen integrieren
3. WebSocket-Integration in allen Screens
4. Tests (pytest Backend, Vitest Frontend)
5. Erstes VPS-Deployment
6. API-Keys konfigurieren (DeepL, Mistral, WP)
