# Plan: Auto-Trading Bot (Phase 2) — Hybrid: Rule Engine + LLM-Kommentar

Bot analysiert Watchlist automatisch mit **deterministischen Regeln**, generiert Signale, und nutzt LLM **nur fuer Kommentare/Warnungen** — nie fuer die eigentliche Kauf/Verkaufs-Entscheidung.

## Grundprinzipien

1. **Signale kommen aus der Rule Engine** — EMA-Crossover, RSI-Schwellen, SMA-Filter werden mechanisch berechnet
2. **LLM kommentiert nur** — "Achtung: Earnings in 2 Tagen" oder "News negativ" — aendert aber nie das Signal
3. **Paper Trading zuerst** — Signale werden erst nur geloggt (Modus: `paper`), nach Validierung kann auf `live` umgestellt werden
4. **Backtestbar** — Alle Regeln sind deterministisch und reproduzierbar
5. **Nur Daily-Daten** — Wir haben Daily-Kerzen von Alpha Vantage, keine 4H-Daten. Die Strategie-Regeln werden auf Daily-Basis ausgewertet

## Architektur-Ueberblick

```
Vercel Cron (taeglich 18:15 UTC, nach Boersenschluss US)
  -> /api/trading-bot/analyze (GET, CRON_SECRET)
    -> Fuer jeden User mit auto_trade_enabled=true:
      1. Config + aktive Strategie laden
      2. Watchlist laden (nur is_active=true)
      3. Technische Indikatoren aus ticker_technicals laden
         (inkl. HEUTE und GESTERN fuer Crossover-Erkennung)
      4. Rule Engine: Strategie-Regeln gegen Indikatoren pruefen
         -> Generiert: BUY / SELL / HOLD pro Ticker
      5. Budget- & Risiko-Checks (max_positions, max_position_size_pct, remaining_budget)
      6. [Optional] LLM-Kommentar: Signal + Kontext -> kurzer Text
      7. Signale speichern in bot_signals (IMMER, auch HOLD)
      8. Wenn Modus = 'live': Signale ausfuehren
         - BUY -> Trade eroeffnen (signal_type='bot_auto')
         - SELL -> Trade schliessen + Learning auto-generieren
      9. Analyse-Log schreiben (bot_analysis_log)
```

## Daten-Luecke schliessen

### Problem
- Strategie referenziert EMA 9 und EMA 21 — wir haben nur EMA 20, 50, 200
- Crossover-Erkennung braucht VORHERIGE Werte (gestern EMA9 < EMA21, heute EMA9 > EMA21)
- Kein Volumen-Indikator gespeichert

### Loesung: ticker_technicals erweitern

Neue Spalten in `ticker_technicals`:
```sql
ALTER TABLE ticker_technicals ADD COLUMN IF NOT EXISTS ema_9 DECIMAL;
ALTER TABLE ticker_technicals ADD COLUMN IF NOT EXISTS ema_21 DECIMAL;
ALTER TABLE ticker_technicals ADD COLUMN IF NOT EXISTS volume BIGINT;
ALTER TABLE ticker_technicals ADD COLUMN IF NOT EXISTS volume_sma_20 BIGINT;
```

`technicalCalculator.ts` erweitern:
- EMA 9 und EMA 21 berechnen (zusaetzlich zu 20, 50, 200)
- Volumen und 20-Tage-Volumen-Durchschnitt speichern

Crossover-Erkennung: Die Rule Engine laedt die **letzten 2 Tage** aus ticker_technicals und vergleicht.

## Schritt 1: DB-Schema erweitern

**Datei**: `scripts/bot-phase2-migration.sql` (NEUES File)

### 1a. ticker_technicals erweitern
```sql
ALTER TABLE ticker_technicals ADD COLUMN IF NOT EXISTS ema_9 DECIMAL;
ALTER TABLE ticker_technicals ADD COLUMN IF NOT EXISTS ema_21 DECIMAL;
ALTER TABLE ticker_technicals ADD COLUMN IF NOT EXISTS volume BIGINT;
ALTER TABLE ticker_technicals ADD COLUMN IF NOT EXISTS volume_sma_20 BIGINT;
```

