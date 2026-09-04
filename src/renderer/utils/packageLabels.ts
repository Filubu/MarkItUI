/**
 * Übersetzt technische Python-Paketnamen in verständliche Format-Bezeichnungen.
 *
 * Die rohe Paketliste (z. B. "pdfplumber, pypdfium2, pdfminer.six, mammoth, ...")
 * ist für Endnutzer:innen ohne Python-Kenntnisse reiner Fachjargon. Diese Funktion
 * fasst sie stattdessen zu den betroffenen Dateiformaten zusammen (z. B.
 * "PDF, Word und Excel"), damit auf einen Blick klar ist, was gerade fehlt.
 */

const PACKAGE_TO_FORMAT: Record<string, string> = {
  markitdown: 'MarkItDown-Kernmodul',
  pdfplumber: 'PDF',
  pypdfium2: 'PDF',
  'pdfminer.six': 'PDF',
  mammoth: 'Word',
  'python-docx': 'Word',
  'python-pptx': 'PowerPoint',
  openpyxl: 'Excel',
  xlrd: 'Excel (alte .xls-Dateien)',
  beautifulsoup4: 'HTML',
  markdown: 'Formatierung',
  pygments: 'Formatierung',
  puremagic: 'Formatierung'
};

/** Reihenfolge, in der Formate in der Zusammenfassung erscheinen sollen. */
const FORMAT_PRIORITY = [
  'MarkItDown-Kernmodul',
  'PDF',
  'Word',
  'PowerPoint',
  'Excel',
  'Excel (alte .xls-Dateien)',
  'HTML',
  'Formatierung'
];

/**
 * Fasst eine Liste fehlender Pip-Pakete zu einer kurzen, verständlichen
 * Formatliste zusammen, z. B. ["pdfplumber", "mammoth", "openpyxl"] -> "PDF, Word und Excel".
 * Unbekannte Pakete werden unverändert (als Rohname) angehängt, damit nichts verloren geht.
 */
export function summarizeMissingPackages(packages: string[]): string {
  if (!packages || packages.length === 0) return '';

  const formats = new Set<string>();
  for (const pkg of packages) {
    // Versions-/Extras-Suffixe abschneiden ("markitdown[docx,pdf]>=0.1.0" -> "markitdown").
    const bareName = pkg.split(/[[>=<]/)[0].trim();
    formats.add(PACKAGE_TO_FORMAT[bareName] || bareName);
  }

  const ordered = [
    ...FORMAT_PRIORITY.filter((f) => formats.has(f)),
    ...[...formats].filter((f) => !FORMAT_PRIORITY.includes(f))
  ];

  if (ordered.length === 1) return ordered[0];
  if (ordered.length === 2) return `${ordered[0]} und ${ordered[1]}`;
  return `${ordered.slice(0, -1).join(', ')} und ${ordered[ordered.length - 1]}`;
}
