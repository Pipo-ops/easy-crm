import { contextBridge, ipcRenderer } from 'electron';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  printHtml: (html, options) => ipcRenderer.invoke('print-html', { html, options }),
});