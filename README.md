# MarkItUI

Desktop-Anwendung zur automatisierten Konvertierung von Dokumenten in sauberes, strukturiertes Obsidian-Markdown.

---

## Übersicht

**MarkItUI** transformiert Dokumentformate (PDF, Office-Dokumente, Tabellen und Präsentationen) in standardkonformes Markdown für Obsidian. Die Anwendung kombiniert eine Multi-Engine Konvertierungsarchitektur mit nativer Windows-Explorer-Integration, konfigurierbarem Vault-Routing, automatischer Voraussetzungs-Diagnose und einer Live-Vorschau im Obsidian-Dark-Design.

---

## Installation & Download

Die vorkompilierte Installationsdatei für Windows steht im Release-Bereich bereit:

- **Download:** [MarkItUI Setup 2.6.7.exe](https://github.com/Filubu/MarkItUI/releases/latest/download/MarkItUI.Setup.2.6.7.exe)
- **Release-Übersicht:** [GitHub Releases](https://github.com/Filubu/MarkItUI/releases)

### Setup-Funktionen
- Standardisierter Windows-Setup-Assistent mit freier Zielverzeichnis-Auswahl.
- Automatische Desktop- und Startmenü-Verknüpfungen.
- Registrierung der Windows-Explorer-Kontextmenüs für Dateien und Verzeichnisse.
- Vollständige Deinstallationsroutine über Windows Apps & Features.
- Mitgelieferte Setup-Skripte zur 1-Klick-Einrichtung von Python-Voraussetzungen.

---

## Voraussetzungen & Terminal-Setup

MarkItUI erkennt Python und alle Voraussetzungen auf Windows-Notebooks und PCs vollautomatisch. Falls auf einem neuen Gerät noch Pakete fehlen:

### 1-Klick über die App:
In den Einstellungen oder bei Konvertierungsfehlern einfach auf **„1-Klick Pakete reparieren / installieren“** klicken.

### Einfach über das Terminal:
```bash
# Über npm:
npm run setup:python

# Oder direkt per Batch:
install_requirements.bat

# Oder per PowerShell:
.\install_requirements.ps1
```

*Tipp:* Das Setup-Skript installiert bei Bedarf fehlendes Python automatisch via `winget` und aktualisiert alle benötigten Konverter-Pakete.

---

## Kernfunktionen

### 1. Multi-Engine Konvertierung & Fallbacks
- **Tier 1 (MarkItDown):** Primäre Konvertierung via Microsoft MarkItDown.
- **Tier 2 (Spezialisierte Fallbacks):**
  - **PDF:** Layout- und Tabellenextraktion via `pdfplumber` / `pypdfium2` / `pdfminer`.
  - **Word (`.docx`):** Strukturierte Extraktion via `mammoth` & `python-docx`.
  - **PowerPoint (`.pptx`):** Folien, Aufzählungspunkte, Tabellen und Sprechernotizen via `python-pptx`.
  - **Excel & Tabellen (`.xlsx`, `.csv`):** Tabellenblätter als Markdown-Tabellen via `openpyxl`.
  - **Textdokumente:** Automatische Multi-Encoding-Erkennung (`UTF-8`, `CP1252`, `Latin-1`).

### 2. Windows Explorer Integration & Drag & Drop
- **Dateikontextmenü:** Rechtsklick auf eine beliebige Dokumentdatei &rarr; *„Mit MarkItUI konvertieren“*. Startet oder fokussiert die Anwendung und führt die Umwandlung unmittelbar durch.
- **Ordnerkontextmenü:** Rechtsklick auf ein Verzeichnis &rarr; *„Ordner mit MarkItUI umwandeln“*. Scannt den Ordner rekursiv nach allen unterstützten Dokumenttypen und reiht sie in die Konvertierungs-Queue ein.
- **Single-Instance:** Wiederholte Aufrufe aus dem Explorer übergeben Pfade nahtlos an die bereits laufende Instanz.

### 3. Batch-Verarbeitung & Ordner-Export
- **Massenexport:** Exportiert alle konvertierten Dokumente mit einem Klick in ein Zielverzeichnis.
- **Strukturerhalt:** Übernimmt auf Wunsch die relative Ordnerhierarchie der Ursprungsdateien.

### 4. Obsidian-Vault-Integration & Routing
- **Vault-Erkennung:** Automatische Validierung von `.obsidian`-Konfigurationen.
- **Unterordner-Auswahl:** Schneller Verzeichnis-Picker direkt in der Aktionsleiste für die Ablage in spezifischen Fach- oder Themenordnern.
- **Vault-Routing:** Definition strukturierter Routing-Regeln (`.markitui-routing.json`) zur schnellen Zuweisung wiederkehrender Kategorien.
- **Obsidian URI:** Direkte Verlinkung (`obsidian://open`) zum Öffnen neu erstellter Notizen in Obsidian.

### 5. Automatisiertes YAML-Frontmatter
- Extraktion und Generierung strukturierter Metadaten zu Beginn jeder Notiz:
  - `title`: Dateititel / Dokumentenbezeichnung
  - `created`: Erstellungszeitpunkt im ISO-Format
  - `source_file`: Name der Quelldatei
  - `subject`: Zugewiesenes Fach / Thema
  - `tags`: Konfigurierbare Standard-Tags (z. B. `#schule`, `#itslearning`)

### 6. Dokumenten-Editor & Vorschau
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
- **Python:** 3.10 oder höher

### Lokale Entwicklung
```bash
# Abhängigkeiten installieren
npm install

# Voraussetzungen einrichten
npm run setup:python

# Entwicklungsumgebung starten
npm run dev
```

### Windows Setup-Installer kompilieren
```bash
npm run dist:installer
```
Die kompilierte Installationsdatei wird im Verzeichnis `release/` abgelegt (`release/MarkItUI Setup 2.7.0.exe`).

---

## Danksagung & Attribution

- **Core-Engine:** Die Dokumentenkonvertierung basiert auf der quelloffenen Python-Bibliothek **[Microsoft MarkItDown](https://github.com/microsoft/markitdown)** (MIT-Lizenz) erweitert um robuste native Multi-Engine-Fallbacks (`pdfplumber`, `mammoth`, `python-pptx`, `openpyxl`).
- **Projektcharakter:** Dieses Projekt ist *vibecoded* – iterativ und fokussiert entwickelt im KI-gestützten Pair-Programming für maximale Alltagsproduktivität.
- **Frontend & Desktop-App:** Entwickelt von [Filubu](https://github.com/Filubu).

---

## Lizenz

Dieses Projekt ist unter der [MIT-Lizenz](LICENSE) lizenziert.
