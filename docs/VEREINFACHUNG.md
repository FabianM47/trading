# Vereinfachung: Weg vom „Riesen-Schih“

Die App soll genau das können, was in **ANFORDERUNGEN_WIRKLICH.md** steht – ohne Over-Engineering.

---

## Was du behalten kannst (passt zu deinen Anforderungen)

| Bereich | Status | Hinweis |
|--------|--------|--------|
| **Eine Dashboard-Seite** | Behalten | Am besten die, die aus **Trades** die Positionen berechnet (z. B. dashboard-v2), nicht die alte positions-Tabelle |
| **Trades erfassen** (Server Action + Formular) | Behalten | Suche/ISIN, Kurs, Stückzahl oder Betrag – ist schon da |
| **Preisabfrage** (jede Minute nach Aufruf) | Passt | Bereits **60 s** in `useLivePrices` – Vercel kann kein Cron, daher clientseitiges Polling jede Minute |
| **Berechnungen** (decimal.js, Durchschnittskosten, Realized/Unrealized) | Behalten | Sauber in `lib/portfolio/calculations.ts`, gut getestet |
| **Login** (Auth.js) | Behalten | 2FA nur dazunehmen, wenn du es „unkompliziert“ findest |
| **Gruppen** | Behalten | Seiten/Gruppen-Logik behalten, ggf. UI vereinfachen |
| **Filter, Grün/Rot, farbige Auszeichnungen** | Behalten | Bereits in PnlText, KpiCard, Badges – beibehalten |
| **Indizes oben** | Behalten | z. B. HeaderIndices – prominent lassen |

---

## Was du vereinfachen oder weglassen kannst

| Was | Empfehlung |
|-----|------------|
| **Zwei Dashboards** (dashboard + dashboard-v2) | **Ein** Dashboard behalten (am besten das, das aus Trades rechnet), das andere entfernen oder nur Redirect |
| **Positions-Tabelle in der DB** | Nicht mehr als Quelle nutzen – nur aus Trades berechnen (wie in dashboard-v2). SELL-Validierung in createTrade ebenfalls aus Trades berechnen, nicht aus positions |
| **API-Route /api/trading** | Entfernen (Mock, bringt nichts für deine Anforderungen) |
| **Übermäßig viele Doku-Dateien** (z. B. mehrere Price-Cron/Caching-Varianten) | Auf 1–2 relevante Docs reduzieren; Rest archivieren oder löschen |
| **Komplizierte Security-Layer** (wenn nicht nötig) | Login + ggf. 2FA reicht; CSRF/Rate-Limit nur da, wo wirklich nötig (z. B. Login, Trade erstellen) |
| **/api/stocks/quote und /api/stocks/search** ohne Login | Mit Login absichern, damit nicht jeder dein Kontingent verbraucht |

---

## Design: „Trade Republic“-Richtung

- **Ruhig und klar:** Viel Weiß/Hellegrau, dezente Karten, keine verspielten Elemente
- **Typo:** Klare, gut lesbare Schrift; Zahlen deutlich (z. B. Monospace für Kurse/Beträge)
- **Farben:** Grün nur für Gewinn, Rot nur für Verlust, sonst neutral (Grau/Blau)
- **Indizes:** Oben als kompakte Leiste (z. B. DAX, MSCI World, S&P 500) mit kleinem Kurs und Tagesänderung
- **Listen:** Tabellen oder Karten mit klaren Zeilen, ausreichend Abstand, klare Hierarchie (z. B. Symbol → Name → Kurs → P&L)
- **Filter:** Als Chips oder Dropdown, klar beschriftet (z. B. „Offen / Geschlossen“, „Gruppe“, „Zeitraum“)

Du musst nicht alles auf einmal umbauen – Schritt für Schritt in diese Richtung gehen reicht.

---

## Nächste sinnvolle Schritte (wenn du aufräumen willst)

1. **ANFORDERUNGEN_WIRKLICH.md** als Referenz nutzen – bei jedem neuen Feature fragen: „Steht das hier drin?“
2. **Preis-Intervall auf 15 Minuten** stellen (eine Zeile im Hook/Config).
3. **Ein Dashboard festlegen** (z. B. nur dashboard-v2), das andere aus dem Menü nehmen oder löschen.
4. **SELL-Validierung** in `createTrade` so umbauen, dass die verfügbare Menge aus den **Trades** berechnet wird, nicht aus der `positions`-Tabelle.
5. **Design** schrittweise an Trade-Republic-Anmutung anpassen (Farben, Abstände, Indizes oben).

Wenn du willst, können wir einen dieser Schritte als Nächstes konkret im Code durchgehen (z. B. nur „15-Minuten-Intervall + ein Dashboard“).