### 1b. bot_user_configs erweitern
```sql
ALTER TABLE bot_user_configs ADD COLUMN IF NOT EXISTS auto_trade_enabled BOOLEAN DEFAULT false;
ALTER TABLE bot_user_configs ADD COLUMN IF NOT EXISTS trade_mode TEXT CHECK (trade_mode IN ('paper', 'live')) DEFAULT 'paper';
ALTER TABLE bot_user_configs ADD COLUMN IF NOT EXISTS auto_close_enabled BOOLEAN DEFAULT true;
ALTER TABLE bot_user_configs ADD COLUMN IF NOT EXISTS max_risk_pct NUMERIC(5,2) DEFAULT 6.00;
ALTER TABLE bot_user_configs ADD COLUMN IF NOT EXISTS risk_per_trade_pct NUMERIC(5,2) DEFAULT 1.50;
ALTER TABLE bot_user_configs ADD COLUMN IF NOT EXISTS max_drawdown_pct NUMERIC(5,2) DEFAULT 20.00;
ALTER TABLE bot_user_configs ADD COLUMN IF NOT EXISTS cooldown_days INTEGER DEFAULT 3;
ALTER TABLE bot_user_configs ADD COLUMN IF NOT EXISTS max_holding_days INTEGER DEFAULT 30;
```

### 1c. bot_trade_learnings erweitern
```sql
ALTER TABLE bot_trade_learnings ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;
```

### 1d. Neue Tabelle: bot_signals (alle Signale loggen, auch HOLD)
```sql
CREATE TABLE IF NOT EXISTS bot_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  isin TEXT NOT NULL,
  ticker TEXT,
  signal_date DATE NOT NULL,
  action TEXT CHECK (action IN ('BUY', 'SELL', 'HOLD')) NOT NULL,
  confidence NUMERIC(3,1) CHECK (confidence >= 0 AND confidence <= 10),

  -- Rule Engine Details
  rules_matched JSONB DEFAULT '[]',
  rules_failed JSONB DEFAULT '[]',
  rules_total INTEGER DEFAULT 0,
  rules_passed INTEGER DEFAULT 0,

  -- Indikator-Snapshot (fuer Backtesting)
  indicator_snapshot JSONB,

  -- Berechnete Werte
  entry_price NUMERIC(12,4),
  stop_loss NUMERIC(12,4),
  take_profit NUMERIC(12,4),
  position_size_pct NUMERIC(5,2),
  risk_reward_ratio NUMERIC(5,2),

  -- LLM Kommentar (optional)
  llm_comment TEXT,

  -- Execution
  executed BOOLEAN DEFAULT false,
  bot_trade_id UUID REFERENCES bot_trades(id),
  skipped_reason TEXT,

  -- Strategy context
  strategy_id UUID REFERENCES bot_strategies(id),

  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, isin, signal_date)
);

CREATE INDEX IF NOT EXISTS idx_bot_signals_user_date ON bot_signals(user_id, signal_date);
CREATE INDEX IF NOT EXISTS idx_bot_signals_action ON bot_signals(action);
```

### 1e. Neue Tabelle: bot_analysis_log
```sql
CREATE TABLE IF NOT EXISTS bot_analysis_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  analyzed_at TIMESTAMPTZ DEFAULT now(),
  trade_mode TEXT CHECK (trade_mode IN ('paper', 'live')),
  watchlist_count INTEGER DEFAULT 0,
  signals_generated INTEGER DEFAULT 0,
  buy_signals INTEGER DEFAULT 0,
  sell_signals INTEGER DEFAULT 0,
  trades_opened INTEGER DEFAULT 0,
  trades_closed INTEGER DEFAULT 0,
  llm_used BOOLEAN DEFAULT false,
  duration_ms INTEGER,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_bot_analysis_log_user ON bot_analysis_log(user_id);
```

## Schritt 2: Types erweitern

**Datei**: `types/trading-bot.ts`

