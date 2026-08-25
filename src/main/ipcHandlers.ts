import { ipcMain, dialog, shell, app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { ConverterBridge } from './converterBridge';
import { AppSettings, ConversionRequest, SaveNoteRequest, FolderTreeNode, VaultRouting } from '../shared/types';

const DEFAULT_SETTINGS: AppSettings = {
  vaultPath: '',
  defaultSubfolder: '',
  addFrontmatter: true,
  defaultTags: ['schule', 'itslearning'],
  autoOpenObsidian: false,
  autoConvertOnDrop: true
};

function getConfigPath(): string {
  const portableConfig = path.join(path.dirname(app.getPath('exe')), 'config.json');
  if (fs.existsSync(portableConfig)) {
    return portableConfig;
  }
  const userDataDir = path.join(app.getPath('userData'));
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }
  return path.join(userDataDir, 'config.json');
}

function loadSettings(): AppSettings {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('[Settings] Fehler beim Laden:', err);
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettingsToDisk(settings: AppSettings): boolean {
  try {
    const configPath = getConfigPath();
    fs.writeFileSync(configPath, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[Settings] Fehler beim Speichern:', err);
    return false;
  }
}

function sanitizeFileName(name: string): string {
  let clean = name.replace(/[\\/:*?"<>|#\^\[\]]/g, '_').trim();
  clean = clean.replace(/^\.+/, '');
  if (!clean) clean = 'Unbenannte_Notiz';
  if (!clean.toLowerCase().endsWith('.md')) {
    clean += '.md';
  }
  return clean;
}

export function registerIpcHandlers(mainWindow: BrowserWindow) {
  // Conversion Handler
  ipcMain.handle('convert-document', async (_event, req: ConversionRequest) => {
    const settings = loadSettings();
    return await ConverterBridge.convert(req, settings.customPythonPath);
  });

  // Python Environment & Doctor Handlers
  ipcMain.handle('check-python-environment', async (_event, customPath?: string) => {
    const settings = loadSettings();
    return await ConverterBridge.checkEnvironment(customPath || settings.customPythonPath);
  });

  ipcMain.handle('install-python-requirements', async (_event, customPath?: string) => {
    const settings = loadSettings();
    return await ConverterBridge.installRequirements(customPath || settings.customPythonPath);
  });

  ipcMain.handle('open-setup-script', async () => {
    return await ConverterBridge.openSetupScript();
  });

  // Dialog: Select Files
  ipcMain.handle('select-files', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Schulunterlagen auswählen',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Unterstützte Dokumente',
          extensions: ['docx', 'doc', 'pdf', 'pptx', 'ppt', 'xlsx', 'xls', 'csv', 'html', 'xml', 'txt', 'jpg', 'png']
        },
        { name: 'Word Dokumente (*.docx)', extensions: ['docx', 'doc'] },
        { name: 'PDF Dokumente (*.pdf)', extensions: ['pdf'] },
        { name: 'PowerPoint Präsentationen (*.pptx)', extensions: ['pptx', 'ppt'] },
        { name: 'Excel Tabellen (*.xlsx, *.csv)', extensions: ['xlsx', 'xls', 'csv'] },
        { name: 'Alle Dateien (*.*)', extensions: ['*'] }
      ]
    });
    return result.canceled ? [] : result.filePaths;
  });

  // Dialog: Select Directory (e.g. Vault)
  ipcMain.handle('select-directory', async (_event, title?: string) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: title || 'Obsidian Vault Ordner auswählen',
      properties: ['openDirectory', 'createDirectory']
    });
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
  });

  // Dialog: Save File
  ipcMain.handle('save-file-dialog', async (_event, defaultFileName: string, defaultPath?: string) => {
    const cleanName = sanitizeFileName(defaultFileName);
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Markdown-Datei speichern',
      defaultPath: defaultPath ? path.join(defaultPath, cleanName) : cleanName,
      filters: [{ name: 'Markdown Datei (*.md)', extensions: ['md'] }]
    });
    return result.canceled ? null : result.filePath;
  });

  // Vault Subfolders Scanner
  ipcMain.handle('get-vault-subfolders', async (_event, vaultPath: string) => {
    if (!vaultPath || !fs.existsSync(vaultPath)) {
      return ['/ (Hauptverzeichnis)'];
    }

    const ignored = new Set(['.obsidian', '.trash', '.git', '.idea', '.vscode', 'node_modules', '$RECYCLE.BIN']);
    const folders: string[] = ['/ (Hauptverzeichnis)'];

    function scan(dir: string, rel: string, depth: number) {
      if (depth > 4) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && !ignored.has(entry.name) && !entry.name.startsWith('.')) {
            const entryRel = rel ? `${rel}/${entry.name}` : entry.name;
            folders.push(entryRel);
            scan(path.join(dir, entry.name), entryRel, depth + 1);
          }
        }
      } catch (err) {
        console.error('[Vault Scanner] Error:', err);
      }
    }

    try {
      scan(vaultPath, '', 1);
      const sub = folders.slice(1).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      return ['/ (Hauptverzeichnis)', ...sub];
    } catch (e) {
      return ['/ (Hauptverzeichnis)'];
    }
  });

  // Save Note in Vault
  ipcMain.handle('save-note', async (_event, req: SaveNoteRequest) => {
    try {
      if (!req.vaultPath || !fs.existsSync(req.vaultPath)) {
        return { success: false, error: 'Vault-Pfad existiert nicht oder ist nicht konfiguriert.' };
      }

      let targetDir = req.vaultPath;
      if (req.subfolder && req.subfolder !== '/' && req.subfolder !== '/ (Hauptverzeichnis)') {
        const cleanSub = req.subfolder.replace(/^\/+/, '');
        targetDir = path.join(req.vaultPath, cleanSub);
      }

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const fileName = sanitizeFileName(req.fileName);
      const fullPath = path.join(targetDir, fileName);

      fs.writeFileSync(fullPath, req.content, 'utf-8');
      return { success: true, savedPath: fullPath };
    } catch (err: any) {
      return { success: false, error: err.message || 'Fehler beim Speichern der Notiz.' };
    }
  });

  // Save Custom Note (arbitrary file path)
  ipcMain.handle('save-custom-note', async (_event, filePath: string, content: string) => {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true, savedPath: filePath };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Open in Obsidian
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
    } catch (e) {
      await shell.openPath(filePath);
      return true;
    }
  });

  // Open in Explorer
  ipcMain.handle('open-in-explorer', async (_event, filePath: string) => {
    try {
      shell.showItemInFolder(filePath);
      return true;
    } catch {
      return false;
    }
  });

  // Vault Folder Tree (hierarchical)
  ipcMain.handle('get-vault-folder-tree', async (_event, vaultPath: string): Promise<FolderTreeNode[]> => {
    if (!vaultPath || !fs.existsSync(vaultPath)) {
      return [];
    }

    const ignored = new Set(['.obsidian', '.trash', '.git', '.idea', '.vscode', 'node_modules', '$RECYCLE.BIN']);

    function buildTree(dir: string, relPath: string, depth: number): FolderTreeNode[] {
      if (depth > 5) return [];
      const nodes: FolderTreeNode[] = [];
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && !ignored.has(entry.name) && !entry.name.startsWith('.')) {
            const entryRel = relPath ? `${relPath}/${entry.name}` : entry.name;
            const children = buildTree(path.join(dir, entry.name), entryRel, depth + 1);
            nodes.push({ name: entry.name, path: entryRel, children });
          }
        }
        nodes.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      } catch (err) {
        console.error('[Vault Tree] Error:', err);
      }
      return nodes;
    }

    return buildTree(vaultPath, '', 1);
  });

  // Check if directory is an Obsidian Vault
  ipcMain.handle('check-is-obsidian-vault', async (_event, vaultPath: string): Promise<boolean> => {
    if (!vaultPath) return false;
    try {
      return fs.existsSync(path.join(vaultPath, '.obsidian'));
    } catch {
      return false;
    }
  });

  // Read .markitui-routing.json (or fallback .markitdown-routing.json) from vault root
  ipcMain.handle('get-vault-routing', async (_event, vaultPath: string): Promise<VaultRouting | null> => {
    if (!vaultPath) return null;
    const newRoutingPath = path.join(vaultPath, '.markitui-routing.json');
    const legacyRoutingPath = path.join(vaultPath, '.markitdown-routing.json');
    try {
      if (fs.existsSync(newRoutingPath)) {
        const data = fs.readFileSync(newRoutingPath, 'utf-8');
        return JSON.parse(data) as VaultRouting;
      }
      if (fs.existsSync(legacyRoutingPath)) {
        const data = fs.readFileSync(legacyRoutingPath, 'utf-8');
        return JSON.parse(data) as VaultRouting;
      }
    } catch (err) {
      console.error('[Vault Routing] Fehler beim Lesen:', err);
    }
    return null;
  });

  // Save .markitui-routing.json to vault root (human-readable format)
  ipcMain.handle('save-vault-routing', async (_event, vaultPath: string, routing: VaultRouting): Promise<boolean> => {
    if (!vaultPath) return false;
    const routingPath = path.join(vaultPath, '.markitui-routing.json');
    try {
      fs.writeFileSync(routingPath, JSON.stringify(routing, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[Vault Routing] Fehler beim Speichern:', err);
      return false;
    }
  });

  // Settings
  ipcMain.handle('get-settings', async () => {
    return loadSettings();
  });

  ipcMain.handle('save-settings', async (_event, settings: AppSettings) => {
    return saveSettingsToDisk(settings);
  });

  // Initial CLI / Explorer Paths
  ipcMain.handle('get-initial-paths', async () => {
    return initialCliPaths;
  });

  // Path scanner (recursive for directories, flat for files)
  ipcMain.handle('scan-paths', async (_event, rawPaths: string[]) => {
    const results: any[] = [];
    const SUPPORTED_EXTENSIONS = new Set([
      '.pdf', '.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls',
      '.csv', '.txt', '.html', '.htm', '.rtf', '.epub', '.xml', '.json', '.md'
    ]);

    function scanDir(dirPath: string, rootDir: string) {
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
            scanDir(fullPath, rootDir);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (SUPPORTED_EXTENSIONS.has(ext)) {
              const stat = fs.statSync(fullPath);
              const rel = path.relative(rootDir, fullPath);
              results.push({
                path: fullPath,
                name: entry.name,
                relativePath: rel,
                size: stat.size,
                extension: ext
              });
            }
          }
        }
      } catch (err) {
        console.error('[Scanner] Fehler beim Scannen von', dirPath, err);
      }
    }

    for (const p of rawPaths) {
      if (!fs.existsSync(p)) continue;
      try {
        const stat = fs.statSync(p);
        if (stat.isDirectory()) {
          scanDir(p, p);
        } else if (stat.isFile()) {
          const ext = path.extname(p).toLowerCase();
          results.push({
            path: p,
            name: path.basename(p),
            relativePath: path.basename(p),
            size: stat.size,
            extension: ext
          });
        }
      } catch (err) {
        console.error('[ScanPaths] Fehler bei:', p, err);
      }
    }
    return results;
  });

  // Batch Export (Unzip all converted Markdown files to target folder)
  ipcMain.handle('batch-export', async (_event, targetDir: string, items: any[]) => {
    if (!targetDir || !fs.existsSync(targetDir)) {
      return { success: false, exportedCount: 0, error: 'Ungültiger Zielordner' };
    }
    let count = 0;
    try {
      for (const item of items) {
        if (!item.content) continue;
        let subDir = targetDir;
        if (item.relativePath) {
          const relDir = path.dirname(item.relativePath);
          if (relDir && relDir !== '.') {
            subDir = path.join(targetDir, relDir);
            if (!fs.existsSync(subDir)) {
              fs.mkdirSync(subDir, { recursive: true });
            }
          }
        }
        const cleanName = sanitizeFileName(item.fileName);
        const targetFilePath = path.join(subDir, cleanName);
        fs.writeFileSync(targetFilePath, item.content, 'utf-8');
        count++;
      }
      return { success: true, exportedCount: count, targetDir };
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
