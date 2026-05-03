const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadData:       ()         => ipcRenderer.invoke('load-data'),
  saveData:       (data, options = {}) => ipcRenderer.invoke('save-data', data, options),
  exportJSON:     (data)     => ipcRenderer.invoke('export-json', data),
  exportCSV:      (csv)      => ipcRenderer.invoke('export-csv', csv),
  importJSON:     ()         => ipcRenderer.invoke('import-json'),
  importCSV:      ()         => ipcRenderer.invoke('import-csv'),
  autoBackup:     (data)     => ipcRenderer.invoke('auto-backup', data),
  openDataFolder: ()         => ipcRenderer.invoke('open-data-folder'),
  getDataPath:    ()         => ipcRenderer.invoke('get-data-path'),
  getDataDir:     ()         => ipcRenderer.invoke('get-data-dir'),
  saveImageFile:  (data)     => ipcRenderer.invoke('save-image-file', data),
  testNeonConnection: ()     => ipcRenderer.invoke('test-neon-connection'),
  disableNeonConnection: ()  => ipcRenderer.invoke('disable-neon-connection'),
  getNeonStatus:  ()         => ipcRenderer.invoke('get-neon-status'),
  getSyncStatus:  ()         => ipcRenderer.invoke('get-sync-status'),
  forceSyncCheck: ()         => ipcRenderer.invoke('force-sync-check'),
  onSyncStatus:   (callback) => ipcRenderer.on('sync-status', (event, status) => callback(status)),
});
