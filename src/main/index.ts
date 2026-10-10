import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { openDatabase, closeDatabase } from '../db/connection';
import { initAttachmentStorage } from './attachmentStorage';
import { seedDemoDataIfEmpty } from './seedDemoData';
import { ensureBuiltInTemplatesSeeded } from './templateSeeder';
import { registerIpcHandlers } from './ipcHandlers';

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'ReportForge Local',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // Nunca se navega a contenido remoto: solo la UI local empaquetada.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isLocal = url.startsWith('file://') || url.startsWith('http://localhost:5173');
    if (!isLocal) {
      event.preventDefault();
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  const userDataPath = app.getPath('userData');
  openDatabase(userDataPath);
  initAttachmentStorage(userDataPath);
  ensureBuiltInTemplatesSeeded();
  seedDemoDataIfEmpty();
  registerIpcHandlers(() => userDataPath);

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') app.quit();
});

app.on('web-contents-created', (_event, contents) => {
  // Defensa en profundidad: bloquea cualquier intento de abrir ventanas adicionales
  // o navegar a contenido remoto desde dentro de la webContents principal.
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});
