# MarkItUI

Desktop-Anwendung zur automatisierten Konvertierung von Dokumenten in sauberes, strukturiertes Obsidian-Markdown.

---

## Übersicht

**MarkItUI** transformiert Dokumentformate (PDF, Office-Dokumente, Tabellen und Präsentationen) in standardkonformes Markdown für Obsidian. Die Anwendung kombiniert eine Multi-Engine Konvertierungsarchitektur mit nativer Windows-Explorer-Integration, konfigurierbarem Vault-Routing, automatischer Voraussetzungs-Diagnose und einer Live-Vorschau im Obsidian-Dark-Design.

---

## Installation & Download

Die vorkompilierte Installationsdatei für Windows steht im Release-Bereich bereit:

- **Download:** [MarkItUI Setup 2.7.0.exe](https://github.com/Filubu/MarkItUI/releases/latest/download/MarkItUI.Setup.2.7.0.exe)
- **Release-Übersicht:** [GitHub Releases](https://github.com/Filubu/MarkItUI/releases)

### Setup-Funktionen
- Standardisierter Windows-Setup-Assistent mit freier Zielverzeichnis-Auswahl.
- Automatische Desktop- und Startmenü-Verknüpfungen.
- Registrierung der Windows-Explorer-Kontextmenüs für Dateien und Verzeichnisse.
- Vollständige Deinstallationsroutine über Windows Apps & Features.
- Mitgelieferte Setup-Skripte zur 1-Klick-Einrichtung von Python-Voraussetzungen.

---

## Voraussetzungen & Terminal-Setup

MarkItUI erkennt Python und alle Voraussetzungen auf Windows-Notebooks und PCs vollautomatisch – **auch auf Geräten, auf denen noch gar kein Python installiert ist.**

### 1-Klick über die App (empfohlen):
Fehlt etwas, erscheint direkt in der App eine Hinweisleiste mit **„Jetzt automatisch einrichten“**. Ein Klick genügt:

1. Fehlt Python komplett, installiert MarkItUI es selbst – über `winget` im Benutzerkonto (keine Adminrechte nötig) oder ersatzweise per Direkt-Download von python.org.
2. Anschliessend werden alle Konverter-Pakete gruppenweise installiert; bei fehlenden Schreibrechten automatisch mit `--user`.
3. Zum Schluss prüft die App die Installation und wandelt zuvor fehlgeschlagene Dateien automatisch erneut um.

Der gleiche Knopf steht in den Einstellungen (**„1-Klick Pakete reparieren / installieren“**) und im Fehlerfenster zur Verfügung.

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
Für jedes Format läuft eine Engine-Kette. Die spezialisierten Engines kommen zuerst (bessere Tabellen und Notizen, schnellerer Start), MarkItDown fängt alles Übrige ab:

- **PDF:** `pdfplumber` (inkl. Tabellen) → `pypdfium2` → MarkItDown → `pdfminer`.
- **Word (`.docx`):** `mammoth` → `python-docx` (inkl. Tabellen) → MarkItDown.
- **PowerPoint (`.pptx`):** `python-pptx` mit Folien, Aufzählungen, Tabellen und Sprechernotizen → MarkItDown.
- **Excel (`.xlsx`, `.xlsm`, `.xls`):** `openpyxl` bzw. `xlrd` als Markdown-Tabellen → MarkItDown.
- **CSV/TSV, HTML, RTF, Text:** eigener CSV-Parser mit Trennzeichen-Erkennung, BeautifulSoup-Extraktion, RTF-Bereinigung, Multi-Encoding-Erkennung (`UTF-8`, `UTF-16`, `CP1252`, `Latin-1`).
- **Selbstheilend:** Bringt eine defekte Systembibliothek eine Engine zum Absturz, wird sie erkannt, übersprungen und die nächste Engine übernimmt.
- **Ehrliche Fehler:** Fehlt ein Paket, nennt die Meldung genau das fehlende Paket – statt unlesbaren Datenmüll auszugeben.

### 2. Windows Explorer Integration & Drag & Drop
- **Dateikontextmenü:** Rechtsklick auf eine beliebige Dokumentdatei &rarr; *„Mit MarkItUI konvertieren“*. Startet oder fokussiert die Anwendung und führt die Umwandlung unmittelbar durch.
- **Ordnerkontextmenü:** Rechtsklick auf ein Verzeichnis &rarr; *„Ordner mit MarkItUI umwandeln“*. Scannt den Ordner rekursiv nach allen unterstützten Dokumenttypen und reiht sie in die Konvertierungs-Queue ein.
- **Single-Instance:** Wiederholte Aufrufe aus dem Explorer übergeben Pfade nahtlos an die bereits laufende Instanz.

### 3. Batch-Verarbeitung, Warteschlange & Ordner-Export
- **Serielle Warteschlange:** Auch bei hunderten Dateien wird immer nur *ein* Dokument gleichzeitig umgewandelt – das Notebook bleibt flüssig bedienbar. Die Kopfzeile zeigt „x/y umgewandelt“ inklusive Abbrechen-Knopf.
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
| **Tabellen & Daten** | `.xlsx`, `.xlsm`, `.xls`, `.csv`, `.tsv` |
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

### Voraussetzungen prüfen
```bash
# Diagnose des Python-Environments (zeigt fehlende Pakete)
python python_engine/markitdown_worker.py --doctor
```

---

## Danksagung & Attribution

- **Core-Engine:** Die Dokumentenkonvertierung basiert auf der quelloffenen Python-Bibliothek **[Microsoft MarkItDown](https://github.com/microsoft/markitdown)** (MIT-Lizenz) erweitert um robuste native Multi-Engine-Fallbacks (`pdfplumber`, `mammoth`, `python-pptx`, `openpyxl`).
- **Projektcharakter:** Dieses Projekt ist *vibecoded* – iterativ und fokussiert entwickelt im KI-gestützten Pair-Programming für maximale Alltagsproduktivität.
- **Frontend & Desktop-App:** Entwickelt von [Filubu](https://github.com/Filubu).

---

## Lizenz

Dieses Projekt ist unter der [MIT-Lizenz](LICENSE) lizenziert.
