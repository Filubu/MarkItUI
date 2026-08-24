# Changelog

Alle relevanten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.
Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/) und folgt [Semantic Versioning](https://semver.org/lang/de/).

---

## [2.4.0] - 2026-08-24

### Added
- **Vollständiges Rebranding zu MarkItUI**: Umbenennung des gesamten Projekts, der Paket- und Anwendungsnamen, Fenstertitel, Skripte, Dokumentationen und Build-Konfigurationen in **MarkItUI**.
- **Neues Obsidian Ethereal App-Logo**: Neues monochromes Logo (`app_logo.png`) im Obsidian-Stil, inklusive Multi-Auflösungs-Icons (`build/icon.ico`, `build/icon.png`, `public/app_logo.png`), nativer Windows-Einbindung und Branding im App-Header sowie Onboarding-Screen.
- **MarkItUI Vault-Routing**: Unterstützung der Konfigurationsdatei `.markitui-routing.json` im Obsidian Vault Root mit nahtloser Abwärtskompatibilität zu `.markitdown-routing.json`.
- **Neue Starter-Skripte**: Bereitstellung von `Start_MarkItUI.bat`.

---

## [2.3.0] - 2026-08-24

### Added
- **Fluid UI & Motion Design System**: Umstellung der gesamten Benutzeroberfläche auf ein durchgängiges, organisches Spring-Physics Bewegungssystem (hohe Dämpfung, mittlere Steifigkeit).
- **Zentrales Spring-Physics Setup**: Globales CSS-Token-System (`--ease-spring-soft`, `--ease-spring-snappy`, `--ease-spring-press`, `--ease-fluid`) und fein abgestufte Animationstimings (`120ms` bis `680ms`).
- **Choreografiertes Staggering**: Kaskadierendes Einfließen von Dateilisten, File-Tabs, Obsidian-Properties, Format-Tags und Routing-Chips (`animation-delay: calc(var(--i) * 35ms)`).
- **Elastische Mikro-Interaktionen**: Haptisches Feedback beim Hovern (sanftes Anheben und Skalieren) und Klicken (elastisches Einsinken) für alle Buttons, Tabs, Chips, Inputs und Modals.
- **Nahtlose Zustandsübergänge**: Weiche Ineinander-Überblendungen zwischen Onboarding, Drop-Bereich und Dokumenten-Viewport sowie elastische Modal- und Dropdown-Animationen.
- **Unterbrechbare Animationen**: Hardware-beschleunigte CSS-Transitions auf Basis von `transform` und `opacity`, die bei schnellen Nutzeraktionen sofort und ruckelfrei umkehren.

---

## [2.2.0] - 2026-08-24

### Added
- **Obsidian Properties Card**: Dedizierter Metadaten-Bereich über der Notiz mit echten Obsidian Tag-Pills (`#tag`), Erstellungsdatum (📅) und Quelldatei.
- **Obsidian Tag-Pills**: Automatische Formatierung von Tags als echte `#tag` Badges in YAML Frontmatter und Vorschau.

### Changed
- **Intelligente Titel-Bereinigung**: Automatische Umwandlung von Dateinamen in lesbare H1-Überschriften (Entfernung von Dateiendungen, Unterstrichen, Bindestrichen und MarkItDown-`Title:`-Artefakten).
- **Keine Tags/Daten in Überschriften**: Notiz-Überschrift bleibt rein textuell und wird nicht durch Metadaten überladen. Datum und Tags verbleiben sauber im Obsidian YAML Frontmatter.

---

## [2.1.0] - 2026-08-24

### Added
- **Onboarding-Flow**: App verlangt beim ersten Start die Auswahl eines Obsidian Vault. Ohne Vault ist kein Datei-Drop möglich.
- **Vault-Erkennung**: Erkennt automatisch ob ein Ordner ein Obsidian Vault ist (`.obsidian`-Ordner).
- **Vault-Routing-Config**: `.markitdown-routing.json` im Vault-Root für schnelle Zuordnung von Lehrern/Lernfeldern/Themen zu Ordnern. Unterstützt verschachtelte Sub-Routen. Wird bei jedem Start neu geladen und kann händisch bearbeitet werden.
- **FolderTreePicker**: Hierarchischer Dateibaum als Ordnerwahl statt flachem Dropdown.
- **Quick-Access-Chips**: Routing-basierte Schnellzugriff-Buttons über der Save-Bar.

### Changed
- **Lesbarkeit verbessert**: Schriftgrößen durchgehend erhöht (13–15px statt 11–12px), Tabellen mit mehr Padding, Save-Bar vergrößert.
- **Titel ohne „Title:" Präfix**: Konvertierter Markdown zeigt den Titel als reines `# Heading` ohne "Title:"-Metadaten.
- **Header vereinfacht**: Vault-Pill entfernt (Vault-Auswahl via Onboarding/Settings), Settings-Zahnrad bleibt.
- **Save-Bar breiter**: Mehr Padding, größere Schrift, mindestens 52px Höhe.
- **Font normalisiert**: Dateiname-Input verwendet Sans-Serif statt Monospace.

### Fixed
- Redundante Navigation: Settings-Zahnrad und Vault-Pill führten zum gleichen Dialog.

---

## [2.0.0] - 2026-08-24

### Added
- **Obsidian Ethereal Design System**: Vollständiges Schwarz-Weiß / Monochrom Theme mit transluzenten Mattglas-Ebenen (Level 1 Surface 20px Blur, Level 2 Floating 40px Blur) laut `DESIGN.md`.
- **View-Modi**: 3-Wege-Umschaltung zwischen `Vorschau` (Rendered Markdown), `Split-View` (Side-by-side Live-Editor & Vorschau) und `Quellcode` (JetBrains Mono Editor).
- **Horizontale Tabs**: Elegante File-Tabs im oberen Header mit Schnellschließen und `+` File-Adder.
- **Globales Drag & Drop**: Vollflächiger Drop-Bereich über das gesamte App-Fenster.
- **Vollständige PDF-Unterstützung**: Integration von `markitdown[all]`, `pdfplumber`, `pypdfium2` und `pdfminer.six`.

### Changed
- **Entfernung der Sidebar**: Die permanente 360px-Seitenleiste wurde komplett entfernt, um den vollen Bildschirm für Notizen und Markdown bereitzustellen.
- **Aktionsleiste**: Schwebendes Glassmorphism-Dock am unteren Bildschirmrand mit Ghost-Inputs und 1-Klick Obsidian-Speicherbutton.

### Fixed
- **MissingDependencyException**: Behebung fehlender PDF-Abhängigkeiten beim Verarbeiten von `.pdf`-Dateien.
- **Fehleransicht**: Reine monochrome Gestaltung ohne störende farbige Elemente.

### Removed
- Bunte Akzentfarben, Badges und Farbverläufe.
- Programm-Titel, Logos und Branding-Clutter im Header.

---

## [1.0.0] - 2026-08-24
- Initiale Version mit Sidebar-Layout, MarkItDown-Konvertierung und Obsidian-Vault-Ablage.