```typescript
// Neue/erweiterte Interfaces

export type TradeMode = 'paper' | 'live';
export type SignalAction = 'BUY' | 'SELL' | 'HOLD';

// BotUserConfig erweitern um:
//   autoTradeEnabled: boolean
//   tradeMode: TradeMode
//   autoCloseEnabled: boolean
//   maxRiskPct: number

export interface BotSignal {
  id: string;
  userId: string;
  isin: string;
  ticker?: string;
  signalDate: string;
  action: SignalAction;
  confidence: number;

  rulesMatched: string[];
  rulesFailed: string[];
  rulesTotal: number;
  rulesPassed: number;

  indicatorSnapshot: Record<string, number | string | null>;

  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  positionSizePct?: number;
  riskRewardRatio?: number;

  llmComment?: string;

  executed: boolean;
  botTradeId?: string;
  skippedReason?: string;

  strategyId?: string;
  createdAt: string;
}

export interface BotAnalysisLog {
  id: string;
  userId: string;
  analyzedAt: string;
  tradeMode: TradeMode;
  watchlistCount: number;
  signalsGenerated: number;
  buySignals: number;
  sellSignals: number;
  tradesOpened: number;
  tradesClosed: number;
  llmUsed: boolean;
  durationMs: number;
  error?: string;
}

// Rule Engine Types
export type RuleType =
  | 'price_above_sma'
  | 'price_below_sma'
  | 'ema_crossover_bullish'
  | 'ema_crossover_bearish'
  | 'rsi_range'
  | 'rsi_oversold'
  | 'rsi_overbought'
  | 'macd_bullish'
  | 'macd_bearish'
  | 'volume_above_avg'
  | 'bollinger_lower_touch'
  | 'bollinger_upper_touch';

export interface StrategyRule {
  type: RuleType;
  params: Record<string, number>;
  weight: number;         // 1-3 (wie wichtig ist die Regel)
  required: boolean;      // Muss diese Regel erfuellt sein?
  description: string;    // Deutsche Beschreibung fuer UI
}

export interface StrategyRuleSet {
  entryLong: StrategyRule[];
  entryShort: StrategyRule[];
  exitLong: StrategyRule[];
  exitShort: StrategyRule[];
  stopLossType: 'fixed_pct' | 'atr_multiple';
  stopLossValue: number;
  takeProfitRR: number;   // Risk-Reward-Ratio fuer TP
  minConfidence: number;  // Minimum Score um Signal zu generieren (0-10)
}
```

## Schritt 3: Rule Engine

**Neue Datei**: `lib/trading-bot/ruleEngine.ts`

### Kern-Konzept

Jede Regel ist eine pure function: `(today, yesterday) => { passed: boolean, detail: string }`

```typescript
interface IndicatorData {
  date: string;
  closePrice: number;
  ema9: number | null;
  ema21: number | null;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  sma50: number | null;
  sma200: number | null;
  rsi14: number | null;
  macd: { macd: number; signal: number; histogram: number } | null;
  bollinger: { upper: number; middle: number; lower: number } | null;
  volume: number | null;
  volumeSma20: number | null;
}

interface RuleResult {
  rule: StrategyRule;
  passed: boolean;
  detail: string;
}

// Beispiel-Regeln:

// EMA Crossover Bullish: Gestern EMA9 <= EMA21, heute EMA9 > EMA21
function emasCrossoverBullish(today: IndicatorData, yesterday: IndicatorData): boolean {
  if (!today.ema9 || !today.ema21 || !yesterday.ema9 || !yesterday.ema21) return false;
  return yesterday.ema9 <= yesterday.ema21 && today.ema9 > today.ema21;
}

// Price above SMA: Kurs ueber SMA (parametrisiert: 50, 200)
function priceAboveSMA(today: IndicatorData, smaType: 50 | 200): boolean {
  const sma = smaType === 50 ? today.sma50 : today.sma200;
  if (!sma) return false;
  return today.closePrice > sma;
}

// RSI Range: RSI zwischen min und max
function rsiInRange(today: IndicatorData, min: number, max: number): boolean {
  if (!today.rsi14) return false;
  return today.rsi14 >= min && today.rsi14 <= max;
}

// Volume Filter: Volumen >= factor * Durchschnitt
function volumeAboveAvg(today: IndicatorData, factor: number): boolean {
  if (!today.volume || !today.volumeSma20) return false;
  return today.volume >= today.volumeSma20 * factor;
}
```

