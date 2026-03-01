# CLAUDE.md

## Agent-Konfiguration

Alle Agents, die für dieses Projekt verwendet werden sollen, befinden sich im Ordner `/agents`.

Bevor du mit einer Aufgabe beginnst, prüfe ob ein passender Agent im Ordner `agents/` vorhanden ist und nutze diesen für die Ausführung.

### Struktur

```
trading/
└── agents/
    ├── <agent-name>.md
    └── ...
```

### Hinweise

- Agents sind als Markdown-Dateien (`.md`) im Ordner `agents/` abgelegt
- Jeder Agent beschreibt seine Aufgabe, seinen Kontext und seine Anweisungen
- Nutze immer den spezifischsten Agent für die jeweilige Aufgabe
- Falls kein passender Agent existiert, arbeite ohne Agent und schlage vor, einen neuen Agent anzulegen