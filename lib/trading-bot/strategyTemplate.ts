// Feste Markdown-Vorlage fuer Trading-Strategien
// Optimiert fuer Claude AI Interpretation

export const STRATEGY_TEMPLATE = `# [Name der Strategie]

## Meta
- **Zeitrahmen**: [Primary Timeframe, z.B. 4H, Daily]
- **Stil**: [Trading-Stil, z.B. Swing Trading, Day Trading]
- **Maerkte**: [Zielmaerkte, z.B. US Aktien, DAX, Crypto]
- **Risiko pro Trade**: [z.B. 1-2% des Portfolios]
- **Haltedauer**: [z.B. 2-7 Tage]

## Entry-Regeln

### Primaerer Einstieg (Long)
1. [Bedingung 1, z.B. Kurs oberhalb 200 SMA]
2. [Bedingung 2, z.B. EMA 9 kreuzt EMA 21 von unten]
3. [Bedingung 3, z.B. RSI zwischen 30 und 70]
4. [Bedingung 4, z.B. Volumen >= 0.8x Durchschnitt]

### Primaerer Einstieg (Short)
1. [Bedingung 1]
2. [Bedingung 2]
3. [Bedingung 3]
4. [Bedingung 4]

### Bestaetigungen
- [ ] [Checklist Item 1, z.B. Trend-Sync geprueft]
- [ ] [Checklist Item 2, z.B. Keine Earnings in 2 Tagen]
- [ ] [Checklist Item 3, z.B. Innerhalb Handelszeiten]

### Ausschlusskriterien
- [Wann NICHT handeln, z.B. Trends widersprechen sich]
- [z.B. Vor wichtigen Wirtschaftsdaten]

## Multi-Timeframe-Analyse

### Uebergeordneter Trend
- **Timeframe**: [z.B. Daily]
- **Indikator**: [z.B. 50 SMA]
- **Regel**: [z.B. Kurs ueber Daily 50 SMA = nur Long]

### Einstiegs-Timeframe
- **Timeframe**: [z.B. 4H]
- **Indikatoren**: [z.B. EMA 9/21, RSI 14, 200 SMA]
- **Signal**: [z.B. EMA Crossover + Trendfilter + RSI]

## Exit-Regeln

### Take Profit
- TP1: [Erstes Ziel, z.B. 1:1 Risk-Reward]
- TP2: [Zweites Ziel, z.B. 1:2 Risk-Reward]
- TP3: [Drittes Ziel, z.B. Trailing Stop]

### Stop Loss
- **Initial SL**: [Platzierung, z.B. ATR * 2.0 unter Entry]
- **Fester SL Fallback**: [z.B. 2.0% vom Entry]
- **Trailing SL**: [Nachzieh-Regeln, z.B. bei 1:1 auf Break-Even]

### Teilverkauf-Strategie
- [z.B. 50% bei TP1, Rest mit Trailing Stop]

## Risiko-Management

### Position Sizing
- [Formel, z.B. Risikobetrag / (Entry - Stop Loss)]
- **Max. Positionsgroesse**: [z.B. 4% des Portfolios]

### Max. Gleichzeitige Positionen
- [z.B. 5 offene Positionen]

### Max. Risiko gesamt
- [z.B. 6% des Gesamtportfolios]

### Korrelations-Regeln
- [z.B. Max. 2 Positionen im gleichen Sektor]

## Marktbedingungen

### Ideale Bedingungen
- [z.B. Klarer Trend, moderate Volatilitaet]
- [z.B. Keine bevorstehenden Zentralbank-Entscheidungen]

### Vermeiden wenn
- [z.B. VIX ueber 30]
- [z.B. Earnings Season Hochphase]
- [z.B. Seitwärtsmarkt ohne klaren Trend]

## Notizen
- [Zusaetzliche Hinweise, Lektionen, Anpassungen]
`;