### Signal-Berechnung

```typescript
function evaluateRules(
  rules: StrategyRule[],
  today: IndicatorData,
  yesterday: IndicatorData
): { passed: boolean; score: number; results: RuleResult[] } {

  const results = rules.map(rule => evaluateRule(rule, today, yesterday));

  // Alle required-Regeln muessen passen
  const requiredFailed = results.some(r => r.rule.required && !r.passed);
  if (requiredFailed) return { passed: false, score: 0, results };

  // Score berechnen (gewichtet)
  const maxScore = rules.reduce((sum, r) => sum + r.weight, 0);
  const actualScore = results
    .filter(r => r.passed)
    .reduce((sum, r) => sum + r.rule.weight, 0);

  const normalizedScore = maxScore > 0 ? (actualScore / maxScore) * 10 : 0;

  return { passed: !requiredFailed, score: normalizedScore, results };
}
```

### Swing Trading 4H Default-Regeln (auf Daily angepasst)

```typescript
const SWING_TRADING_DAILY_RULES: StrategyRuleSet = {
  entryLong: [
    { type: 'price_above_sma', params: { period: 200 }, weight: 2, required: true,
      description: 'Kurs ueber 200 SMA (Aufwaertstrend)' },
    { type: 'ema_crossover_bullish', params: { fast: 9, slow: 21 }, weight: 3, required: true,
      description: 'EMA 9 kreuzt EMA 21 von unten (Kaufsignal)' },
    { type: 'rsi_range', params: { min: 30, max: 70 }, weight: 1, required: true,
      description: 'RSI zwischen 30 und 70 (kein Extrem)' },
    { type: 'price_above_sma', params: { period: 50 }, weight: 2, required: false,
      description: 'Kurs ueber 50 SMA (Bestaetigung)' },
    { type: 'volume_above_avg', params: { factor: 0.8 }, weight: 1, required: false,
      description: 'Volumen mindestens 80% des Durchschnitts' },
  ],
  entryShort: [
    { type: 'price_below_sma', params: { period: 200 }, weight: 2, required: true,
      description: 'Kurs unter 200 SMA (Abwaertstrend)' },
    { type: 'ema_crossover_bearish', params: { fast: 9, slow: 21 }, weight: 3, required: true,
      description: 'EMA 9 kreuzt EMA 21 von oben (Verkaufssignal)' },
    { type: 'rsi_range', params: { min: 30, max: 70 }, weight: 1, required: true,
      description: 'RSI zwischen 30 und 70 (kein Extrem)' },
    { type: 'price_below_sma', params: { period: 50 }, weight: 2, required: false,
      description: 'Kurs unter 50 SMA (Bestaetigung)' },
  ],
  exitLong: [
    { type: 'ema_crossover_bearish', params: { fast: 9, slow: 21 }, weight: 3, required: false,
      description: 'EMA 9 kreuzt EMA 21 von oben (Exit-Signal)' },
    { type: 'rsi_overbought', params: { threshold: 75 }, weight: 2, required: false,
      description: 'RSI ueber 75 (ueberkauft)' },
  ],
  exitShort: [
    { type: 'ema_crossover_bullish', params: { fast: 9, slow: 21 }, weight: 3, required: false,
      description: 'EMA 9 kreuzt EMA 21 von unten (Exit-Signal)' },
    { type: 'rsi_oversold', params: { threshold: 25 }, weight: 2, required: false,
      description: 'RSI unter 25 (ueberverkauft)' },
  ],
  stopLossType: 'fixed_pct',
  stopLossValue: 2.0,
  takeProfitRR: 2.0,
  minConfidence: 6.0,
};
```

## Schritt 4: Bot-Analyzer (orchestriert Rule Engine + optionalen LLM-Kommentar)

**Neue Datei**: `lib/trading-bot/botAnalyzer.ts`

### analyzeWatchlist(userId)

