const { app, BrowserWindow, Tray, Menu, shell, ipcMain, nativeImage } = require('electron');
const path = require('path');
const kaloryDb = require('./db.cjs');

kaloryDb.register(ipcMain);

let mainWin = null;
let tray = null;
let quitting = false;

// Una sola instancia: el segundo intento enfoca la ventana existente.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWin) {
      if (mainWin.isMinimized()) mainWin.restore();
      mainWin.show();
      mainWin.focus();
    }
  });
}

function createWindow() {
  mainWin = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0A0F1E',
    title: 'Kalory — Health & Fitness',
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWin.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  // Cerrar minimiza a la bandeja (Salir está en el menú del icono).
  mainWin.on('close', (e) => {
    if (!quitting) {
      e.preventDefault();
      mainWin.hide();
      tray?.displayBalloon({ title: 'Kalory sigue activo', content: 'Clic en el icono para volver. Salir desde el menú.' });
    }
  });

  // Abrir enlaces externos en el navegador del sistema
  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.ico');
  let img = nativeImage.createFromPath(iconPath);
  if (!img.isEmpty()) img = img.resize({ width: 16, height: 16 });
  tray = new Tray(img.isEmpty() ? nativeImage.createEmpty() : img);
  tray.setToolTip('Kalory — Health & Fitness');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir Kalory', click: () => { mainWin?.show(); mainWin?.focus(); } },
    { type: 'separator' },
    {
      label: 'Salir', click: () => {
        quitting = true;
        kaloryDb.flush();
        app.quit();
      },
    },
  ]));
  tray.on('click', () => {
    if (!mainWin) return;
    if (mainWin.isVisible()) mainWin.hide();
    else { mainWin.show(); mainWin.focus(); }
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWin?.show();
  });
});

app.on('window-all-closed', () => {
  kaloryDb.flush();
  if (process.platform !== 'darwin') app.quit();
});
