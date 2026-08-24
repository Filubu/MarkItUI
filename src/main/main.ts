import { app, BrowserWindow } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './ipcHandlers';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const iconPath = path.join(__dirname, '../build/icon.png');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 950,
    minHeight: 650,
    title: 'MarkItUI',
    icon: iconPath,
    backgroundColor: '#121217',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  registerIpcHandlers(mainWindow);

  // Load URL based on dev vs prod
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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