```
1. Config laden -> pruefen: auto_trade_enabled, aktive Strategie
2. Watchlist laden (is_active=true)
3. Fuer jeden Ticker: Letzte 2 Tage aus ticker_technicals laden
4. Rule Engine auswerten:
   - Offene Position vorhanden? -> Exit-Regeln pruefen
   - Keine Position? -> Entry-Regeln pruefen
5. Budget/Risiko-Checks:
   - remaining_budget >= benoetigter Betrag
   - Offene Positionen < max_positions
   - Neue Position < max_position_size_pct
   - Gesamt-Risiko < max_risk_pct
6. Stop-Loss und Take-Profit berechnen:
   - SL = Entry - (Entry * stopLossValue / 100)
   - TP = Entry + (Entry - SL) * takeProfitRR
7. Position Sizing:
   - Risikobetrag = virtualBudget * (riskPerTrade / 100)
   - Stueckzahl = Risikobetrag / (Entry - SL)
   - Investiert = Stueckzahl * Entry
   - Check: Investiert <= remaining_budget * (maxPositionSizePct / 100)
```

### [Optional] LLM-Kommentar

Nur wenn BUY oder SELL Signal vorliegt. LLM bekommt:
- Signal + Grund (welche Regeln haben gematcht)
- Aktuelle technische Lage
- Kein Entscheidungsrecht — nur Kommentar

```
Prompt: "Du bist ein Trading-Kommentator. Ein regelbasierter Bot hat folgendes Signal generiert:
[Signal-Details]. Gib einen kurzen Kommentar (max. 2 Saetze) mit Warnung oder Bestaetigung.
Du darfst das Signal NICHT aendern. Antworte auf Deutsch."
```

### executeSignals(userId, signals, tradeMode)

```
Wenn tradeMode === 'paper':
  -> Signal nur in bot_signals speichern (executed=false)
  -> Dashboard zeigt: "Paper-Signal: BUY AAPL bei $150"

Wenn tradeMode === 'live':
  -> Signal in bot_signals speichern
  -> BUY: Trade in bot_trades erstellen (signal_type='bot_auto')
  -> SELL: Trade schliessen + Learning auto-generieren
  -> Budget aktualisieren
  -> Signal als executed=true markieren
```

## Schritt 5: Stop-Loss Monitoring

**Problem**: Cron laeuft nur 1x taeglich — SL kann durchbrochen werden ohne dass verkauft wird.

**Loesung**: Pragmatischer Ansatz
- Beim naechsten Cron-Lauf: Alle offenen Trades pruefen ob SL durchbrochen
- Kurs < SL? -> Sofort schliessen zum aktuellen Kurs (nicht SL-Preis, realistischer Slippage)
- Kein Echtzeit-SL-Monitoring (nicht moeglich mit Vercel Cron)
- **Klarer Hinweis im UI**: "Stop-Loss wird taeglich geprueft, nicht in Echtzeit"

## Schritt 6: Cron API-Route

**Neue Datei**: `app/api/trading-bot/analyze/route.ts`

- GET-Handler mit CRON_SECRET Auth
- Alle User mit `auto_trade_enabled=true` laden
- Pro User:
  1. `analyzeWatchlist()` -> Signale generieren
  2. Stop-Loss-Check fuer offene Trades
  3. `executeSignals()` -> Je nach tradeMode
  4. `bot_analysis_log` schreiben
- Fehler pro User abfangen (ein Fehler stoppt nicht andere User)

## Schritt 7: Vercel Cron Config

**Datei**: `vercel.json`

```json
{
  "path": "/api/trading-bot/analyze",
  "schedule": "15 18 * * 1-5"
}
```

Taeglich Mo-Fr um 18:15 UTC (nach US-Boersenschluss). Daily-Kerzen sind dann komplett.

## Schritt 8: Strategy Rules UI

**Datei**: `components/trading-bot/BotStrategyEditor.tsx` (erweitern)

Neue Sektion unter dem Markdown-Editor:
- **Regel-Konfigurator**: Vordefinierte Regel-Typen als Dropdown
- Fuer jede Regel: Parameter (Periode, Schwellwert), Gewicht (1-3), Pflicht ja/nein
- Getrennt fuer: Entry Long, Entry Short, Exit Long, Exit Short
- SL-Typ und -Wert, TP Risk-Reward, Min-Confidence
- "Default laden" Button -> laedt SWING_TRADING_DAILY_RULES
- Regeln werden als JSONB in `bot_strategies.rules` gespeichert

