# Versionskonzept (Semantic Versioning)

Dieses Projekt folgt dem Standard **Semantic Versioning 2.0.0** (`MAJOR.MINOR.PATCH`).

---

## 1. Schema-Definition

| Level | Format | Wann anwenden? | Beispiel |
| :--- | :--- | :--- | :--- |
| **MAJOR** | `X.0.0` | Fundamentale Redesigns, strukturelle Architekturänderungen (z. B. Wegfall der Sidebar, neues Theme-System), Breaking Changes | `1.0.0` &rarr; `2.0.0` |
| **MINOR** | `x.Y.0` | Neue Features, neue unterstützte Dateiformate, neue UI-Modi (z. B. Split-View) ohne bestehende Workflows zu brechen | `2.0.0` &rarr; `2.1.0` |
| **PATCH** | `x.y.Z` | Bugfixes, Dependency-Fixes (z. B. PDF-Engine Reparaturen), kleine CSS-Polituren, Performance-Optimierungen | `2.0.0` &rarr; `2.0.1` |

---

## 2. Verbindlicher Release-Workflow

Vor dem Erstellen eines neuen Windows Setup-Installers müssen immer folgende Schritte durchgeführt werden:

1. **Versions-Bump in `package.json`**:
   - Die Version unter dem Feld `"version"` exakt nach SemVer anpassen (z. B. `"2.0.0"`).
2. **Aktualisierung von `CHANGELOG.md`**:
   - Neuen Eintrag mit Datum und Versionsnummer anlegen.
   - Kategorien: `Added` (Hinzugefügt), `Changed` (Geändert), `Fixed` (Behoben), `Removed` (Entfernt).
3. **Erstellung des Installers**:
   - Befehl: `npm run dist:installer`
   - `electron-builder` generiert automatisch: `release/MarkItDown for Obsidian Setup <version>.exe`.
4. **Verifikation**:
   - Prüfen, dass der Dateiname im `release/`-Ordner exakt der neuen Version entspricht.
