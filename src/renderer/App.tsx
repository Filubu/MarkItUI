import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { MarkdownPreview } from './components/MarkdownPreview';
import { QuickSaveBar } from './components/QuickSaveBar';
import { SettingsModal } from './components/SettingsModal';
import { VaultRoutingModal } from './components/VaultRoutingModal';
import { Toast, ToastMessage } from './components/Toast';
import { AppSettings, FileQueueItem, FolderTreeNode, VaultRouting } from '../shared/types';
import { Upload, FolderOpen } from 'lucide-react';

export const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    vaultPath: '',
    defaultSubfolder: '',
    addFrontmatter: true,
    defaultTags: ['schule'],
    autoOpenObsidian: false,
    autoConvertOnDrop: true
  });

  const [vaultSubfolders, setVaultSubfolders] = useState<string[]>(['/']);
  const [folderTree, setFolderTree] = useState<FolderTreeNode[]>([]);
  const [isObsidianVault, setIsObsidianVault] = useState<boolean>(false);
  const [vaultRouting, setVaultRouting] = useState<VaultRouting | null>(null);
  const [files, setFiles] = useState<FileQueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'split' | 'raw'>('preview');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isRoutingOpen, setIsRoutingOpen] = useState<boolean>(false);
  const [isRoutingFirstTime, setIsRoutingFirstTime] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isGlobalDragOver, setIsGlobalDragOver] = useState<boolean>(false);

  const hasVault = Boolean(settings.vaultPath);

  const addToast = useCallback((type: 'success' | 'error' | 'info', text: string, actionLabel?: string, onAction?: () => void) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, text, actionLabel, onAction }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load vault data (tree, routing, detection) – called on init and on vault change
  const loadVaultData = useCallback(async (vaultPath: string) => {
    if (!vaultPath) {
      setVaultSubfolders(['/']);
      setFolderTree([]);
      setIsObsidianVault(false);
      setVaultRouting(null);
      return;
    }

    try {
      const [subs, tree, isVault, routing] = await Promise.all([
        window.electronAPI.getVaultSubfolders(vaultPath),
        window.electronAPI.getVaultFolderTree(vaultPath),
        window.electronAPI.checkIsObsidianVault(vaultPath),
        window.electronAPI.getVaultRouting(vaultPath)
      ]);

      setVaultSubfolders(subs.length > 0 ? subs : ['/']);
      setFolderTree(tree);
      setIsObsidianVault(isVault);
      setVaultRouting(routing);
    } catch (err) {
      console.error('Vault-Daten laden fehlgeschlagen:', err);
    }
  }, []);

  // Initialize settings & vault data on startup
  useEffect(() => {
    const init = async () => {
      try {
        if (window.electronAPI) {
          const loaded = await window.electronAPI.getSettings();
          if (loaded) {
            setSettings(loaded);
            if (loaded.vaultPath) {
              await loadVaultData(loaded.vaultPath);
            }
          }
        }
      } catch (err) {
        console.error('Init-Fehler:', err);
      }
    };
    init();
  }, [loadVaultData]);

  const handleSaveSettings = async (newSettings: AppSettings) => {
    const vaultChanged = newSettings.vaultPath !== settings.vaultPath;
    setSettings(newSettings);
    await window.electronAPI.saveSettings(newSettings);

    if (vaultChanged && newSettings.vaultPath) {
      await loadVaultData(newSettings.vaultPath);

      // Check if new vault is Obsidian and has no routing → offer to create
      const isVault = await window.electronAPI.checkIsObsidianVault(newSettings.vaultPath);
      const routing = await window.electronAPI.getVaultRouting(newSettings.vaultPath);

      if (isVault && !routing) {
        setIsRoutingFirstTime(true);
        setIsRoutingOpen(true);
      }
    } else if (vaultChanged) {
      await loadVaultData('');
    }

    addToast('success', 'Gespeichert');
  };

  const handleSaveRouting = async (routing: VaultRouting) => {
    if (!settings.vaultPath) return;
    const success = await window.electronAPI.saveVaultRouting(settings.vaultPath, routing);
    if (success) {
      setVaultRouting(routing);
      setIsRoutingOpen(false);
      setIsRoutingFirstTime(false);
      addToast('success', 'Routing-Konfiguration gespeichert');
    } else {
      addToast('error', 'Fehler beim Speichern der Routing-Konfiguration');
    }
  };

  const handleSkipRouting = () => {
    setIsRoutingOpen(false);
    setIsRoutingFirstTime(false);
  };

  const convertSingleFile = async (fileItem: FileQueueItem) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'converting', error: undefined } : f))
    );

    try {
      const res = await window.electronAPI.convertDocument({
        filePath: fileItem.path,
        addFrontmatter: settings.addFrontmatter,
        tags: settings.defaultTags,
        subject: fileItem.subject
      });

      if (res.success) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? { ...f, status: 'success', markdown: res.markdown, error: undefined }
              : f
          )
        );
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? { ...f, status: 'error', error: res.error || 'Konvertierungsfehler' }
              : f
          )
        );
        addToast('error', `Fehler: ${res.error}`);
      }
    } catch (err: any) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileItem.id
            ? { ...f, status: 'error', error: err.message || 'Unerwarteter Fehler' }
            : f
        )
      );
      addToast('error', `Fehler: ${err.message}`);
    }
  };

  const handleFilesAdded = (paths: string[]) => {
    const newItems: FileQueueItem[] = paths.map((p) => {
      const name = p.split(/[\\/]/).pop() || p;
      const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
      return {
        id: Math.random().toString(36).substring(2, 9),
        path: p,
        name: name,
        size: 0,
        extension: ext,
        status: 'idle'
      };
    });

    setFiles((prev) => [...prev, ...newItems]);

    if (!selectedId && newItems.length > 0) {
      setSelectedId(newItems[0].id);
    } else if (newItems.length > 0) {
      setSelectedId(newItems[0].id);
    }

    if (settings.autoConvertOnDrop) {
      newItems.forEach((item) => {
        convertSingleFile(item);
      });
    }
  };

  const handleSelectFilesDialog = async () => {
    try {
      const selected = await window.electronAPI.selectFiles();
      if (selected && selected.length > 0) {
        handleFilesAdded(selected);
      }
    } catch (err) {
      console.error('Dateiauswahl-Fehler:', err);
    }
  };

  const handleUpdateContent = (content: string) => {
    if (!selectedId) return;
    setFiles((prev) =>
      prev.map((f) => (f.id === selectedId ? { ...f, markdown: content } : f))
    );
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== id);
      if (selectedId === id) {
        setSelectedId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  const handleSaveToVault = async (subfolder: string, fileName: string): Promise<string | null> => {
    const current = files.find((f) => f.id === selectedId);
    if (!current || !current.markdown) return null;

    try {
      const res = await window.electronAPI.saveNote({
        vaultPath: settings.vaultPath,
        subfolder: subfolder,
        fileName: fileName,
        content: current.markdown
      });

      if (res.success && res.savedPath) {
        addToast(
          'success',
          `Gespeichert in Vault`,
          'Öffnen',
          () => window.electronAPI.openInObsidian(settings.vaultPath, res.savedPath!)
        );
        return res.savedPath;
      } else {
        addToast('error', `Fehler: ${res.error}`);
        return null;
      }
    } catch (e: any) {
      addToast('error', `Fehler: ${e.message}`);
      return null;
    }
  };

  const handleSaveCustom = async (fileName: string): Promise<string | null> => {
    const current = files.find((f) => f.id === selectedId);
    if (!current || !current.markdown) return null;

    try {
      const targetPath = await window.electronAPI.saveFileDialog(fileName, settings.vaultPath);
      if (!targetPath) return null;

      const res = await window.electronAPI.saveCustomNote(targetPath, current.markdown);
      if (res.success && res.savedPath) {
        addToast(
          'success',
          `Gespeichert`,
          'Im Explorer zeigen',
          () => window.electronAPI.openInExplorer(res.savedPath!)
        );
        return res.savedPath;
      } else {
        addToast('error', `Fehler: ${res.error}`);
        return null;
      }
    } catch (e: any) {
      addToast('error', `Fehler: ${e.message}`);
      return null;
    }
  };

  const handleOpenInObsidian = async (filePath: string) => {
    await window.electronAPI.openInObsidian(settings.vaultPath, filePath);
  };

  // Vault selection via onboarding
  const handleSelectVault = async () => {
    try {
      const selected = await window.electronAPI.selectDirectory('Obsidian Vault Ordner auswählen');
      if (selected) {
        const newSettings = { ...settings, vaultPath: selected };
        await handleSaveSettings(newSettings);
      }
    } catch (err) {
      console.error('Vault-Auswahl Fehler:', err);
    }
  };

  // Global window drag & drop events
  const handleWindowDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasVault) {
      setIsGlobalDragOver(true);
    }
  };

  const handleWindowDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
      setIsGlobalDragOver(false);
    }
  };

  const handleWindowDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsGlobalDragOver(false);

    if (!hasVault) return; // Block drops without vault

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      const paths = droppedFiles
        .map((f: any) => f.path || f.name)
        .filter(Boolean);
      if (paths.length > 0) {
        handleFilesAdded(paths);
      }
    }
  };

  const currentSelectedFile = files.find((f) => f.id === selectedId) || null;

  // Onboarding: No vault selected yet
  if (!hasVault) {
    return (
      <div className="app-container">
        <div className="onboarding-screen">
          <div className="onboarding-card">
            <div className="onboarding-icon-wrap">
              <img src="app_logo.png" alt="MarkItUI" className="onboarding-logo-img" />
            </div>
            <h1 className="onboarding-title">MarkItUI</h1>
            <p className="onboarding-desc">
              Wähle den Ordner deines Obsidian Vaults, um Dokumente per Drag &amp; Drop
              in Markdown umzuwandeln und direkt abzulegen.
            </p>
            <button className="btn-solid-white onboarding-btn" onClick={handleSelectVault}>
              <FolderOpen size={15} />
              Vault-Ordner auswählen
            </button>
            <button
              className="btn-glass onboarding-skip"
              onClick={() => setIsSettingsOpen(true)}
            >
              Einstellungen öffnen
            </button>
          </div>
        </div>

        <SettingsModal
          isOpen={isSettingsOpen}
          settings={settings}
          isObsidianVault={isObsidianVault}
          hasRouting={Boolean(vaultRouting)}
          onClose={() => setIsSettingsOpen(false)}
          onSave={handleSaveSettings}
          onOpenRouting={() => {
            setIsRoutingFirstTime(!vaultRouting);
            setIsRoutingOpen(true);
          }}
        />

        <Toast toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div
      className="app-container"
      onDragOver={handleWindowDragOver}
      onDragLeave={handleWindowDragLeave}
      onDrop={handleWindowDrop}
    >
      {/* Global Drag Overlay */}
      {isGlobalDragOver && (
        <div className="global-drag-overlay">
          <Upload size={32} color="#ffffff" />
          <span>Dateien loslassen</span>
        </div>
      )}

      {/* Topbar */}
      <Header
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        files={files}
        selectedId={selectedId}
        onSelectFile={setSelectedId}
        onRemoveFile={handleRemoveFile}
        onAddFiles={handleSelectFilesDialog}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
      />

      {/* Main Workspace */}
      <main className="main-workspace">
        {files.length === 0 ? (
          <DropZone onFilesAdded={handleFilesAdded} />
        ) : (
          <>
            <MarkdownPreview
              currentFile={currentSelectedFile}
              viewMode={viewMode}
              onConvertSingle={convertSingleFile}
              onUpdateContent={handleUpdateContent}
              onRemoveFile={handleRemoveFile}
            />

            <QuickSaveBar
              currentFile={currentSelectedFile}
              settings={settings}
              vaultSubfolders={vaultSubfolders}
              folderTree={folderTree}
              vaultRouting={vaultRouting}
              onSaveToVault={handleSaveToVault}
              onSaveCustom={handleSaveCustom}
              onOpenInObsidian={handleOpenInObsidian}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          </>
        )}
      </main>

      {/* Settings Dialog */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        isObsidianVault={isObsidianVault}
        hasRouting={Boolean(vaultRouting)}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        onOpenRouting={() => {
          setIsSettingsOpen(false);
          setIsRoutingFirstTime(!vaultRouting);
          setIsRoutingOpen(true);
        }}
      />

      {/* Vault Routing Dialog */}
      <VaultRoutingModal
        isOpen={isRoutingOpen}
        vaultPath={settings.vaultPath}
        vaultName={settings.vaultPath.split(/[\\/]/).filter(Boolean).pop() || settings.vaultPath}
        existingRouting={vaultRouting}
        folderTree={folderTree}
        onClose={() => {
          setIsRoutingOpen(false);
          setIsRoutingFirstTime(false);
        }}
        onSave={handleSaveRouting}
        onSkip={handleSkipRouting}
        isFirstTime={isRoutingFirstTime}
      />

      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
