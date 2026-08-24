# Versionierungs- und Release-Regel

1. **Semantic Versioning Pflicht**:
   - Bei jeder Änderung, neuem Feature oder Bugfix muss die Versionsnummer in `package.json` gemäß SemVer (`MAJOR.MINOR.PATCH`) erhöht werden.
   - `MAJOR` (`X.0.0`): Redesigns, strukturelle Architekturänderungen, Wegfall von UI-Modulen.
   - `MINOR` (`x.Y.0`): Neue Features, neue Dateiformate, neue UI-Modi.
   - `PATCH` (`x.y.Z`): Bugfixes, Dependency-Updates, CSS-/Styling-Politur.

2. **Changelog-Pflege**:
   - Vor jedem Build muss der Eintrag in `CHANGELOG.md` mit Datum und Version aktualisiert werden.

3. **Build & Bereitstellung**:
   - Nach dem Versions-Bump wird immer der Windows Installer via `npm run dist:installer` erzeugt (`release/MarkItDown for Obsidian Setup <version>.exe`).
   - Die erzeugte Versions-Nummer muss im Setup-Dateinamen und in der Antwort an den Benutzer immer explizit ausgewiesen sein.
