import { contextBridge, ipcRenderer } from 'electron';
import { ConversionRequest, ConversionResult, AppSettings, SaveNoteRequest, SaveNoteResult, FolderTreeNode, VaultRouting } from '../shared/types';

contextBridge.exposeInMainWorld('electronAPI', {
  convertDocument: (req: ConversionRequest): Promise<ConversionResult> =>
    ipcRenderer.invoke('convert-document', req),

  selectFiles: (): Promise<string[]> =>
    ipcRenderer.invoke('select-files'),

  selectDirectory: (title?: string): Promise<string | null> =>
    ipcRenderer.invoke('select-directory', title),

  saveFileDialog: (defaultFileName: string, defaultPath?: string): Promise<string | null> =>
    ipcRenderer.invoke('save-file-dialog', defaultFileName, defaultPath),

  getVaultSubfolders: (vaultPath: string): Promise<string[]> =>
    ipcRenderer.invoke('get-vault-subfolders', vaultPath),

  getVaultFolderTree: (vaultPath: string): Promise<FolderTreeNode[]> =>
    ipcRenderer.invoke('get-vault-folder-tree', vaultPath),

  checkIsObsidianVault: (vaultPath: string): Promise<boolean> =>
    ipcRenderer.invoke('check-is-obsidian-vault', vaultPath),

  getVaultRouting: (vaultPath: string): Promise<VaultRouting | null> =>
    ipcRenderer.invoke('get-vault-routing', vaultPath),

  saveVaultRouting: (vaultPath: string, routing: VaultRouting): Promise<boolean> =>
    ipcRenderer.invoke('save-vault-routing', vaultPath, routing),

  saveNote: (req: SaveNoteRequest): Promise<SaveNoteResult> =>
    ipcRenderer.invoke('save-note', req),

  saveCustomNote: (filePath: string, content: string): Promise<SaveNoteResult> =>
    ipcRenderer.invoke('save-custom-note', filePath, content),

  openInObsidian: (vaultPath: string, filePath: string): Promise<boolean> =>
    ipcRenderer.invoke('open-in-obsidian', vaultPath, filePath),

  openInExplorer: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke('open-in-explorer', filePath),

  getSettings: (): Promise<AppSettings> =>
    ipcRenderer.invoke('get-settings'),

  saveSettings: (settings: AppSettings): Promise<boolean> =>
    ipcRenderer.invoke('save-settings', settings)
});

