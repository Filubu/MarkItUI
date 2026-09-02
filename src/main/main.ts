import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { registerIpcHandlers, setInitialCliPaths, appendInitialCliPaths } from './ipcHandlers';

let mainWindow: BrowserWindow | null = null;

/**
 * Filtert echte Datei-/Ordnerpfade aus den Startargumenten (Explorer-Kontextmenü).
 * Electron-Schalter und nicht existierende Pfade werden verworfen.
 */
function extractFilePathsFromArgv(argv: string[]): string[] {
  return argv.slice(1).filter((arg) => {
    if (!arg || arg.startsWith('-') || arg === '.') return false;
    try {
      if (!fs.existsSync(arg)) return false;
      // Im Dev-Modus steht das Projektverzeichnis in argv – das ist kein Dokument.
      if (!app.isPackaged && fs.statSync(arg).isDirectory()) return false;
      return true;
    } catch {
      return false;
    }
  });
}

function createWindow() {
  const iconPath = path.join(__dirname, '../build/icon.png');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 950,
    minHeight: 650,
    title: 'MarkItUI',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#121217',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  setInitialCliPaths(extractFilePathsFromArgv(process.argv));

  app.on('second-instance', (_event, commandLine) => {
    const incomingPaths = extractFilePathsFromArgv(commandLine);

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      if (incomingPaths.length > 0) {
        if (mainWindow.webContents.isLoading()) {
          // Fenster lädt noch – Pfade zwischenspeichern, der Renderer holt sie beim Start ab.
          appendInitialCliPaths(incomingPaths);
        } else {
          mainWindow.webContents.send('open-external-paths', incomingPaths);
        }
      }
    } else if (incomingPaths.length > 0) {
      appendInitialCliPaths(incomingPaths);
    }
  });

  app.whenReady().then(() => {
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.markitui.app');
    }

    // Handler einmalig registrieren – nicht pro Fenster (sonst wirft ipcMain.handle).
    registerIpcHandlers(() => mainWindow);
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
