# CLAUDE.md

## Agent-Konfiguration

Alle Agents befinden sich im Ordner `/agents`. **Du MUSST vor jeder Aufgabe pruefen, welche Agents relevant sind und diese nutzen.**

### Agent-Auswahl Workflow

1. **Aufgabe analysieren** - Welche Schichten/Bereiche sind betroffen?
2. **Agents zuordnen** - Nutze die Tabelle unten
3. **Agent-Prompt laden** - Lies die `.md`-Datei und verwende den Inhalt als System-Prompt im `Agent`-Tool (`subagent_type: "general-purpose"`)
4. **Parallel ausfuehren** - Unabhaengige Agents koennen parallel laufen (z.B. Code-Review + Security-Audit)

### Agent-Zuordnung nach Aufgabe

| Aufgabe | Agent(s) | Wann nutzen |
|---------|----------|-------------|
| **UI-Komponenten bauen/aendern** | `frontend-developer` | React-Components, Styling, State-Management |
| **UI-Design, Farben, Layout** | `ui-designer` | Visuelle Aenderungen, Dark Mode, Responsiveness |
| **API-Routen aendern/erstellen** | `api-designer` | Neue Endpoints, API-Contracts, Fehlerformate |
| **Full-Stack Features** | `fullstack-developer` | Wenn DB + API + Frontend zusammen betroffen sind |
| **Code-Review nach Aenderungen** | `code-reviewer` | **IMMER nach groesseren Aenderungen ausfuehren!** |
| **Sicherheitspruefung** | `security-auditor` | Bei Auth, Input-Validation, API-Aenderungen |
| **Architektur-Entscheidungen** | `architect-reviewer` | Bei strukturellen Aenderungen, neuen Patterns |
| **Finanz-Logik** | `fintech-engineer` | P/L-Berechnungen, Kursumrechnung, Waehrungen |
| **Code-Suche/Recherche** | `search-specialist` | Komplexe Codebase-Suche ueber viele Dateien |
| **Mobile/PWA** | `mobile-developer` | PWA-Features, Push Notifications, Service Worker |
| **Deployment/CI** | `devops-engineer` | Vercel, Build-Config, Environment Variables |
| **Risiko-Bewertung** | `risk-manager` | Neue Trading-Features mit Risiko-Implikationen |
| **Dokumentation** | `documentation-writer` | README, API-Docs, Architektur-Docs, Guides, Code-Kommentare |

### Pflicht-Agents

Diese Agents MUESSEN bei bestimmten Aktionen genutzt werden:

- **`code-reviewer`**: Nach jeder groesseren Code-Aenderung (> 3 Dateien oder kritische Logik)
- **`security-auditor`**: Bei Aenderungen an Auth, API-Input-Handling, oder Datenbankzugriff

### So wird ein Agent aufgerufen

```
Agent Tool:
  subagent_type: "general-purpose"
  prompt: "<Inhalt der agents/*.md Datei>\n\n## Aufgabe\n<Konkrete Aufgabe beschreiben>"
```

Der Agent-Inhalt wird als System-Prompt vor die eigentliche Aufgabe gestellt. So erhaelt der Sub-Agent seine Rolle und Expertise.

### Parallele Nutzung

Bei komplexen Aufgaben mehrere Agents **parallel** starten:

```
Beispiel: Neues Feature "Preis-Alerts"
  -> Agent 1: fullstack-developer (implementiert)
  -> Agent 2: code-reviewer (reviewed, nachdem Agent 1 fertig)
  -> Agent 3: security-auditor (parallel zum code-reviewer)
```

### Hinweise

- Agents sind als Markdown-Dateien (`.md`) im Ordner `agents/` abgelegt
- Jeder Agent hat ein YAML-Frontmatter mit `name`, `description`, `tools` und `model`
- Nutze immer den spezifischsten Agent fuer die jeweilige Aufgabe
- Falls kein passender Agent existiert, arbeite ohne Agent und schlage vor, einen neuen Agent anzulegen
- Beim Code-Review: Gib dem Agent ALLE geaenderten Dateipfade mit, damit er sie lesen kann
- Bei Research-Aufgaben: Nutze `search-specialist` statt manuell zu suchen

## Projekt-Kontext

- **Tech-Stack**: Next.js 16, React 18, TypeScript, TailwindCSS, Supabase, SWR
- **Deployment**: Vercel
- **Auth**: Logto
- **Kurs-Provider**: Yahoo Finance, ING, Finnhub, CoinGecko (Waterfall-Strategie)
- **Sprache**: Deutsche UI, englischer Code
