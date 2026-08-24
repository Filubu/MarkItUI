import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { FileQueue } from './components/FileQueue';
import { MarkdownPreview } from './components/MarkdownPreview';
import { QuickSaveBar } from './components/QuickSaveBar';
import { SettingsModal } from './components/SettingsModal';
import { Toast, ToastMessage } from './components/Toast';
import { AppSettings, FileQueueItem } from '../shared/types';

export const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    vaultPath: '',
    defaultSubfolder: '',
    addFrontmatter: true,
    defaultTags: ['schule', 'itslearning'],
    autoOpenObsidian: false,
    autoConvertOnDrop: true
  });

  const [vaultSubfolders, setVaultSubfolders] = useState<string[]>(['/ (Hauptverzeichnis)']);
  const [files, setFiles] = useState<FileQueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isConvertingAny, setIsConvertingAny] = useState<boolean>(false);

  const addToast = useCallback((type: 'success' | 'error' | 'info', text: string, actionLabel?: string, onAction?: () => void) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, text, actionLabel, onAction }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load settings and scan vault on startup
  useEffect(() => {
    const init = async () => {
      try {
        if (window.electronAPI) {
          const loaded = await window.electronAPI.getSettings();
          if (loaded) {
            setSettings(loaded);
            if (loaded.vaultPath) {
              const subs = await window.electronAPI.getVaultSubfolders(loaded.vaultPath);
              setVaultSubfolders(subs);
            }
          }
        }
      } catch (err) {
        console.error('Init-Fehler:', err);
      }
    };
    init();
  }, []);

  // Refresh subfolders when vault path changes
  const refreshVaultFolders = useCallback(async (vaultPath: string) => {
    if (!vaultPath) {
      setVaultSubfolders(['/ (Hauptverzeichnis)']);
      return;
    }
    try {
      const subs = await window.electronAPI.getVaultSubfolders(vaultPath);
      setVaultSubfolders(subs);
    } catch (e) {
      console.error('Vault-Scan Fehler:', e);
    }
  }, []);

  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await window.electronAPI.saveSettings(newSettings);
    await refreshVaultFolders(newSettings.vaultPath);
    addToast('success', 'Einstellungen erfolgreich gespeichert.');
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
        addToast('success', `'${fileItem.name}' erfolgreich mit MarkItDown konvertiert!`);
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? { ...f, status: 'error', error: res.error || 'Konvertierungsfehler' }
              : f
          )
        );
        addToast('error', `Fehler bei '${fileItem.name}': ${res.error}`);
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
    }

    if (settings.autoConvertOnDrop) {
      newItems.forEach((item) => {
        convertSingleFile(item);
      });
    }
  };

  const handleConvertAll = async () => {
    const idleFiles = files.filter((f) => f.status === 'idle');
    if (idleFiles.length === 0) return;

    setIsConvertingAny(true);
    for (const f of idleFiles) {
      await convertSingleFile(f);
    }
    setIsConvertingAny(false);
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

  const handleClearAll = () => {
    setFiles([]);
    setSelectedId(null);
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
          `Notiz erfolgreich im Vault gespeichert (${subfolder})!`,
          'In Obsidian öffnen',
          () => window.electronAPI.openInObsidian(settings.vaultPath, res.savedPath!)
        );
        return res.savedPath;
      } else {
        addToast('error', `Fehler beim Speichern: ${res.error}`);
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
          `Notiz gespeichert unter: ${res.savedPath}`,
          'Im Explorer zeigen',
          () => window.electronAPI.openInExplorer(res.savedPath!)
        );
        return res.savedPath;
      } else {
        addToast('error', `Fehler beim Speichern: ${res.error}`);
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

  const currentSelectedFile = files.find((f) => f.id === selectedId) || null;

  return (
    <div className="app-container">
      <Header settings={settings} onOpenSettings={() => setIsSettingsOpen(true)} />

      <div className="main-content">
        <aside className="sidebar">
          <DropZone onFilesAdded={handleFilesAdded} />
          <FileQueue
            files={files}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRemove={handleRemoveFile}
            onClearAll={handleClearAll}
            onConvertAll={handleConvertAll}
            isConvertingAny={isConvertingAny}
          />
        </aside>

        <main className="preview-container">
          <MarkdownPreview
            currentFile={currentSelectedFile}
            onConvertSingle={convertSingleFile}
            onUpdateContent={handleUpdateContent}
          />
          <QuickSaveBar
            currentFile={currentSelectedFile}
            settings={settings}
            vaultSubfolders={vaultSubfolders}
            onSaveToVault={handleSaveToVault}
            onSaveCustom={handleSaveCustom}
            onOpenInObsidian={handleOpenInObsidian}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        </main>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
