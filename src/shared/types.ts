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
  error?: string;
}

export interface InstallRequirementsResult {
  success: boolean;
  log: string;
  error?: string;
}

export interface ElectronAPI {
  // Conversion
  convertDocument: (req: ConversionRequest) => Promise<ConversionResult>;
  
  // Environment & Doctor
  checkPythonEnvironment: (customPythonPath?: string) => Promise<PythonEnvironmentStatus>;
  installPythonRequirements: (customPythonPath?: string) => Promise<InstallRequirementsResult>;
  openSetupScript: () => Promise<boolean>;

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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
