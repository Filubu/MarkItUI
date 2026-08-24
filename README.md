# 🚀 MarkItUI

Eine moderne, elegante Desktop-App (mit **Obsidian Dark Glassmorphism Theme**), die Schulunterlagen (.docx, .pdf, .pptx, .xlsx etc.) automatisch per **MarkItUI** in saubere Markdown-Notizen umwandelt, eine Live-Vorschau bietet und sie mit einem Klick direkt in deinem **Obsidian-Vault** (z. B. auf deiner portablen SSD) ablegt.

---

## 💾 Installation

Lade einfach die Installationsdatei herunter und starte das Setup:

👉 **[MarkItUI Setup 2.4.0.exe](file:///c:/Users/filka/Documents/Code/markitdown_tool/release/MarkItUI%20Setup%202.4.0.exe)**

### Was der Installer macht:
- 🖥️ **Windows Setup Assistent** mit freier Zielordner-Auswahl (z. B. auf deiner SSD oder Festplatte).
- 📌 **Desktop-Verknüpfung** und **Startmenü-Eintrag** werden automatisch angelegt.
- 🔄 **Saubere Deinstallation** über die Windows-Systemsteuerung / Apps & Features unterstützt.

---

## ✨ Features

- 🖱️ **Drag & Drop**: Einfach Dateien aus dem Download-Ordner (z. B. von *Itslearning*) in die App ziehen.
- ⚡ **1-Klick-Konvertierung**: Wandelt `.docx`, `.pdf`, `.pptx`, `.xlsx`, `.csv`, `.txt`, `.html` blitzschnell in Markdown um.
- 👁️ **Obsidian-Live-Vorschau**:
  - **Vorschau-Tab**: Vollständig formatierte Ansicht mit Überschriften, Tabellen, Listen und Code-Blöcken.
  - **Quellcode-Editor**: Quelltext direkt in der App bearbeiten oder per 1-Klick kopieren.
- 📁 **Intelligente Obsidian-Vault-Integration**:
  - **Feste Pfad-Hinterlegung**: Pfad zu deiner portablen SSD einmalig in den Einstellungen speichern.
  - **Automatische Fächer-/Ordner-Erkennung**: Dropdown listet alle Unterordner (z. B. `Mathe`, `Informatik`, `Deutsch`, `Aufgaben`) auf für 1-Klick-Ablage.
  - **"Speichern unter..."**: Ermöglicht freies Speichern an jedem beliebigen Ort.
  - **Direktes Öffnen in Obsidian**: Nach dem Speichern kann die Notiz sofort über die Obsidian URI (`obsidian://open`) geöffnet werden.
- 🏷️ **Automatisches YAML-Frontmatter**:
  - Fügt automatisch Metadaten wie `title`, `created`, `source_file`, `subject` und `tags` (z. B. `#schule`, `#itslearning`) ein.

---

## 🛠️ Entwicklung & Installer-Build

### Voraussetzungen
- Node.js (v18+)
- Python 3.10+ mit `markitdown` (`pip install markitdown`)

### Entwicklungsmodus starten
```bash
npm run dev
```

### Windows Setup-Installer neu bauen
```bash
npm run dist:installer
```
Der fertige Installer liegt in `release/MarkItUI Setup 2.4.0.exe`.

