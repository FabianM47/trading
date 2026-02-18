# Teilverkäufe (Partial Sales)

## Übersicht

Die Trading-App unterstützt jetzt **Teilverkäufe** (Partial Sales), sodass Sie nicht immer die gesamte Position eines Trades verkaufen müssen, sondern auch nur einen Teil davon.

## Features

### ✅ Teilverkauf durchführen

1. **Trade auswählen**: Klicken Sie auf "Schließen" bei einem offenen Trade
2. **Menge eingeben**: Geben Sie die zu verkaufende Anzahl ein (zwischen 0.01 und der verfügbaren Menge)
3. **Preis angeben**: Wählen Sie zwischen:
   - **Preis pro Aktie**: Verkaufspreis pro Stück
   - **Gesamtbetrag**: Gesamterlös aus dem Verkauf
4. **Bestätigen**: Klicken Sie auf "Teilverkauf durchführen"

### 🔄 Was passiert beim Teilverkauf?

#### Ursprünglicher Trade wird aktualisiert:
- **Menge wird reduziert**: Die verkaufte Menge wird von der Position abgezogen
- **Investierter Betrag wird angepasst**: Proportional zur verbleibenden Menge
- **Original-Menge wird gespeichert**: Um die Historie nachvollziehen zu können
- **Teilverkaufs-Historie**: Alle Teilverkäufe werden im Trade gespeichert

#### Neuer geschlossener Trade wird erstellt:
- **Separater Trade-Eintrag**: Für den verkauften Teil
- **Status**: Automatisch als "Geschlossen" markiert
- **Realisierter Gewinn**: Wird berechnet und angezeigt
- **Verknüpfung**: Mit `parentTradeId` zum ursprünglichen Trade

### 📊 UI-Anzeige

#### Teilverkaufte Trades erkennen:

**Mobile & Desktop:**
- 🟡 **"Teilverkauft" Badge**: Gelber Badge neben dem Trade-Namen
- **Mengen-Anzeige**: 
  - Mobile: `50 (100)` - 50 verbleibend von ursprünglich 100
  - Desktop: `50 / 100` - gleiche Information
- **Historie**: `2× teilverkauft` - Anzahl der Teilverkäufe

#### Im Close-Modal:
- ⚠️ **Warnung bei Teilverkauf**: Orange Box zeigt "Teilverkauf: X von Y Stück"
- **Verbleibende Menge**: Wird automatisch berechnet und angezeigt
- **Button-Text**: 
  - Bei Teilverkauf: "Teilverkauf durchführen"
  - Bei vollständigem Verkauf: "Trade komplett schließen"

## Beispiel-Szenario

### Ausgangssituation
```
Trade: Apple Inc. (AAPL)
Kaufpreis: 150€
Menge: 100 Stück
Investiert: 15.000€
```

### 1. Teilverkauf
```
Verkaufte Menge: 30 Stück
Verkaufspreis: 180€
Erlös: 5.400€
Gewinn: 900€ (30 × (180 - 150))
```

**Ergebnis:**
- ✅ Geschlossener Trade: 30 Stück @ 180€ → +900€ realisiert
- 🔄 Verbleibender Trade: 70 Stück @ 150€ (Kaufpreis) → 10.500€ investiert

### 2. Zweiter Teilverkauf
```
Verkaufte Menge: 40 Stück
Verkaufspreis: 200€
Erlös: 8.000€
Gewinn: 2.000€ (40 × (200 - 150))
```

**Ergebnis:**
- ✅ Zweiter geschlossener Trade: 40 Stück @ 200€ → +2.000€ realisiert
- 🔄 Verbleibender Trade: 30 Stück @ 150€ → 4.500€ investiert
- **Teilverkaufs-Historie**: 2× teilverkauft (Badge zeigt "2× teilverkauft")

### 3. Vollständiger Verkauf des Rests
```
Verkaufte Menge: 30 Stück (alle verbleibenden)
Verkaufspreis: 160€
Erlös: 4.800€
Gewinn: 300€ (30 × (160 - 150))
```

