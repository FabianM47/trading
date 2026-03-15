# Plan: Auto-Trading Bot (Phase 2)

Bot analysiert Watchlist automatisch, eroeffnet/schliesst Trades mit virtuellem Budget, dokumentiert Learnings.

## Architektur-Ueberblick

```
Vercel Cron (konfigurierbar)
  → /api/trading-bot/analyze (GET)
    → Fuer jeden User mit auto_trade_enabled:
      1. Watchlist + aktuelle Kurse laden
      2. Aktive Strategie (Markdown) laden
      3. Offene Bot-Trades laden
      4. Letzte Learnings laden (Kontext fuer LLM)
      5. Technische Indikatoren laden (ticker_technicals)
      6. LLM-Call: Strategie + Daten → Signale (JSON)
      7. Signale ausfuehren:
         - BUY → Trade eroeffnen (signal_type='bot_auto')
         - SELL → Trade schliessen + Learning auto-generieren
         - HOLD → nichts tun
```

## Schritt 1: DB-Schema erweitern

**Datei**: `scripts/bot-migration.sql` (+ neues SQL-Migrations-Snippet)

Neue Spalten auf `bot_user_configs`:
- `auto_trade_enabled` BOOLEAN DEFAULT false
- `analysis_interval_minutes` INTEGER DEFAULT 240 (= 4 Stunden)
- `auto_close_enabled` BOOLEAN DEFAULT true

Neue Spalte auf `bot_trade_learnings`:
- `auto_generated` BOOLEAN DEFAULT false (unterscheidet manuelle vs. Bot-Learnings)

Neue Log-Tabelle `bot_analysis_log`:
- `id` UUID PK
- `user_id` TEXT
- `analyzed_at` TIMESTAMPTZ
- `watchlist_count` INTEGER
- `signals_generated` INTEGER
- `trades_opened` INTEGER
- `trades_closed` INTEGER
- `llm_provider` TEXT
- `llm_model` TEXT
- `prompt_tokens` INTEGER
- `completion_tokens` INTEGER
- `error` TEXT (null = success)

## Schritt 2: Types erweitern

**Datei**: `types/trading-bot.ts`

- `BotUserConfig` um `autoTradeEnabled`, `analysisIntervalMinutes`, `autoCloseEnabled` erweitern
- Neues Interface `BotAnalysisSignal` fuer LLM-Output
- Neues Interface `BotAnalysisLog` fuer Analyse-Protokoll

## Schritt 3: Mapper erweitern

**Datei**: `lib/trading-bot/mappers.ts`

- `dbRowToConfig` / `configToDbRow` um neue Felder erweitern

## Schritt 4: Bot-Analyzer Kern-Logik

**Neue Datei**: `lib/trading-bot/botAnalyzer.ts`

Kern-Modul mit:

### `buildAnalysisPrompt()`
- System-Prompt: "Du bist ein Trading-Bot der eine Strategie ausfuehrt..."
- User-Message: Strategie-Markdown + Watchlist mit Kursen + offene Positionen + letzte 10 Learnings + technische Indikatoren
- JSON-Mode Output-Schema definieren

### `analyzeWatchlist(userId)`
1. Config laden (pruefen: auto_trade_enabled, aktive Strategie vorhanden)
2. Watchlist laden (nur is_active=true)
3. Batch-Kurse via `fetchBatchWithWaterfall()`
4. Technische Indikatoren aus `ticker_technicals` laden
5. Offene Trades laden
6. Letzte 10 Learnings laden (als Kontext)
7. LLM-Call via `aiChat()` mit JSON-Mode
8. Signale parsen und validieren

### `executeSignals(userId, signals)`
- BUY: Trade erstellen mit `signal_type='bot_auto'`, Entry-Reason vom LLM, SL/TP vom LLM
- SELL: Trade schliessen, Learning automatisch generieren (auto_generated=true)
- Budget-Checks: remaining_budget pruefen, max_positions pruefen, max_position_size_pct pruefen

### LLM Output Schema (JSON):
```json
{
  "analysis_summary": "Kurzer Marktueberblick",
  "signals": [
    {
      "isin": "US0378331005",
      "action": "BUY" | "SELL" | "HOLD",
      "conviction": 1-10,
      "entry_price": 150.00,
      "stop_loss": 145.00,
      "take_profit": 160.00,
      "position_size_pct": 2.0,
      "reason": "EMA 9/21 Crossover bullish, RSI bei 55, ueber 200 SMA"
    }
  ],
  "portfolio_note": "Optionaler Hinweis zu Gesamtportfolio"
}
```

## Schritt 5: Cron API-Route

**Neue Datei**: `app/api/trading-bot/analyze/route.ts`

- GET-Handler mit CRON_SECRET Auth (gleich wie `/api/alerts/check`)
- Alle User mit `auto_trade_enabled=true` laden
- Fuer jeden User: `analyzeWatchlist()` → `executeSignals()`
- Ergebnis in `bot_analysis_log` speichern
- Fehler pro User abfangen (ein User-Fehler stoppt nicht andere)

## Schritt 6: Vercel Cron Config

**Datei**: `vercel.json`

Neuen Cron-Eintrag hinzufuegen:
```json
{
  "path": "/api/trading-bot/analyze",
  "schedule": "0 */4 * * *"
}
```
(Alle 4 Stunden als Default, echtes Intervall wird in der Route per User-Config gefiltert)

## Schritt 7: Settings UI erweitern

**Datei**: `components/trading-bot/BotSettingsTab.tsx`

Neue Sektion "Auto-Trading" zwischen Risk Management und Portfolio Integration:
- Toggle: "Auto-Trading aktivieren" (auto_trade_enabled)
- Dropdown: Analyse-Intervall (1h, 2h, 4h, 8h, 12h, 24h)
- Toggle: "Trades automatisch schliessen" (auto_close_enabled)
- Info-Text: "Der Bot analysiert deine Watchlist und handelt basierend auf der aktiven Strategie"
- Warnung wenn keine aktive Strategie gesetzt ist

## Schritt 8: Dashboard-Erweiterung

**Datei**: `components/trading-bot/BotDashboardTab.tsx`

- Neuer Status-Badge: "Auto-Trading aktiv/inaktiv"
- Letzte Analyse-Zeit anzeigen (aus bot_analysis_log)
- Letzte Auto-Trades hervorheben (signal_type='bot_auto' Badge)

## Dateien die geaendert werden

| Datei | Aenderung |
|-------|-----------|
| `scripts/bot-migration.sql` | Neue Spalten + Log-Tabelle |
| `types/trading-bot.ts` | Neue Interfaces + erweiterte Types |
| `lib/trading-bot/mappers.ts` | Neue Felder in Config-Mapper |
| `lib/trading-bot/botAnalyzer.ts` | **NEU** - Kern-Logik |
| `app/api/trading-bot/analyze/route.ts` | **NEU** - Cron-Endpoint |
| `app/api/trading-bot/config/route.ts` | Neue Felder akzeptieren |
| `components/trading-bot/BotSettingsTab.tsx` | Auto-Trading UI |
| `components/trading-bot/BotDashboardTab.tsx` | Status-Anzeige |
| `vercel.json` | Neuer Cron-Eintrag |
| `app/trading-bot/page.tsx` | Neue Props durchreichen |
