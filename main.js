const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { ensureDirs } = require('./src/main/constants');
const { setWindow, startHeartbeat } = require('./src/main/db');
const { registerHandlers } = require('./src/main/handlers');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 900, minHeight: 600,
    title: 'KS-GES-stock',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false,
    backgroundColor: '#0f1117'
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  
  mainWindow.once('ready-to-show', () => { 
    mainWindow.show(); 
    mainWindow.focus(); 
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => { 
    shell.openExternal(url); 
    return { action: 'deny' }; 
  });

  // Services Initialization
  setWindow(mainWindow);
  registerHandlers(mainWindow);
  startHeartbeat();
}

app.whenReady().then(() => {
  ensureDirs();
  createWindow();
  app.on('activate', () => { 
    if (BrowserWindow.getAllWindows().length === 0) createWindow(); 
  });
});

app.on('window-all-closed', () => { 
  if (process.platform !== 'darwin') app.quit(); 
});
