export interface ConversionRequest {
    filePath: string;
    addFrontmatter?: boolean;
    tags?: string[];
    subject?: string;
    title?: string;
}
export interface ConversionResult {
    success: boolean;
    markdown: string;
    error: string | null;
    fileName: string;
    charCount?: number;
}
export interface AppSettings {
    vaultPath: string;
    defaultSubfolder: string;
    addFrontmatter: boolean;
    defaultTags: string[];
    autoOpenObsidian: boolean;
    autoConvertOnDrop: boolean;
    customPythonPath?: string;
}
export interface FileQueueItem {
    id: string;
    path: string;
    name: string;
    size: number;
    extension: string;
    status: 'idle' | 'converting' | 'success' | 'error';
    markdown?: string;
    error?: string;
    subject?: string;
}
export interface SaveNoteRequest {
    vaultPath: string;
    subfolder: string;
    fileName: string;
    content: string;
    overwrite?: boolean;
}
export interface SaveNoteResult {
    success: boolean;
    savedPath?: string;
    error?: string;
}
export interface ElectronAPI {
    convertDocument: (req: ConversionRequest) => Promise<ConversionResult>;
    selectFiles: () => Promise<string[]>;
    selectDirectory: (title?: string) => Promise<string | null>;
    saveFileDialog: (defaultFileName: string, defaultPath?: string) => Promise<string | null>;
    getVaultSubfolders: (vaultPath: string) => Promise<string[]>;
    saveNote: (req: SaveNoteRequest) => Promise<SaveNoteResult>;
    saveCustomNote: (filePath: string, content: string) => Promise<SaveNoteResult>;
    openInObsidian: (vaultPath: string, filePath: string) => Promise<boolean>;
    openInExplorer: (filePath: string) => Promise<boolean>;
    getSettings: () => Promise<AppSettings>;
    saveSettings: (settings: AppSettings) => Promise<boolean>;
}
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
