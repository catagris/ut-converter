const electron = require("electron")
const { app, BrowserWindow, ipcMain, dialog, Menu } = electron
const fs = require('fs')
const path = require('path');
const sqlite3 = require('better-sqlite3');
const dbPath = path.resolve(__dirname, 'mydatabase.sqlite');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const remoteMain = require('@electron/remote/main');
remoteMain.initialize();

const createWindow = () => {
  
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });
  Menu.setApplicationMenu(null);
  remoteMain.enable(mainWindow.webContents)

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    // Handle cleanup here
    try {
      if(fs.existsSync(dbPath)) {
          const db = sqlite3(dbPath);
          db.close();
          fs.unlinkSync(dbPath);
      }
    } catch (err) {
        console.error(err.message);
    }
  });

  ipcMain.on('request-selected-values', (event) => {
    // Send the selected values to the renderer process
    event.reply('get-selected-values', {
      selectedValueType: selectedValueType,
      selectedValueProcess: selectedValueProcess,
    });
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // Clean up the database before quitting the app
  try {
    if(fs.existsSync(dbPath)) {
        const db = sqlite3(dbPath);
        db.close();
        fs.unlinkSync(dbPath);
    }
  } catch (err) {
      console.error(err.message);
  }
});


app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});