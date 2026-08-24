# Build- und Bereitstellungsregeln

1. **Ausschließlich Windows Installer bereitstellen**:
   - Für Releases und Builds IMMER einen Windows Installer (.exe über NSIS: `npm run dist:installer`) erstellen und dem Benutzer anbieten.
   - NIEMALS eine Portable/Unpacked-Version anbieten oder als primäres Ergebnis übergeben.
   - Der Installer befindet sich unter `release/MarkItDown for Obsidian Setup <version>.exe`.
