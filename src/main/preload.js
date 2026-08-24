import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
    convertDocument: function (req) {
        return ipcRenderer.invoke('convert-document', req);
    },
    selectFiles: function () {
        return ipcRenderer.invoke('select-files');
    },
    selectDirectory: function (title) {
        return ipcRenderer.invoke('select-directory', title);
    },
    saveFileDialog: function (defaultFileName, defaultPath) {
        return ipcRenderer.invoke('save-file-dialog', defaultFileName, defaultPath);
    },
    getVaultSubfolders: function (vaultPath) {
        return ipcRenderer.invoke('get-vault-subfolders', vaultPath);
    },
    saveNote: function (req) {
        return ipcRenderer.invoke('save-note', req);
    },
    saveCustomNote: function (filePath, content) {
        return ipcRenderer.invoke('save-custom-note', filePath, content);
    },
    openInObsidian: function (vaultPath, filePath) {
        return ipcRenderer.invoke('open-in-obsidian', vaultPath, filePath);
    },
    openInExplorer: function (filePath) {
        return ipcRenderer.invoke('open-in-explorer', filePath);
    },
    getSettings: function () {
        return ipcRenderer.invoke('get-settings');
    },
    saveSettings: function (settings) {
        return ipcRenderer.invoke('save-settings', settings);
    }
});
