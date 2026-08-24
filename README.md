# MarkItUI

Desktop-Anwendung zur automatisierten Konvertierung von Dokumenten in sauberes, strukturiertes Obsidian-Markdown.

---

## Übersicht

**MarkItUI** transformiert Dokumentformate (PDF, Office-Dokumente, Tabellen und Präsentationen) in standardkonformes Markdown für Obsidian. Die Anwendung kombiniert eine lokale Konvertierungs-Engine mit nativer Windows-Explorer-Integration, konfigurierbarem Vault-Routing und einer Live-Vorschau im Obsidian-Dark-Design.

---

## Installation & Download

Die vorkompilierte Installationsdatei für Windows steht im Release-Bereich bereit:

- **Download:** [MarkItUI Setup 2.6.0.exe](https://github.com/Filubu/MarkItUI/releases/latest/download/MarkItUI.Setup.2.6.0.exe)
- **Release-Übersicht:** [GitHub Releases](https://github.com/Filubu/MarkItUI/releases)

### Setup-Funktionen
- Standardisierter Windows-Setup-Assistent mit freier Zielverzeichnis-Auswahl.
- Automatische Desktop- und Startmenü-Verknüpfungen.
- Registrierung der Windows-Explorer-Kontextmenüs für Dateien und Verzeichnisse.
- Vollständige Deinstallationsroutine über Windows Apps & Features.

---

## Kernfunktionen

### 1. Windows Explorer Integration & Drag & Drop
- **Dateikontextmenü:** Rechtsklick auf eine beliebige Dokumentdatei &rarr; *„Mit MarkItUI konvertieren“*. Startet oder fokussiert die Anwendung und führt die Umwandlung unmittelbar durch.
- **Ordnerkontextmenü:** Rechtsklick auf ein Verzeichnis &rarr; *„Ordner mit MarkItUI umwandeln“*. Scannt den Ordner rekursiv nach allen unterstützten Dokumenttypen und reiht sie in die Konvertierungs-Queue ein.
- **Single-Instance:** Wiederholte Aufrufe aus dem Explorer übergeben Pfade nahtlos an die bereits laufende Instanz.

### 2. Batch-Verarbeitung & Ordner-Export
- **Massenexport:** Exportiert alle konvertierten Dokumente mit einem Klick in ein Zielverzeichnis.
- **Strukturerhalt:** Übernimmt auf Wunsch die relative Ordnerhierarchie der Ursprungsdateien.

### 3. Obsidian-Vault-Integration & Routing
- **Vault-Erkennung:** Automatische Validierung von `.obsidian`-Konfigurationen.
- **Unterordner-Auswahl:** Schneller Verzeichnis-Picker direkt in der Aktionsleiste für die Ablage in spezifischen Fach- oder Themenordnern.
- **Vault-Routing:** Definition strukturierter Routing-Regeln (`.markitui-routing.json`) zur schnellen Zuweisung wiederkehrender Kategorien.
- **Obsidian URI:** Direkte Verlinkung (`obsidian://open`) zum Öffnen neu erstellter Notizen in Obsidian.

### 4. Automatisiertes YAML-Frontmatter
- Extraktion und Generierung strukturierter Metadaten zu Beginn jeder Notiz:
  - `title`: Dateititel / Dokumentenbezeichnung
  - `created`: Erstellungszeitpunkt im ISO-Format
  - `source_file`: Name der Quelldatei
  - `subject`: Zugewiesenes Fach / Thema
  - `tags`: Konfigurierbare Standard-Tags (z. B. `#schule`, `#itslearning`)

### 5. Dokumenten-Editor & Vorschau
- **Drei Ansichtsmodi:**
  - *Vorschau:* Formatierte Renderansicht mit Tabellen, Code-Highlighting und mathematischen Ausdrücken.
  - *Split-View:* Zeitgleiche Anzeige von Quellcode-Editor und gerenderter Vorschau.
  - *Quelltext:* Direkte Markdown-Bearbeitung.
- **Optische Maskierung:** Weiche, gradientenbasierte Masken an den Rändern für ergonomisches Scrollen.

---

## Unterstützte Dateiformate

| Kategorie | Dateiendungen |
| :--- | :--- |
| **Dokumente** | `.pdf`, `.docx`, `.doc`, `.rtf`, `.epub` |
| **Präsentationen** | `.pptx`, `.ppt` |
| **Tabellen & Daten** | `.xlsx`, `.xls`, `.csv` |
| **Web & Text** | `.html`, `.htm`, `.txt`, `.xml`, `.json` |

---

## Entwicklung & Build

### Voraussetzungen
- **Node.js:** v18.0 oder höher
- **Python:** 3.10 oder höher mit installiertem `markitdown` (`pip install -r requirements.txt`)

### Lokale Entwicklung
```bash
# Abhängigkeiten installieren
npm install

# Entwicklungsumgebung starten
npm run dev
```

### Windows Setup-Installer kompilieren
```bash
npm run dist:installer
```
Die kompilierte Installationsdatei wird im Verzeichnis `release/` abgelegt.

---

## Danksagung & Attribution

- **Core-Engine:** Die eigentliche Dokumentenkonvertierung basiert auf der quelloffenen Python-Bibliothek **[Microsoft MarkItDown](https://github.com/microsoft/markitdown)** (MIT-Lizenz). MarkItUI fungiert als spezialisiertes Desktop-Frontend, Shell- und Obsidian-Integrationsschicht um Microsofts Engine herum.
- **Projektcharakter:** Dieses Projekt ist *vibecoded* – iterativ und fokussiert entwickelt im KI-gestützten Pair-Programming für maximale Alltagsproduktivität.
- **Frontend & Desktop-App:** Entwickelt von [Filubu](https://github.com/Filubu).

---

## Lizenz

Dieses Projekt ist unter der [MIT-Lizenz](LICENSE) lizenziert.
