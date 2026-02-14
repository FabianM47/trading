# Was die App wirklich können soll

**Eine Quelle der Wahrheit** – keine Über-Architektur, nur die gewünschten Features.

---

## Kernfunktion

- **Aktien handeln** und **Trades einsehen**
- Sehen: **Wie viel bin ich diesen Monat und insgesamt im Plus?** (nur Gewinne, Verluste zählen nicht für „im Plus“)
- Saubere, **konsistente Auswertungen**

---

## Trades erfassen

1. **Aktie angeben**
   - Entweder **Suche** (Name/Symbol) **oder** **ISIN** eingeben
2. **Kurs** angeben, zu dem gekauft/verkauft wurde
3. **Entweder**
   - **Stückzahl** (wie viele) **oder**
   - **Geldsumme** (welcher Betrag) – das andere wird daraus berechnet
4. Optional: Gebühren, falls gewünscht

---

## Preise & Anzeige

- **Aktueller Preis:** Abfrage **jede Minute nach Seitenaufruf** (clientseitiges Polling; Vercel bietet kein Cron für solche Abfragen)
- Anzeige: **Plus/Minus in Euro und in Prozent** (grün = Plus, rot = Minus)

---

## Dashboard / Oberfläche

- **Große Indizes oben** (z. B. DAX, S&P 500, etc.) – prominent
- **Filter** – möglich, Einstellungen sauber und konsistent
- **Farbige Auszeichnungen** (z. B. für Gruppen, P&L)
- **Gruppen** – Instrumente in Gruppen einteilbar
- **Design:** zeitgemäß, in der **Design-Sprache von Trade Republic** (klar, ruhig, vertrauenswürdig)

---

## Sicherheit

- **Login** (Pflicht)
- **Zwei-Faktor-Authentifizierung (2FA):** nur wenn **unkompliziert** umsetzbar, sonst weglassen

---

## Kurz-Checkliste

| Anforderung | Priorität |
|-------------|-----------|
| Trades erfassen (Kauf/Verkauf) | Muss |
| Aktie per Suche oder ISIN | Muss |
| Kurs + Stückzahl ODER Geldsumme | Muss |
| Preisabfrage jede Min. (nach Aufruf) | Muss |
| Plus/Minus in € und % (grün/rot) | Muss |
| Monats- und Gesamtgewinn (nur Gewinne) | Muss |
| Große Indizes oben | Muss |
| Filter | Muss |
| Farbige Auszeichnungen / Gruppen | Muss |
| Design wie Trade Republic | Muss |
| Login | Muss |
| 2FA | Nur wenn unkompliziert |

Alles, was nicht in dieser Liste steht, ist **nice-to-have** – und darf die App nicht unnötig kompliziert machen.