**Ergebnis:**
- ✅ Position komplett geschlossen
- **Gesamt-Realisierter Gewinn**: 900€ + 2.000€ + 300€ = **3.200€**

## Datenstruktur

### Trade Interface (erweitert)

```typescript
interface Trade {
  // ... bestehende Felder
  
  // Teilverkauf-Felder
  originalQuantity?: number;        // Ursprüngliche Menge (100)
  partialSales?: PartialSale[];     // Historie der Teilverkäufe
  
  // Für abgespaltene Teilverkaufs-Trades
  isPartialSale?: boolean;          // Kennzeichnung als Teilverkauf
  parentTradeId?: string;           // ID des ursprünglichen Trades
}

interface PartialSale {
  id: string;                       // ID des abgespaltenen Trades
  soldQuantity: number;             // Verkaufte Menge
  sellPrice: number;                // Verkaufspreis pro Stück
  sellTotal: number;                // Gesamterlös
  realizedPnL: number;              // Realisierter Gewinn/Verlust
  soldAt: string;                   // Verkaufszeitpunkt (ISO)
}
```

## Berechnung

### Teilverkaufs-Gewinn
```typescript
const partialPnL = (sellPrice - buyPrice) × soldQuantity;
```

### Anpassung des verbleibenden Trades
```typescript
// Neue Menge
remainingQuantity = originalQuantity - soldQuantity;

// Neuer investierter Betrag
newInvestedEur = buyPrice × remainingQuantity;
```

### Portfolio-Zusammenfassung
- **Realisierter P/L**: Summiert ALLE geschlossenen Trades (inkl. Teilverkäufe)
- **Unrealisierter P/L**: Berechnet nur aus offenen Positionen
- **Gesamt-P/L**: Realisiert + Unrealisiert

## Vorteile

✅ **Flexibles Portfolio-Management**: Schrittweiser Exit aus Positionen
✅ **Gewinn-Mitnahme**: Teil-Gewinne realisieren, Rest laufen lassen
✅ **Risiko-Management**: Reduktion von Positionen ohne kompletten Ausstieg
✅ **Historie**: Vollständige Nachvollziehbarkeit aller Transaktionen
✅ **Genaue Buchführung**: Korrekte Berechnung von realisierten Gewinnen

## Technische Details

### Modal-Änderungen (`CloseTradeModal.tsx`)
- Neues Feld: `sellQuantity` (Anzahl der zu verkaufenden Stücke)
- Validierung: Menge muss zwischen 0.01 und `trade.quantity` liegen
- Dynamischer Button-Text basierend auf `isPartialSale`
- Preview zeigt verbleibende Menge bei Teilverkauf

### Page-Logik (`page.tsx`)
- `handleSaveClosedTrade` erkennt Teilverkäufe
- Bei Teilverkauf:
  1. Erstellt geschlossenen Trade für verkauften Teil
  2. Aktualisiert ursprünglichen Trade (reduzierte Menge)
  3. Speichert Teilverkaufs-Historie
- Bei vollständigem Verkauf: Wie bisher

### UI-Komponenten (`TradeTable.tsx`)
- Badge "Teilverkauft" für Trades mit partialSales
- Mengen-Anzeige: `current / original`
- Tooltip mit ursprünglicher Menge
- Zähler für Anzahl der Teilverkäufe

## Zusammenfassung

Das Teilverkaufs-Feature ermöglicht professionelles Portfolio-Management durch:

- 🎯 **Flexible Position-Exits**: Verkaufen Sie so viel oder wenig wie Sie möchten
- 📈 **Gewinn-Optimierung**: Sichern Sie Teilgewinne bei gleichzeitigem Exposure
- 📊 **Transparente Historie**: Jeder Verkauf wird dokumentiert
- 🔢 **Korrekte Berechnung**: P/L wird proportional und genau berechnet
- 💡 **Intuitive UI**: Klare visuelle Indikatoren für teilverkaufte Positionen

Perfekt für Strategien wie "Sell Half on Double" oder stufenweisen Ausstieg aus Positionen!
