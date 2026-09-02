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
  engineUsed?: string;
  /** true, wenn der Fehler auf fehlende Python-Voraussetzungen zurückgeht */
  missingPrerequisites?: boolean;
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

export type FileStatus = 'idle' | 'queued' | 'converting' | 'success' | 'error';

export interface FileQueueItem {
  id: string;
  path: string;
  name: string;
  size: number;
  extension: string;
  status: FileStatus;
  markdown?: string;
  error?: string;
  subject?: string;
  /** Pfad relativ zum eingelesenen Wurzelordner (für Batch-Export mit Struktur) */
  relativePath?: string;
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

/** Represents a node in the vault folder tree */
export interface FolderTreeNode {
  name: string;
  path: string;
  children: FolderTreeNode[];
}

/** A single routing rule: label → target folder, with optional sub-routes */
export interface VaultRoute {
  label: string;
  targetFolder: string;
  subRoutes?: VaultRoute[];
}

/** Vault routing config stored as .markitui-routing.json in vault root */
export interface VaultRouting {
  vaultName: string;
  description: string;
  routes: VaultRoute[];
}

export interface ScannedFileItem {
  path: string;
  name: string;
  relativePath: string;
  size: number;
  extension: string;
}

export interface BatchExportItem {
  fileName: string;
  relativePath?: string;
  content: string;
}

export interface BatchExportResult {
  success: boolean;
  exportedCount: number;
  targetDir?: string;
  error?: string;
}

export interface PythonEnvironmentStatus {
  isReady: boolean;
  pythonFound: boolean;
  pythonVersion: string;
  pythonPath: string;
  installedPackages: string[];
  missingPackages: string[];
  hasMarkitdown: boolean;
  hasPdfplumber: boolean;
  hasMammoth: boolean;
  hasPptx: boolean;
  hasOpenpyxl: boolean;
  hasDocx?: boolean;
  /** Python-Version ist zu alt für die Konverter-Pakete (< 3.9) */
  pythonTooOld?: boolean;
  error?: string;
}

export interface InstallProgressEvent {
  stage: 'python' | 'pip' | 'packages' | 'verify' | 'done' | 'error';
  message: string;
  /** 0..100, falls abschätzbar */
  percent?: number;
}

export interface InstallRequirementsResult {
  success: boolean;
  log: string;
  error?: string;
  /** Zustand der Umgebung nach der Installation */
  status?: PythonEnvironmentStatus;
}

export interface EnsurePythonResult {
  success: boolean;
  pythonPath: string;
  log: string;
  error?: string;
  /** true, wenn Python in diesem Durchlauf neu installiert wurde */
  installed?: boolean;
}

export interface ElectronAPI {
  // Conversion
  convertDocument: (req: ConversionRequest) => Promise<ConversionResult>;
  
  // Environment & Doctor
  checkPythonEnvironment: (customPythonPath?: string) => Promise<PythonEnvironmentStatus>;
  installPythonRequirements: (customPythonPath?: string) => Promise<InstallRequirementsResult>;
  ensurePythonInstalled: () => Promise<EnsurePythonResult>;
  openSetupScript: () => Promise<boolean>;
  onInstallProgress: (callback: (event: InstallProgressEvent) => void) => () => void;

  // Filesystem & Dialogs
  selectFiles: () => Promise<string[]>;
  selectDirectory: (title?: string) => Promise<string | null>;
  saveFileDialog: (defaultFileName: string, defaultPath?: string) => Promise<string | null>;
  scanPaths: (paths: string[]) => Promise<ScannedFileItem[]>;
  batchExport: (targetDir: string, items: BatchExportItem[]) => Promise<BatchExportResult>;
  
  // Vault & Files
  getVaultSubfolders: (vaultPath: string) => Promise<string[]>;
  getVaultFolderTree: (vaultPath: string) => Promise<FolderTreeNode[]>;
  checkIsObsidianVault: (vaultPath: string) => Promise<boolean>;
  getVaultRouting: (vaultPath: string) => Promise<VaultRouting | null>;
  saveVaultRouting: (vaultPath: string, routing: VaultRouting) => Promise<boolean>;
  saveNote: (req: SaveNoteRequest) => Promise<SaveNoteResult>;
  saveCustomNote: (filePath: string, content: string) => Promise<SaveNoteResult>;
  openInObsidian: (vaultPath: string, filePath: string) => Promise<boolean>;
  openInExplorer: (filePath: string) => Promise<boolean>;
  
  // Settings
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<boolean>;

  // External / CLI Events
  getInitialPaths: () => Promise<string[]>;
  onOpenExternalPaths: (callback: (paths: string[]) => void) => () => void;

  /** Ermittelt den echten Dateipfad eines Drag&Drop-File-Objekts (Electron >= 32) */
  getPathForFile: (file: File) => string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
