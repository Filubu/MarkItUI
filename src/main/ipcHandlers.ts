import { ipcMain, dialog, shell, app, BrowserWindow, IpcMainInvokeEvent } from 'electron';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { ConverterBridge } from './converterBridge';
import {
  AppSettings,
  ConversionRequest,
  SaveNoteRequest,
  FolderTreeNode,
  VaultRouting,
  ScannedFileItem,
  BatchExportItem,
  InstallProgressEvent
} from '../shared/types';

const DEFAULT_SETTINGS: AppSettings = {
  vaultPath: '',
  defaultSubfolder: '',
  addFrontmatter: true,
  defaultTags: ['schule', 'itslearning'],
  autoOpenObsidian: false,
  autoConvertOnDrop: true
};

/** Ordner, die beim Scannen grundsätzlich übersprungen werden. */
const IGNORED_DIRS = new Set([
  '.obsidian',
  '.trash',
  '.git',
  '.idea',
  '.vscode',
  'node_modules',
  '$RECYCLE.BIN',
  'System Volume Information',
  '__pycache__'
]);

const SUPPORTED_EXTENSIONS = new Set([
  '.pdf', '.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls', '.xlsm',
  '.csv', '.tsv', '.txt', '.html', '.htm', '.rtf', '.epub', '.xml', '.json', '.md'
]);

/** Schutz vor Endlos-Scans in riesigen Verzeichnisbäumen. */
const MAX_SCAN_DEPTH = 12;
const MAX_SCAN_FILES = 5000;

let cachedSettings: AppSettings | null = null;

function getConfigPath(): string {
  const portableConfig = path.join(path.dirname(app.getPath('exe')), 'config.json');
  if (fs.existsSync(portableConfig)) {
    return portableConfig;
  }
  const userDataDir = app.getPath('userData');
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }
  return path.join(userDataDir, 'config.json');
}

function loadSettings(): AppSettings {
  if (cachedSettings) return cachedSettings;
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(data);
      cachedSettings = { ...DEFAULT_SETTINGS, ...parsed };
      return cachedSettings!;
    }
  } catch (err) {
    console.error('[Settings] Fehler beim Laden:', err);
  }
  cachedSettings = { ...DEFAULT_SETTINGS };
  return cachedSettings;
}

function saveSettingsToDisk(settings: AppSettings): boolean {
  try {
    const configPath = getConfigPath();
    fs.writeFileSync(configPath, JSON.stringify(settings, null, 2), 'utf-8');
    cachedSettings = { ...DEFAULT_SETTINGS, ...settings };
    return true;
  } catch (err) {
    console.error('[Settings] Fehler beim Speichern:', err);
    return false;
  }
}

/** Entfernt unter Windows verbotene Zeichen und begrenzt die Länge. */
function sanitizeFileName(name: string): string {
  let clean = (name || '')
    .replace(/[\\/:*?"<>|#^[\]]/g, '_')
    // Steuerzeichen sind in Windows-Dateinamen nicht erlaubt
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim();
  clean = clean.replace(/^\.+/, '').replace(/[. ]+$/, '');

  // Reservierte Windows-Gerätenamen (CON, PRN, AUX, NUL, COM1..9, LPT1..9)
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(clean)) {
    clean = `_${clean}`;
  }

  if (!clean) clean = 'Unbenannte_Notiz';

  if (!clean.toLowerCase().endsWith('.md')) {
    clean += '.md';
  }

  // Windows: max. 255 Zeichen pro Dateiname
  if (clean.length > 200) {
    clean = `${clean.slice(0, 196)}.md`;
  }
  return clean;
}

/**
 * Verhindert Pfad-Ausbrüche (".." oder absolute Pfade) beim Speichern in Vault/Export-Ordner.
 * Gibt den bereinigten absoluten Zielordner zurück oder null bei einem Ausbruchsversuch.
 */
function resolveInsideBase(baseDir: string, relative: string): string | null {
  const cleanRelative = (relative || '')
    .replace(/^[/\\]+/, '')
    .split(/[/\\]+/)
    .filter((segment) => segment && segment !== '.' && segment !== '..')
    .join(path.sep);

  const resolvedBase = path.resolve(baseDir);
  const resolved = path.resolve(resolvedBase, cleanRelative);

  if (resolved !== resolvedBase && !resolved.startsWith(resolvedBase + path.sep)) {
    return null;
  }
  return resolved;
}

/** Rekursiver, asynchroner Verzeichnis-Scan (blockiert den Main-Prozess nicht). */
async function scanDirectory(
  dirPath: string,
  rootDir: string,
  results: ScannedFileItem[],
  depth = 0
): Promise<void> {
  if (depth > MAX_SCAN_DEPTH || results.length >= MAX_SCAN_FILES) return;

  let entries;
  try {
    entries = await fsp.readdir(dirPath, { withFileTypes: true });
  } catch (err) {
    console.error('[Scanner] Verzeichnis nicht lesbar:', dirPath, err);
    return;
  }

  for (const entry of entries) {
    if (results.length >= MAX_SCAN_FILES) return;
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || IGNORED_DIRS.has(entry.name)) continue;
      await scanDirectory(fullPath, rootDir, results, depth + 1);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(ext)) continue;
      try {
        const stat = await fsp.stat(fullPath);
        results.push({
          path: fullPath,
          name: entry.name,
          relativePath: path.relative(rootDir, fullPath),
          size: stat.size,
          extension: ext
        });
      } catch {
        /* Datei verschwunden oder gesperrt */
      }
    }
  }
}

