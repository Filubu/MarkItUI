# 🚀 MarkItUI (v2.6.0)

Eine moderne, elegante Desktop-App (im **Obsidian Ethereal Glassmorphism Design**), die Schulunterlagen (.docx, .pdf, .pptx, .xlsx, .csv etc.) per **MarkItUI** in saubere Markdown-Notizen umwandelt, eine interaktive Live-Vorschau bietet und sie mit einem Klick direkt in deinem **Obsidian-Vault** ablegt.

---

## 💾 Installation & Download

Lade einfach die aktuelle Windows-Setup-Datei herunter und starte das Setup:

👉 **[MarkItUI Setup 2.6.0.exe](file:///c:/Users/filka/Documents/Code/markitdown_tool/release/MarkItUI%20Setup%202.6.0.exe)**

### Was der Installer macht:
- 🖥️ **Windows Setup Assistent** mit freier Zielordner-Auswahl (z. B. auf deiner SSD oder Festplatte).
- 📌 **Desktop-Verknüpfung** und **Startmenü-Eintrag** mit hochauflösendem App-Logo werden automatisch angelegt.
- ⚡ **Windows Explorer Kontextmenü**: 
  - Rechtsklick auf eine Datei &rarr; *„Mit MarkItUI konvertieren“*
  - Rechtsklick auf einen Ordner &rarr; *„Ordner mit MarkItUI umwandeln“*
- 🔄 **Saubere Deinstallation** über die Windows-Systemsteuerung / Apps & Features unterstützt.

---

## ✨ Features im Überblick

- 🖱️ **Windows Explorer Integration & Drag & Drop**:
  - Konvertiere einzelne Dokumente oder ganze Ordner direkt per Rechtsklick aus dem Explorer.
  - Multi-File Drag & Drop mit automatischer Dateierkennung und Queue-Verwaltung.
- 📦 **Ordner-Unzip & Batch-Export**:
  - Ganze Ordner rekursiv nach Dokumenten durchsuchen und mit einem Klick als Markdown entpacken/exportieren (unter Beibehaltung der Ordnerstruktur).
- ⚡ **1-Klick-Konvertierung**:
  - Unterstützt `.pdf`, `.docx`, `.doc`, `.pptx`, `.ppt`, `.xlsx`, `.xls`, `.csv`, `.txt`, `.html`, `.rtf`, `.epub`, `.xml`, `.json`.
- 👁️ **Obsidian-Live-Vorschau & Split-Editor**:
  - **Vorschau-Modus**: Vollständig gerenderte Notiz mit Tabellen, Überschriften, Listen und Codeblöcken.
  - **Split-Modus**: Zeitgleiche Ansicht von Editor und Vorschau.
  - **Quellcode-Modus**: Direkte Markdown-Bearbeitung mit Tastaturkürzeln.
- 🌫️ **Sanfter Text-Auslauf (Fade-Mask)**:
  - Text scrollt weich und organisch über CSS-Gradientenmasken oben und vor der Save-Bar ins Dunkle aus (keine harten Schnittkanten).
- 📁 **Obsidian-Vault Integration & Routing**:
  - **Freie Pfadlänge & Live-Erkennung**: Beliebig lange Pfade (z. B. auf externen SSDs) mit automatischer `.obsidian`-Validierung.
  - **Schnellwechsel in Save-Bar**: Vault-Pfad direkt im Unterordner-Dropdown wechseln.
  - **Vault-Routing**: Intelligente Fächer- und Themenzuordnung (`.markitui-routing.json`).
  - **Direktes Öffnen in Obsidian**: Notizen sofort nach dem Speichern via Obsidian-URI öffnen.
- 🏷️ **Automatisches YAML-Frontmatter**:
  - Generiert konfigurierbare Metadaten (`title`, `created`, `source_file`, `subject`, `tags`).

---

## 🛠️ Entwicklung & Installer-Build

### Voraussetzungen
- Node.js (v18+)
- Python 3.10+ mit `markitdown` (`pip install markitdown`)

### Entwicklungsmodus starten
```bash
npm run dev
```

### Windows Setup-Installer bauen
```bash
npm run dist:installer
```
Der fertige Installer liegt in `release/MarkItUI Setup 2.6.0.exe`.



