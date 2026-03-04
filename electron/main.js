import { app, BrowserWindow, ipcMain } from 'electron';

ipcMain.handle('print-html', async (_event, { html, options }) => {
  const win = new BrowserWindow({
    show: false, // zum Debuggen kannst du später mal true machen
    webPreferences: {
      sandbox: false,
    },
  });

  win.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error('[print] did-fail-load:', code, desc);
  });

  const url = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);

  await win.loadURL(url);

  // WICHTIG: dom-ready + did-finish-load + did-stop-loading
  await new Promise((resolve) => win.webContents.once('dom-ready', resolve));
  await new Promise((resolve) => win.webContents.once('did-finish-load', resolve));
  await new Promise((resolve) => win.webContents.once('did-stop-loading', resolve));

  // kleiner Puffer, damit Layout/Fonts wirklich gesetzt sind
  await new Promise((r) => setTimeout(r, 200));

  const printOptions = {
    silent: false,
    printBackground: true,
    useSystemPrintDialog: false, // Chromium dialog (mit Preview)
    ...options,
  };

  return await new Promise((resolve) => {
    win.webContents.print(printOptions, (success, failureReason) => {
      console.log('[print] success:', success, 'reason:', failureReason);
      win.close();
      resolve(success);
    });
  });
});
