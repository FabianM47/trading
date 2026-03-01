# 📋 Projekt-Kontext: Trading App

## 🤖 Agents

Dieses Projekt nutzt spezialisierte Agent-Dateien im Ordner `agents/`.
Wenn eine Aufgabe zu einem der folgenden Agents passt, frage den User ob du die
entsprechende Datei als Kontext laden sollst:

- `api-designer.md` – API-Design & Route-Architektur
- `architect-reviewer.md` – Architektur-Reviews & Strukturentscheidungen
- `code-reviewer.md` – Code-Reviews & Qualitätssicherung
- `devops-engineer.md` – CI/CD, Deployment & Infrastruktur
- `frontend-developer.md` – Frontend-Entwicklung & React-Komponenten
- `fullstack-developer.md` – Fullstack-Aufgaben (Frontend + Backend)
- `mobile-developer.md` – Mobile-Entwicklung & Responsive Design
- `search-specialist.md` – Such-Funktionalität & Datenabfragen
- `security-auditor.md` – Sicherheits-Audits & Best Practices
- `ui-designer.md` – UI/UX-Design & visuelle Gestaltung

> **Hinweis an Copilot:** Wenn der User eine Aufgabe stellt, schlage vor:
> "Soll ich die Agent-Datei `agents/xxx.md` als Kontext laden? Nutze `#file:agents/xxx.md`"

## 🏗️ Plattform & Infrastruktur

- **Hosting:** Vercel (Serverless, Edge Functions)
- **Framework:** Next.js 14+ (App Router)
- **Sprache:** TypeScript (strict mode)
- **Datenbank:** Supabase (PostgreSQL) – gehostet, mit Row Level Security (RLS)
- **Auth:** Logto (OIDC/OAuth2, Authorization Code Flow + PKCE)
- **Data Fetching:** SWR (Stale-While-Revalidate)
- **Styling:** Tailwind CSS
- **Testing:** Vitest

// ...restlicher Inhalt bleibt gleich...

## ⚠️ Wichtige Regeln

- Niemals `SUPABASE_SERVICE_ROLE_KEY` im Frontend verwenden
- Alle API-Routes müssen Auth-Token validieren
- Trades immer über `user_id` isolieren (Multi-Tenancy)
- Fehler immer mit aussagekräftigen Nachrichten loggen
- Deutsche UI-Texte, englischer Code
- **Bei strukturellen Änderungen: Diese Datei UND `CONTEXT.md` aktualisieren**

## 📝 Änderungsprotokoll

> Bei strukturellen Änderungen diese Datei aktualisieren.