### bot_strategies erweitern
```sql
ALTER TABLE bot_strategies ADD COLUMN IF NOT EXISTS rules JSONB;
```

## Schritt 9: Settings UI erweitern

**Datei**: `components/trading-bot/BotSettingsTab.tsx`

Neue Sektion "Auto-Trading":
- Toggle: "Auto-Trading aktivieren" (auto_trade_enabled)
- Modus: Paper / Live (trade_mode) — Paper ist Default, Live braucht Bestaetigung
- Toggle: "Trades automatisch schliessen" (auto_close_enabled)
- Max. Gesamt-Risiko: Slider (1-10%, Default 6%)
- Warnung wenn keine aktive Strategie oder keine Regeln definiert
- Warnung bei Live-Modus: "Der Bot handelt automatisch mit virtuellem Budget"

## Schritt 10: Dashboard-Erweiterung

**Datei**: `components/trading-bot/BotDashboardTab.tsx`

- Status-Badge: "Paper Trading aktiv" / "Live Trading aktiv" / "Inaktiv"
- Letzte Analyse-Zeit (aus bot_analysis_log)
- Signal-Historie: Tabelle mit letzten Signalen (aus bot_signals)
- Paper-Performance: Wie haetten die Signale abgeschnitten? (Rueckblick auf nicht-ausgefuehrte Signale)

## Schritt 11: Signals API-Route

**Neue Datei**: `app/api/trading-bot/signals/route.ts`

- GET: Signale laden (mit Filter: Datum, Aktion, Ticker)
- Wird vom Dashboard fuer Signal-Historie genutzt

## Dateien die geaendert/erstellt werden

| Datei | Aenderung |
|-------|-----------|
| `scripts/bot-phase2-migration.sql` | **NEU** - Schema-Erweiterungen |
| `types/trading-bot.ts` | Erweitert: Neue Interfaces + Rule Types |
| `lib/trading-bot/mappers.ts` | Erweitert: Neue Felder |
| `lib/trading-bot/ruleEngine.ts` | **NEU** - Deterministische Rule Engine |
| `lib/trading-bot/botAnalyzer.ts` | **NEU** - Orchestrierung |
| `lib/news/technicalCalculator.ts` | Erweitert: EMA 9/21, Volume |
| `app/api/trading-bot/analyze/route.ts` | **NEU** - Cron-Endpoint |
| `app/api/trading-bot/signals/route.ts` | **NEU** - Signal-Historie |
| `app/api/trading-bot/config/route.ts` | Erweitert: Neue Config-Felder |
| `components/trading-bot/BotSettingsTab.tsx` | Erweitert: Auto-Trading UI |
| `components/trading-bot/BotDashboardTab.tsx` | Erweitert: Status + Signale |
| `components/trading-bot/BotStrategyEditor.tsx` | Erweitert: Regel-Konfigurator |
| `vercel.json` | Neuer Cron-Eintrag |

## Implementierungs-Reihenfolge

1. **DB-Migration** — Schema erweitern (Schritt 1)
2. **Types + Mappers** — Neue Interfaces (Schritt 2-3)
3. **Technical Calculator** — EMA 9/21 + Volume (Teil von Schritt 1)
4. **Rule Engine** — Kern-Logik (Schritt 3)
5. **Bot-Analyzer** — Orchestrierung (Schritt 4)
6. **Cron-Route** — API-Endpoint (Schritt 6)
7. **Signals-Route** — Signal-Historie API (Schritt 11)
8. **Settings UI** — Auto-Trading Config (Schritt 9)
9. **Strategy Editor** — Regel-Konfigurator (Schritt 8)
10. **Dashboard** — Status + Signal-Anzeige (Schritt 10)
11. **Vercel Config** — Cron aktivieren (Schritt 7)

## Risiko-Massnahmen (aus Risk-Manager Review)

Die folgenden Punkte wurden durch ein Risk-Review identifiziert und muessen bei der Implementierung beruecksichtigt werden:

