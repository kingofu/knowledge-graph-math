const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Listen for reset-data command from menu
  onResetData: (callback) => {
    ipcRenderer.on('reset-data', () => callback());
  },
  // Platform info
  platform: process.platform,
  isElectron: true,
});
