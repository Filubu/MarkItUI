# Workspace Rules for MarkItUI

- **Windows Installer Pflicht**: Es soll immer ausschließlich ein Windows Setup-Installer (.exe via NSIS / `npm run dist:installer`) generiert und bereitgestellt werden, keine Portable-Version.
- **Versionskonzept & SemVer**: Bei jedem Release / Redesign / Bugfix muss die Version in `package.json` und `CHANGELOG.md` gemäß Semantic Versioning (`MAJOR.MINOR.PATCH`) erhöht werden. Der Installer trägt immer die exakte neue Version im Dateinamen. Details siehe `VERSIONING.md`.
- **Design-System**: Striktes Schwarz-Weiß / Monochrom (Obsidian Ethereal laut `DESIGN.md`), keine bunten Akzentfarben oder bunten Icons.
- **Minimalismus**: Keine Sidebar-Navigation, kein Branding/Logo-Clutter, minimale Texte.
