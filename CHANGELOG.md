# Changelog

Alle relevanten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.
Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/) und folgt [Semantic Versioning](https://semver.org/lang/de/).

---

## [2.7.2] - 2026-09-04

### Fixed
- **Explorer-Kontextmenü konvertierte dieselbe Datei endlos**: Löste ein Rechtsklick → „Mit MarkItUI konvertieren" auf eine einzelne Datei mehrere `second-instance`-Events aus (oder wurde der Registry-Befehl aus anderem Grund mehrfach ausgelöst), reichte MarkItUI denselben Dateipfad jedes Mal erneut an die Warteschlange weiter und wandelte ihn wiederholt um – bei größeren PDFs konnte das durch die vielen parallel angestoßenen Python-Prozesse das Notebook überlasten/abstürzen lassen. Jeder von außen übergebene Dateipfad (Startargumente & second-instance) wird jetzt pro laufender Instanz nur noch ein einziges Mal weitergereicht.
- **PDF-Vorschau: zerstückelte Zeilen- und Wortabstände**: PDF-Engines liefern Text so, wie er auf der Seite umgebrochen war – jede sichtbare Zeile endete mit einem harten Zeilenumbruch. Da die Vorschau (`breaks: true`) jeden Zeilenumbruch als `<br>` rendert, wirkten importierte PDFs bisher wie eine Leiter aus lauter kurzen Zeilen. Weich umgebrochene Zeilen werden jetzt wieder zu Fliesstext zusammengeführt, Trennstriche am Zeilenende entfernt („Bei-\nspiel" → „Beispiel") und doppelte/unregelmäßige Leerzeichen sowie einzeln auseinandergezogene Buchstaben („W o r t") normalisiert – Überschriften, Listen und Leerzeilen bleiben dabei erhalten.

### Changed
- **PDF-Konvertierungskette smarter**: Schlagen zwei PDF-Engines übereinstimmend mit „keine Textebene gefunden" fehl (typisch für gescannte PDFs ohne OCR), bricht die Kette jetzt sofort mit einer klaren, konkreten Fehlermeldung ab, statt zusätzlich noch MarkItDown (lädt ein ML-Modell) und pdfminer erfolglos durchzuprobieren – spart Zeit und Arbeitsspeicher bei Scan-PDFs.

---

## [2.7.1] - 2026-09-02

### Fixed
- **Hauptverzeichnis im Zielordner-Picker**: Die Save-Bar setzte als Standardauswahl den Anzeigetext „/ (Hauptverzeichnis)“ statt des internen Leerpfads. Dadurch wurde der Wurzeleintrag im Ordner-Picker nicht als ausgewählt markiert und im Knopf stand „ (Hauptverzeichnis)“ mit führendem Leerzeichen.

---

## [2.7.0] - 2026-09-02

### Fixed
- **Absturz beim Umwandeln behoben (Hauptursache der Fehler auf anderen Notebooks)**: In der Dokumentenvorschau wurden React-Hooks (`useState`, `useMemo`) erst *nach* bedingten Returns aufgerufen. Beim Statuswechsel `wartend → konvertiert → fertig` änderte sich dadurch die Hook-Anzahl, React brach mit Fehler #310 („Rendered more hooks than during the previous render") ab und die Oberfläche wurde komplett leer. Alle Hooks stehen jetzt vor jedem Return.
- **Drag & Drop lieferte keine Dateipfade mehr**: Seit Electron 32 existiert `File.path` nicht mehr; abgelegte Dateien landeten mit blossem Dateinamen in der Warteschlange und schlugen mit „Datei existiert nicht" fehl. Die Pfade werden jetzt über `webUtils.getPathForFile()` ermittelt.
- **Kein Datenmüll mehr als „erfolgreich"**: Konnte keine Engine ein Binärformat lesen, wurde die Datei früher als Text dekodiert und als Ergebnis ausgegeben. Jetzt kommt eine klare Meldung mit den fehlenden Paketen.
- **Zerstörte Konverter-Antworten**: Ausgaben von Bibliotheken auf stdout (Warnungen von pdfminer & Co.) zerbrachen die JSON-Antwort des Workers. Die Antwort ist jetzt mit Markern eingerahmt, alle Fremdausgaben gehen auf stderr.
- **Doppelte Dateien und Endlosschleifen beim Start**: Der Initialisierungs-Effekt lief bei jeder Einstellungs- oder Auswahländerung erneut und hängte die Explorer-Dateien immer wieder an. Er läuft jetzt genau einmal; Startpfade werden nur einmal ausgeliefert.
- **Abstürze durch `ipcMain.handle`**: Die IPC-Handler wurden pro Fenster registriert und warfen beim zweiten Fenster einen Fehler. Registrierung erfolgt jetzt einmalig.
- **Pfad-Ausbrüche beim Speichern**: Unterordner und Export-Pfade mit `..` konnten ausserhalb von Vault bzw. Zielordner schreiben. Zielpfade werden jetzt geprüft und eingegrenzt.
- **XSS in der Vorschau**: Gerendertes Markdown wurde ungefiltert eingefügt. HTML aus konvertierten Dokumenten wird jetzt bereinigt (keine Skripte, keine Event-Handler, keine unsicheren URLs).
- **Blockierte Schriftarten & CSP**: Die Google-Fonts-Einbindung wurde von der Content-Security-Policy blockiert (und brauchte Internet). Die App nutzt jetzt Systemschriften; die CSP ist enger gefasst.
- **Ungültiges YAML-Frontmatter**: Titel mit Anführungszeichen erzeugten kaputte Metadaten – Werte werden jetzt korrekt escaped.
- **Kaputte Hilfsskripte**: `run_app.bat` verwies auf ein nicht vorhandenes `app/main.py`. Ausserdem wurden erzeugte Build-Artefakte (`vite.config.js`, `types.js/.d.ts`, `*.tsbuildinfo`) aus dem Repository entfernt – `vite.config.js` überschattete die echte `vite.config.ts`.

### Added
- **Warteschlange statt Parallelbetrieb**: Dokumente werden strikt nacheinander umgewandelt – im Renderer *und* im Main-Prozess (dort über eine serialisierte Prozesskette). Vorher startete jede abgelegte Datei sofort einen eigenen Python-Prozess, was Notebooks ausgebremst hat. Neu: Fortschrittsanzeige „x/y umgewandelt", Wartepositionen und ein Abbrechen-Knopf.
- **Vollautomatische Einrichtung – auch ohne vorhandenes Python**: Fehlt Python komplett, installiert MarkItUI es auf Wunsch selbst (winget im Benutzerkonto, ersatzweise Direkt-Download von python.org). Danach werden alle Pakete gruppenweise installiert, bei fehlenden Rechten automatisch mit `--user`.
- **Setup-Banner mit Live-Fortschritt**: Fehlen Voraussetzungen, erscheint direkt in der App eine Leiste mit „Jetzt automatisch einrichten" samt Fortschrittsbalken; anschliessend werden fehlgeschlagene Dateien automatisch neu eingereiht.
- **Absturzsichere Engine-Kette**: Bringt eine defekte native Bibliothek (z. B. beschädigtes `cryptography`/`cffi`) den Python-Prozess zum Absturz, erkennt MarkItUI die verursachende Engine, überspringt sie und wandelt mit der nächsten Engine um.
- **Eigener Python-Pfad in den Einstellungen**: Frei konfigurierbar, falls die automatische Erkennung nicht passt.
- **Neue Formate & bessere Ergebnisse**: `.xls` (über `xlrd`), `.xlsm`, `.tsv`, saubere HTML-Extraktion über BeautifulSoup, RTF-Bereinigung, Pipe-Escaping in Tabellen.

### Changed
- **Spezialisierte Engines zuerst**: PDF, Word, PowerPoint, Excel, CSV, HTML und Text laufen zuerst über die nativen Engines (bessere Tabellen und Notizen, deutlich schnellerer Start, da MarkItDown ein ML-Modell lädt). MarkItDown bleibt universeller Auffang-Konverter.
- **Python-Erkennung ohne Blockade**: Die Suche lief bisher bei *jeder* Konvertierung synchron und blockierte den Hauptprozess bis zu 3 Sekunden. Sie läuft jetzt asynchron, parallel und wird zwischengespeichert; gefunden wird die neueste passende Version (bevorzugt ≥ 3.10).
- **Zeitlimits & saubere Umgebung**: Jede Konvertierung hat ein Zeitlimit (wächst mit der Dateigrösse), fremde `PYTHONPATH`/`PYTHONHOME`-Einträge werden für Kindprozesse entfernt.
- **Ordner-Scans blockieren die Oberfläche nicht mehr** (asynchron, mit Tiefen- und Mengenbegrenzung).
- **Vollständige `requirements.txt`**: `markitdown` wird mit den nötigen Extras installiert (ohne sie kann es weder PDF noch Office-Dateien lesen), zusätzlich `python-docx` und `xlrd`.
- **Weniger Toast-Flut**: Bei Stapeln erscheinen maximal zwei Einzelfehler plus eine Zusammenfassung.

---

## [2.6.7] - 2026-08-25

### Added
- **Intelligente & dynamische Python-Erkennung**: Erkennt alle Python-Versionen (3.9 bis 3.14+) in `%LOCALAPPDATA%`, `C:\Program Files`, Conda, Pyenv und `py -3` automatisch; filtert fehlerhafte Microsoft Store WindowsApps-Stubs zuverlässig aus.
- **Multi-Engine Fallback-Architektur**: Unzerstörbare Konvertierungskette – falls MarkItDown fehlt oder bei einer Datei fehlschlägt, greifen automatisch spezialisierte Engines (`pdfplumber` & `pypdfium2` für PDF, `mammoth` & `python-docx` für Word, `python-pptx` für PowerPoint, `openpyxl` & CSV-Parser für Tabellen, Multi-Encoding-Reader für Textdateien).
- **In-App Python & Konverter Doctor**: Neuer Diagnosebereich in den Einstellungen zur Live-Prüfung aller Voraussetzungen und Anzeige des erkannten Python-Pfades.
- **1-Klick Voraussetzungen reparieren & installieren**: Direkte Hintergrund-Installation aller benötigten Python-Pakete per Klick in den Einstellungen sowie direkt im Fehlerfenster.
- **Terminal-Setup-Skripte & Befehle**: Bereitstellung von `install_requirements.bat` (inkl. automatischer Python-Installation via `winget` bei Neugeräten), `install_requirements.ps1` für PowerShell sowie `npm run setup:python`.
- **Terminal-Befehl-Kopierfunktion**: 1-Klick Kopieren des vollständigen Pip-Befehls in die Zwischenablage.

### Fixed
- **Paket-Auflösung in requirements.txt**: Beseitigung von restriktiven Pins und Konflikten bei `youtube-transcript-api` und `markitdown[all]`, wodurch Pip auf neuen Notebooks fehlschlagen konnte.
- **Bündelung der Setup-Ressourcen**: `install_requirements.bat`, `install_requirements.ps1` und `requirements.txt` werden nun direkt im Windows Setup-Installer (`$INSTDIR`) mitgeliefert.

---

## [2.6.0] - 2026-08-24

### Added
- **Windows Explorer Kontextmenü für Dateien**: Rechtsklick auf beliebige Dokumente (`.pdf`, `.docx`, `.pptx`, `.xlsx`, `.csv` etc.) &rarr; *„Mit MarkItUI konvertieren“* öffnet oder fokussiert MarkItUI und startet sofort die Umwandlung.
- **Windows Explorer Kontextmenü für Ordner**: Rechtsklick auf Ordner &rarr; *„Ordner mit MarkItUI umwandeln“* scannt den gesamten Ordner rekursiv nach Dokumenten.
- **Ordner-Unzip & Batch-Export**: Neuer 1-Klick-Export-Button („Alle exportieren / Entpacken“) für Datei-Queues und Ordner, um alle konvertierten Markdown-Notizen inklusive Unterordnerstruktur in ein Zielverzeichnis zu exportieren.
- **Single-Instance Lock**: Bei wiederholtem Öffnen via Explorer wird die bestehende Instanz in den Vordergrund geholt.
- **Schnellwechsel für Vaults in der Save-Bar**: Im Zielordner-Dropdown (`FolderTreePicker`) wird der aktive Vault angezeigt und ein neuer Schnellzugriff *„Vault-Pfad anpassen...“* ermöglicht den sofortigen Vault-Wechsel.
- **Echtzeit-Vault-Erkennung**: Prüft den eingegebenen Pfad live auf `.obsidian` und gibt sofort optisches Feedback.

### Changed
- **Sanfter Text-Auslauf (Fade-Mask)**: Der Text im Dokumenten-Viewport und Editor blendet am oberen Rand sowie über der schwebenden Save-Bar harmonisch und weich über CSS-Gradientenmasken (`mask-image: linear-gradient`) ins Dunkle aus.
- **Verbreiterte & ergonomische Save-Bar**: Das Dateinamen-Eingabefeld wurde auf `280px–500px` vergrößert, damit lange Titel nicht abgeschnitten werden.
- **Nahtloser & transparenter Header**: Redundantes Software-Logo und Titel im Header wurden entfernt; die Menüleiste ist nun vollständig transparent und nahtlos integriert.
- **Unbeschränkte Vault-Pfadlänge**: Das Vault-Eingabefeld in den Einstellungen wurde auf 560px verbreitert, unterstützt beliebig lange Pfade und bereinigt Anführungszeichen beim Einfügen automatisch.
- **Windows Startmenü- & Taskleisten-Icon**: Native Einbettung des hochauflösenden `build/icon.ico` in die Windows PE-Ressourcen der `MarkItUI.exe`.

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