/** Asynchrone Vault-Baum-Erstellung. */
async function buildFolderTree(dir: string, relPath: string, depth: number): Promise<FolderTreeNode[]> {
  if (depth > 5) return [];
  const nodes: FolderTreeNode[] = [];

  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.') || IGNORED_DIRS.has(entry.name)) continue;
      const entryRel = relPath ? `${relPath}/${entry.name}` : entry.name;
      const children = await buildFolderTree(path.join(dir, entry.name), entryRel, depth + 1);
      nodes.push({ name: entry.name, path: entryRel, children });
    }
    nodes.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  } catch (err) {
    console.error('[Vault Tree] Fehler:', err);
  }
  return nodes;
}

let handlersRegistered = false;

export function registerIpcHandlers(getMainWindow: () => BrowserWindow | null) {
  // ipcMain.handle wirft beim zweiten Aufruf – Handler nur einmal registrieren.
  if (handlersRegistered) return;
  handlersRegistered = true;

  const senderWindow = (event: IpcMainInvokeEvent): BrowserWindow | null =>
    BrowserWindow.fromWebContents(event.sender) || getMainWindow();

  const sendProgress = (event: IpcMainInvokeEvent) => (progress: InstallProgressEvent) => {
    if (!event.sender.isDestroyed()) {
      event.sender.send('install-progress', progress);
    }
  };

  // ------------------------------------------------------------------ Konvertierung
  ipcMain.handle('convert-document', async (_event, req: ConversionRequest) => {
    const settings = loadSettings();
    return ConverterBridge.convert(req, settings.customPythonPath);
  });

  // ------------------------------------------------------- Python-Umgebung & Setup
  ipcMain.handle('check-python-environment', async (_event, customPath?: string) => {
    const settings = loadSettings();
    return ConverterBridge.checkEnvironment(customPath || settings.customPythonPath, true);
  });

  ipcMain.handle('install-python-requirements', async (event, customPath?: string) => {
    const settings = loadSettings();
    return ConverterBridge.installRequirements(customPath || settings.customPythonPath, sendProgress(event));
  });

  ipcMain.handle('ensure-python-installed', async (event) => {
    const settings = loadSettings();
    return ConverterBridge.ensurePython(settings.customPythonPath, sendProgress(event));
  });

  ipcMain.handle('open-setup-script', async () => ConverterBridge.openSetupScript());

  // --------------------------------------------------------------------- Dialoge
  ipcMain.handle('select-files', async (event) => {
    const win = senderWindow(event);
    const options: Electron.OpenDialogOptions = {
      title: 'Dokumente auswählen',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Unterstützte Dokumente',
          extensions: ['pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls', 'csv', 'txt', 'html', 'htm', 'xml', 'json', 'md', 'rtf', 'epub']
        },
        { name: 'PDF Dokumente (*.pdf)', extensions: ['pdf'] },
        { name: 'Word Dokumente (*.docx)', extensions: ['docx', 'doc'] },
        { name: 'PowerPoint Präsentationen (*.pptx)', extensions: ['pptx', 'ppt'] },
        { name: 'Excel Tabellen (*.xlsx, *.csv)', extensions: ['xlsx', 'xls', 'csv'] },
        { name: 'Alle Dateien (*.*)', extensions: ['*'] }
      ]
    };
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    return result.canceled ? [] : result.filePaths;
  });

  ipcMain.handle('select-directory', async (event, title?: string) => {
    const win = senderWindow(event);
    const options: Electron.OpenDialogOptions = {
      title: title || 'Obsidian Vault Ordner auswählen',
      properties: ['openDirectory', 'createDirectory']
    };
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
  });

  ipcMain.handle('save-file-dialog', async (event, defaultFileName: string, defaultPath?: string) => {
    const win = senderWindow(event);
    const cleanName = sanitizeFileName(defaultFileName);
    const options: Electron.SaveDialogOptions = {
      title: 'Markdown-Datei speichern',
      defaultPath: defaultPath ? path.join(defaultPath, cleanName) : cleanName,
      filters: [{ name: 'Markdown Datei (*.md)', extensions: ['md'] }]
    };
    const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options);
    return result.canceled ? null : result.filePath;
  });

  // ---------------------------------------------------------------------- Vault
  ipcMain.handle('get-vault-subfolders', async (_event, vaultPath: string) => {
    const root = ['/ (Hauptverzeichnis)'];
    if (!vaultPath || !fs.existsSync(vaultPath)) return root;

    const tree = await buildFolderTree(vaultPath, '', 1);
    const flat: string[] = [];
    const walk = (nodes: FolderTreeNode[]) => {
      for (const node of nodes) {
        flat.push(node.path);
        walk(node.children);
      }
    };
    walk(tree);
    flat.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return [...root, ...flat];
  });

  ipcMain.handle('get-vault-folder-tree', async (_event, vaultPath: string): Promise<FolderTreeNode[]> => {
    if (!vaultPath || !fs.existsSync(vaultPath)) return [];
    return buildFolderTree(vaultPath, '', 1);
  });

  ipcMain.handle('check-is-obsidian-vault', async (_event, vaultPath: string): Promise<boolean> => {
    if (!vaultPath) return false;
    try {
      return fs.existsSync(path.join(vaultPath, '.obsidian'));
    } catch {
      return false;
    }
  });

  ipcMain.handle('get-vault-routing', async (_event, vaultPath: string): Promise<VaultRouting | null> => {
    if (!vaultPath) return null;
    const candidates = [
      path.join(vaultPath, '.markitui-routing.json'),
      path.join(vaultPath, '.markitdown-routing.json')
    ];
    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate)) {
          return JSON.parse(await fsp.readFile(candidate, 'utf-8')) as VaultRouting;
        }
      } catch (err) {
        console.error('[Vault Routing] Fehler beim Lesen:', err);
      }
    }
    return null;
  });

  ipcMain.handle('save-vault-routing', async (_event, vaultPath: string, routing: VaultRouting): Promise<boolean> => {
    if (!vaultPath) return false;
    try {
      await fsp.writeFile(path.join(vaultPath, '.markitui-routing.json'), JSON.stringify(routing, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[Vault Routing] Fehler beim Speichern:', err);
      return false;
    }
  });

  // -------------------------------------------------------------------- Speichern
  ipcMain.handle('save-note', async (_event, req: SaveNoteRequest) => {
    try {
      if (!req.vaultPath || !fs.existsSync(req.vaultPath)) {
        return { success: false, error: 'Vault-Pfad existiert nicht oder ist nicht konfiguriert.' };
      }

      let subfolder = req.subfolder || '';
      if (subfolder === '/' || subfolder === '/ (Hauptverzeichnis)') subfolder = '';

      const targetDir = resolveInsideBase(req.vaultPath, subfolder);
      if (!targetDir) {
        return { success: false, error: 'Ungültiger Zielordner innerhalb des Vaults.' };
      }

      await fsp.mkdir(targetDir, { recursive: true });

      const fullPath = path.join(targetDir, sanitizeFileName(req.fileName));
      await fsp.writeFile(fullPath, req.content, 'utf-8');
      return { success: true, savedPath: fullPath };
    } catch (err: any) {
      return { success: false, error: err.message || 'Fehler beim Speichern der Notiz.' };
    }
  });

  ipcMain.handle('save-custom-note', async (_event, filePath: string, content: string) => {
    try {
      if (!filePath) return { success: false, error: 'Kein Zielpfad angegeben.' };
      await fsp.mkdir(path.dirname(filePath), { recursive: true });
      await fsp.writeFile(filePath, content, 'utf-8');
      return { success: true, savedPath: filePath };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('open-in-obsidian', async (_event, vaultPath: string, filePath: string) => {
    try {
      if (vaultPath && filePath.startsWith(vaultPath)) {
        const vaultName = path.basename(vaultPath);
        const relPath = path.relative(vaultPath, filePath).replace(/\\/g, '/');
        const uri = `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(relPath)}`;
        await shell.openExternal(uri);
        return true;
      }
      await shell.openPath(filePath);
      return true;
    } catch {
      try {
        await shell.openPath(filePath);
        return true;
      } catch {
        return false;
      }
    }
  });

  ipcMain.handle('open-in-explorer', async (_event, filePath: string) => {
    try {
      shell.showItemInFolder(filePath);
      return true;
    } catch {
      return false;
    }
  });

  // ------------------------------------------------------------------ Einstellungen
  ipcMain.handle('get-settings', async () => loadSettings());

  ipcMain.handle('save-settings', async (_event, settings: AppSettings) => saveSettingsToDisk(settings));

  // ------------------------------------------------------- Explorer / CLI-Übergabe
  ipcMain.handle('get-initial-paths', async () => {
    // Nur einmal ausliefern, sonst werden die Dateien bei jedem Neuladen erneut angehängt.
    const paths = initialCliPaths;
    initialCliPaths = [];
    return paths;
  });

  ipcMain.handle('scan-paths', async (_event, rawPaths: string[]): Promise<ScannedFileItem[]> => {
    const results: ScannedFileItem[] = [];
    if (!Array.isArray(rawPaths)) return results;

    for (const p of rawPaths) {
      if (!p || results.length >= MAX_SCAN_FILES) continue;
      try {
        const stat = await fsp.stat(p);
        if (stat.isDirectory()) {
          await scanDirectory(p, p, results);
        } else if (stat.isFile()) {
          results.push({
            path: p,
            name: path.basename(p),
            relativePath: path.basename(p),
            size: stat.size,
            extension: path.extname(p).toLowerCase()
          });
        }
      } catch (err) {
        console.error('[ScanPaths] Nicht lesbar:', p, err);
      }
    }
    return results;
  });

  // ----------------------------------------------------------------- Batch-Export
  ipcMain.handle('batch-export', async (_event, targetDir: string, items: BatchExportItem[]) => {
    if (!targetDir || !fs.existsSync(targetDir)) {
      return { success: false, exportedCount: 0, error: 'Ungültiger Zielordner' };
    }

    let count = 0;
    const failed: string[] = [];

    try {
      for (const item of items || []) {
        if (!item || !item.content) continue;

        let subDir = path.resolve(targetDir);
        if (item.relativePath) {
          const relDir = path.dirname(item.relativePath);
          if (relDir && relDir !== '.') {
            const resolved = resolveInsideBase(targetDir, relDir);
            if (!resolved) {
              failed.push(item.fileName);
              continue;
            }
            subDir = resolved;
            await fsp.mkdir(subDir, { recursive: true });
          }
        }

        try {
          await fsp.writeFile(path.join(subDir, sanitizeFileName(item.fileName)), item.content, 'utf-8');
          count++;
        } catch (err) {
          console.error('[BatchExport] Datei fehlgeschlagen:', item.fileName, err);
          failed.push(item.fileName);
        }
      }

      return {
        success: failed.length === 0,
        exportedCount: count,
        targetDir,
        error: failed.length > 0 ? `Nicht exportiert: ${failed.join(', ')}` : undefined
      };
    } catch (err: any) {
      console.error('[BatchExport] Fehler:', err);
      return { success: false, exportedCount: count, error: err.message };
    }
  });
}

let initialCliPaths: string[] = [];

export function setInitialCliPaths(paths: string[]) {
  initialCliPaths = paths;
}

/** Ergänzt Pfade, die eintreffen, bevor das Fenster bereit ist. */
export function appendInitialCliPaths(paths: string[]) {
  initialCliPaths = [...initialCliPaths, ...paths];
}