### Kritisch (muss sofort adressiert werden)

1. **`risk_per_trade_pct` fehlt in Config**
   - Position Sizing braucht "Risiko pro Trade" (z.B. 1-2%)
   - Muss als Feld in `bot_user_configs` aufgenommen werden
   ```sql
   ALTER TABLE bot_user_configs ADD COLUMN IF NOT EXISTS risk_per_trade_pct NUMERIC(5,2) DEFAULT 1.50;
   ```

2. **Staleness-Check fuer ticker_technicals**
   - Wenn Daten aelter als 2 Handelstage sind, KEIN Signal generieren
   - Phantom-Crossovers vermeiden: Vergleich Montag vs. letzter Mittwoch erzeugt falsche Crossovers
   - `skipped_reason: 'stale_data'` loggen
   - In `evaluateRules()`: Pruefe `today.date` ist maximal 2 Kalendertage alt

3. **Max-Drawdown Circuit Breaker**
   ```sql
   ALTER TABLE bot_user_configs ADD COLUMN IF NOT EXISTS max_drawdown_pct NUMERIC(5,2) DEFAULT 20.00;
   ```
   - Wenn realisierte + unrealisierte Verluste > `max_drawdown_pct` des virtualBudget:
     Bot pausiert sich automatisch (`auto_trade_enabled = false`)
   - UI: Warnung "Bot wurde wegen Drawdown-Limit pausiert"

### Wichtig (sollte eingeplant werden)

4. **Signal-Priorisierung**
   - Bei mehreren BUY-Signalen: Nach Confidence-Score sortieren, hoechste zuerst
   - Budget wird sequentiell pro Trade geprueft
   - Bei Budget-Erschoepfung: `skipped_reason: 'budget_exhausted'`

5. **Trade-Cooldown nach SL-Exit**
   - Optional: Nach SL-Trigger kein neues BUY fuer denselben Ticker fuer X Tage
   - Verhindert Whipsaw-Verluste
   - Default: 3 Tage Cooldown

6. **Max Holding Days**
   - Sicherheitsnetz: Wenn Position > X Tage offen, automatisch schliessen
   - Default: 30 Tage (konfigurierbar)
   - Verhindert "vergessene" Positionen

7. **Paper-to-Live Schwelle**
   - Mindestens 14 Tage Paper-Trading bevor Live freigeschaltet werden kann
   - UI warnt wenn Win-Rate < 40% oder Drawdown > 15%
   - Kein Hard-Block, nur Warnung + Bestaetigung

8. **Gap-Down Kommunikation**
   - Im UI klar kommunizieren: "Tatsaechlicher Verlust kann deutlich ueber Stop-Loss liegen (Gap-Down)"
   - Bei SL-Ausloesung zum Schlusskurs (nicht SL-Preis) — realistischer

### Nice-to-have (spaetere Iteration)

9. **Simulated Slippage**: 0.1% Kosten pro Trade im Paper-Modus einrechnen
10. **Sector-Korrelation**: Max. 2 Positionen im gleichen Sektor
11. **Weekly Drawdown Limit**: Bot pausiert wenn >5% in einer Woche verloren
12. **Moduswechsel-Audit**: Loggen wann User Paper->Live wechselt

## Vorteile gegenueber reinem LLM-Ansatz

| Aspekt | LLM-only (alter Plan) | Hybrid (neuer Plan) |
|--------|----------------------|---------------------|
| Reproduzierbarkeit | Nicht deterministisch | 100% deterministisch |
| Backtesting | Unmoeglich | Moeglich (Regeln + historische Daten) |
| Kosten | LLM-Call pro Ticker pro Analyse | LLM nur optional fuer Kommentar |
| Latenz | 2-10s pro LLM-Call | Millisekunden fuer Rule Engine |
| Vercel Timeout | Kritisch bei vielen Tickern | Kein Problem |
| Paper Trading | Nicht vorgesehen | Integriert |
| Transparenz | "LLM sagt kaufen" (Black Box) | "3 von 5 Regeln erfuellt: EMA-Cross, RSI ok, SMA200 ok" |