// Die vom User bereitgestellte Swing Trading 4H Strategie als erste ladbare Vorlage
export const SWING_TRADING_4H_STRATEGY = `# SWING TRADING — 4-STUNDEN-CHART

## Meta
- **Zeitrahmen**: 4H (mit Daily-Filter)
- **Stil**: Swing Trading (Multi-Timeframe)
- **Maerkte**: US Aktien, DAX, europaeische Aktien
- **Risiko pro Trade**: 0.5-1% bei reinem 4H-Signal, 1-2% bei Daily+4H Bestaetigung
- **Haltedauer**: 2-7 Tage

## Entry-Regeln

### Primaerer Einstieg (Long)
1. Kurs ist OBERHALB des 4H 200 SMA
2. EMA 9 kreuzt EMA 21 von unten nach oben (auf 4H)
3. RSI (14) ist zwischen 30 und 70
4. Volumen ist mindestens 0.8x des 20-Perioden-Durchschnitts
5. Kurs ist OBERHALB des Daily 50 SMA (Multi-TF-Filter)
6. Signal tritt waehrend der Handelszeiten auf (09:00-20:00 UTC)

### Primaerer Einstieg (Short)
1. Kurs ist UNTERHALB des 4H 200 SMA
2. EMA 9 kreuzt EMA 21 von oben nach unten (auf 4H)
3. RSI (14) ist zwischen 30 und 70
4. Volumen ist mindestens 0.8x des 20-Perioden-Durchschnitts
5. Kurs ist UNTERHALB des Daily 50 SMA
6. Signal tritt waehrend der Handelszeiten auf (09:00-20:00 UTC)

### Bestaetigungen
- [ ] Trend-Sync: 4H und Daily zeigen in gleiche Richtung
- [ ] Keine Earnings in den naechsten 2 Tagen
- [ ] Innerhalb der Handelszeiten (09:00-20:00 UTC)
- [ ] Max. 5 offene Positionen nicht ueberschritten

### Ausschlusskriterien
- 4H und Daily widersprechen sich (Trend-Sync = Widerspruch)
- Signal ausserhalb der Handelszeiten
- RSI in Extrembereichen (unter 30 oder ueber 70)

## Multi-Timeframe-Analyse

### Uebergeordneter Trend
- **Timeframe**: Daily
- **Indikator**: 50 SMA (zeigt Trend der letzten ~2.5 Monate)
- **Regel**: Kurs ueber Daily 50 SMA = nur Long erlaubt, darunter = nur Short

### Einstiegs-Timeframe
- **Timeframe**: 4H
- **Indikatoren**: EMA 9, EMA 21, 200 SMA, RSI (14)
- **Signal**: EMA 9/21 Crossover + Kurs ueber/unter 200 SMA + RSI-Filter
- **200 SMA auf 4H**: Zeigt Trend der letzten ~30 Handelstage (Doppelfilter mit Daily 50 SMA)

## Exit-Regeln

### Take Profit
- TP1: Risk-Reward 1:1 (50% der Position schliessen)
- TP2: Risk-Reward 1:2 (restliche Position mit Trailing Stop)

### Stop Loss
- **Initial SL**: ATR (14) * 2.0 unter/ueber Entry-Preis
- **Fester SL Fallback**: 2.0% vom Entry-Preis
- **Trailing SL**: Bei Erreichen von TP1 auf Break-Even nachziehen

### Teilverkauf-Strategie
- 50% bei TP1 verkaufen, Stop auf Break-Even setzen
- Restliche 50% mit Trailing Stop laufen lassen

## Risiko-Management

### Position Sizing
- Formel: Risikobetrag / (Entry - Stop Loss) = Stueckzahl
- **Max. Positionsgroesse**: 4% des Portfolios
- **Reduzierte Groesse**: Bei reinem 4H-Signal (ohne Daily-Bestaetigung) nur halbe Position

### Max. Gleichzeitige Positionen
- 5 offene Positionen

### Max. Risiko gesamt
- 6% des Gesamtportfolios gleichzeitig im Risiko
- Max. 2 neue Trades pro Tag

### Korrelations-Regeln
- Max. 2 Positionen im gleichen Sektor
- Keine gegenlaeuifgen Positionen (Long + Short im gleichen Markt)

## Marktbedingungen

### Ideale Bedingungen
- Klarer Trend auf Daily (Kurs deutlich ueber/unter 50 SMA)
- Moderate Volatilitaet (ATR stabil)
- Normales Handelsvolumen

### Vermeiden wenn
- Daily und 4H widersprechen sich
- Vor wichtigen Wirtschaftsdaten (FOMC, NFP, CPI)
- Earnings des Underlyings in den naechsten 2 Tagen
- VIX deutlich erhoeht (ueber 30)
- Zwischen Weihnachten und Neujahr (duennes Volumen)

## Notizen
- Daily-Signal + 4H-Bestaetigung = staerkstes Setup (volle Positionsgroesse)
- Nur 4H-Signal ohne Daily = akzeptabel, aber halbe Position
- 3 Check-Fenster pro Tag: Morgen (08:30-09:00), Mittag (13:00-13:15), Abend (18:00-18:15)
- TradingView Alerts nutzen statt staendig manuell zu pruefen
- Slippage-Annahme: 2 Ticks (realistischer fuer Intraday-Ausfuehrung)
`;

export const AVAILABLE_TEMPLATES = [
  {
    id: 'swing-trading-4h',
    name: 'Swing Trading 4H',
    description: 'Multi-Timeframe Swing Trading mit Daily-Filter und 4H-Einstieg. Haltedauer 2-7 Tage.',
    content: SWING_TRADING_4H_STRATEGY,
  },
  {
    id: 'empty-template',
    name: 'Leere Vorlage',
    description: 'Leere Strategie-Vorlage zum selbst ausfuellen.',
    content: STRATEGY_TEMPLATE,
  },
];
