import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { MarkdownPreview } from './components/MarkdownPreview';
import { QuickSaveBar } from './components/QuickSaveBar';
import { SettingsModal } from './components/SettingsModal';
import { VaultRoutingModal } from './components/VaultRoutingModal';
import { SetupBanner } from './components/SetupBanner';
import { Toast, ToastMessage } from './components/Toast';
import {
  AppSettings,
  FileQueueItem,
  FolderTreeNode,
  VaultRouting,
  ScannedFileItem,
  PythonEnvironmentStatus
} from '../shared/types';
import { Upload, FolderOpen } from 'lucide-react';

/** Wie viele Einzelfehler als Toast erscheinen, bevor nur noch eine Zusammenfassung kommt. */
const MAX_ERROR_TOASTS = 2;

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
  const [envStatus, setEnvStatus] = useState<PythonEnvironmentStatus | null>(null);

  const hasVault = Boolean(settings.vaultPath);

  // Spiegel der States für die Warteschlange (vermeidet veraltete Closures)
  const filesRef = useRef<FileQueueItem[]>(files);
  const settingsRef = useRef<AppSettings>(settings);
  const queueRef = useRef<string[]>([]);
  const isProcessingRef = useRef<boolean>(false);
  const batchStatsRef = useRef<{ total: number; ok: number; failed: number; errorToasts: number }>({
    total: 0,
    ok: 0,
    failed: 0,
    errorToasts: 0
  });

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const toastTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const timer = toastTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: 'success' | 'error' | 'info', text: string, actionLabel?: string, onAction?: () => void) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setToasts((prev) => [...prev.slice(-4), { id, type, text, actionLabel, onAction }]);
      const timer = setTimeout(() => {
        toastTimers.current.delete(id);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, type === 'error' ? 9000 : 5000);
      toastTimers.current.set(id, timer);
    },
    []
  );

  useEffect(() => {
    const timers = toastTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const updateFile = useCallback((id: string, patch: Partial<FileQueueItem>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  // Vault-Daten laden (Baum, Routing, Erkennung)
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

  // ---------------------------------------------------------------------------
  // Konvertierungs-Warteschlange: immer nur eine Datei gleichzeitig
  // ---------------------------------------------------------------------------

  const convertOne = useCallback(
    async (fileId: string) => {
      const fileItem = filesRef.current.find((f) => f.id === fileId);
      if (!fileItem) return;

      const currentSettings = settingsRef.current;
      updateFile(fileId, { status: 'converting', error: undefined });

      try {
        const res = await window.electronAPI.convertDocument({
          filePath: fileItem.path,
          addFrontmatter: currentSettings.addFrontmatter,
          tags: currentSettings.defaultTags,
          subject: fileItem.subject
        });

        if (res.success) {
          batchStatsRef.current.ok++;
          updateFile(fileId, { status: 'success', markdown: res.markdown, error: undefined });
        } else {
          batchStatsRef.current.failed++;
          const message = res.error || 'Konvertierungsfehler';
          updateFile(fileId, { status: 'error', error: message });

          // Bei vielen Dateien nicht jeden Fehler einzeln melden – sonst geht die UI unter.
          if (batchStatsRef.current.errorToasts < MAX_ERROR_TOASTS) {
            batchStatsRef.current.errorToasts++;
            addToast('error', `${fileItem.name}: ${message.split('\n')[0]}`);
          }
        }
      } catch (err: any) {
        batchStatsRef.current.failed++;
        const message = err?.message || 'Unerwarteter Fehler';
        updateFile(fileId, { status: 'error', error: message });
        if (batchStatsRef.current.errorToasts < MAX_ERROR_TOASTS) {
          batchStatsRef.current.errorToasts++;
          addToast('error', `${fileItem.name}: ${message}`);
        }
      }
    },
    [addToast, updateFile]
  );

  const pumpQueue = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      while (queueRef.current.length > 0) {
        const nextId = queueRef.current.shift();
        if (!nextId) continue;
        await convertOne(nextId);
      }
    } finally {
      isProcessingRef.current = false;

      const stats = batchStatsRef.current;
      if (stats.total > 1) {
        if (stats.failed === 0) {
          addToast('success', `${stats.ok} Dokumente umgewandelt`);
        } else {
          addToast(
            stats.ok > 0 ? 'info' : 'error',
            `${stats.ok} von ${stats.total} umgewandelt · ${stats.failed} fehlgeschlagen`
          );
        }
      }
      batchStatsRef.current = { total: 0, ok: 0, failed: 0, errorToasts: 0 };
    }
  }, [addToast, convertOne]);

  /** Reiht Dateien ein und startet die Abarbeitung (eine nach der anderen). */
  const enqueueFiles = useCallback(
    (items: Array<{ id: string }>) => {
      const ids = items.map((item) => item.id).filter((id) => !queueRef.current.includes(id));
      if (ids.length === 0) return;

      queueRef.current.push(...ids);
      batchStatsRef.current.total += ids.length;

      setFiles((prev) =>
        prev.map((f) => (ids.includes(f.id) ? { ...f, status: 'queued', error: undefined } : f))
      );

      void pumpQueue();
    },
    [pumpQueue]
  );

  /** Bricht die Warteschlange ab (die laufende Datei wird noch fertig gestellt). */
  const cancelQueue = useCallback(() => {
    const pending = [...queueRef.current];
    queueRef.current = [];
    batchStatsRef.current = { total: 0, ok: 0, failed: 0, errorToasts: 0 };
    if (pending.length > 0) {
      setFiles((prev) => prev.map((f) => (pending.includes(f.id) ? { ...f, status: 'idle' } : f)));
      addToast('info', `${pending.length} Dateien aus der Warteschlange entfernt`);
    }
  }, [addToast]);

  // ---------------------------------------------------------------------------
  // Dateien hinzufügen
  // ---------------------------------------------------------------------------

  const handleFilesAdded = useCallback(
    async (rawPaths: string[]) => {
      if (!rawPaths || rawPaths.length === 0) return;

      let scanned: ScannedFileItem[] = [];
      try {
        if (window.electronAPI?.scanPaths) {
          scanned = await window.electronAPI.scanPaths(rawPaths);
        }
      } catch (err) {
        console.error('ScanPaths Fehler:', err);
      }

      if (!scanned || scanned.length === 0) {
        addToast('error', 'Keine unterstützten Dokumente gefunden.');
        return;
      }

      // Bereits vorhandene Dateien nicht doppelt einreihen
      const knownPaths = new Set(filesRef.current.map((f) => f.path.toLowerCase()));
      const freshItems = scanned.filter((item) => !knownPaths.has(item.path.toLowerCase()));
      const duplicates = scanned.length - freshItems.length;

      if (freshItems.length === 0) {
        addToast('info', 'Diese Dateien sind bereits in der Liste.');
        return;
      }

      const newItems: FileQueueItem[] = freshItems.map((item, index) => ({
        id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 9)}`,
        path: item.path,
        name: item.name,
        size: item.size,
        extension: item.extension,
        status: 'idle',
        relativePath: item.relativePath
      }));

      setFiles((prev) => [...prev, ...newItems]);
      filesRef.current = [...filesRef.current, ...newItems];

      // Auswahl nur setzen, wenn noch nichts gewählt ist oder eine einzelne Datei kam –
      // sonst würde die Ansicht während eines Stapels ständig springen.
      setSelectedId((prev) => (!prev || newItems.length === 1 ? newItems[0].id : prev));

      if (duplicates > 0) {
        addToast('info', `${duplicates} bereits vorhandene Datei(en) übersprungen`);
      }

      if (settingsRef.current.autoConvertOnDrop) {
        enqueueFiles(newItems);
      }
    },
    [addToast, enqueueFiles]
  );

  // Stabile Referenz für Effekte, die sich nicht neu binden sollen
  const handleFilesAddedRef = useRef(handleFilesAdded);
  useEffect(() => {
    handleFilesAddedRef.current = handleFilesAdded;
  }, [handleFilesAdded]);

  // ---------------------------------------------------------------------------
  // Initialisierung (genau einmal)
  // ---------------------------------------------------------------------------

  const didInitRef = useRef(false);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    const init = async () => {
      if (!window.electronAPI) return;

      try {
        const loaded = await window.electronAPI.getSettings();
        if (loaded) {
          setSettings(loaded);
          settingsRef.current = loaded;
          if (loaded.vaultPath) {
            await loadVaultData(loaded.vaultPath);
          }
        }
      } catch (err) {
        console.error('Einstellungen laden fehlgeschlagen:', err);
      }

      try {
        // Dateien aus dem Explorer-Kontextmenü (werden nur einmal ausgeliefert)
        const initialPaths = await window.electronAPI.getInitialPaths();
        if (initialPaths && initialPaths.length > 0) {
          await handleFilesAddedRef.current(initialPaths);
        }
      } catch (err) {
        console.error('Startpfade laden fehlgeschlagen:', err);
      }

      try {
        // Voraussetzungen im Hintergrund prüfen – blockiert den Start nicht
        const status = await window.electronAPI.checkPythonEnvironment();
        setEnvStatus(status);
      } catch (err) {
        console.error('Umgebungsprüfung fehlgeschlagen:', err);
      }
    };

    void init();
  }, [loadVaultData]);

  // Zweite Instanz (Explorer-Kontextmenü bei laufender App)
  useEffect(() => {
    if (!window.electronAPI?.onOpenExternalPaths) return;
    return window.electronAPI.onOpenExternalPaths((paths) => {
      if (paths && paths.length > 0) {
        void handleFilesAddedRef.current(paths);
      }
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Aktionen
  // ---------------------------------------------------------------------------

  const handleSaveSettings = async (newSettings: AppSettings) => {
    const vaultChanged = newSettings.vaultPath !== settings.vaultPath;
    const pythonChanged = newSettings.customPythonPath !== settings.customPythonPath;

    setSettings(newSettings);
    settingsRef.current = newSettings;
    await window.electronAPI.saveSettings(newSettings);

    if (vaultChanged && newSettings.vaultPath) {
      await loadVaultData(newSettings.vaultPath);

      const isVault = await window.electronAPI.checkIsObsidianVault(newSettings.vaultPath);
      const routing = await window.electronAPI.getVaultRouting(newSettings.vaultPath);

      if (isVault && !routing) {
        setIsRoutingFirstTime(true);
        setIsRoutingOpen(true);
      }
    } else if (vaultChanged) {
      await loadVaultData('');
    }

    if (pythonChanged) {
      try {
        setEnvStatus(await window.electronAPI.checkPythonEnvironment(newSettings.customPythonPath));
      } catch {
        /* Diagnose ist optional */
      }
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

  const handleSelectFilesDialog = async () => {
    try {
      const selected = await window.electronAPI.selectFiles();
      if (selected && selected.length > 0) {
        await handleFilesAdded(selected);
      }
    } catch (err) {
      console.error('Dateiauswahl-Fehler:', err);
    }
  };

  const handleUpdateContent = (content: string) => {
    if (!selectedId) return;
    updateFile(selectedId, { markdown: content });
  };

  const handleRemoveFile = (id: string) => {
    queueRef.current = queueRef.current.filter((queuedId) => queuedId !== id);
    setFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== id);
      setSelectedId((current) => (current === id ? (filtered.length > 0 ? filtered[0].id : null) : current));
      return filtered;
    });
  };

  const handleSaveToVault = async (subfolder: string, fileName: string): Promise<string | null> => {
    const current = filesRef.current.find((f) => f.id === selectedId);
    if (!current || !current.markdown) return null;

    try {
      const res = await window.electronAPI.saveNote({
        vaultPath: settings.vaultPath,
        subfolder,
        fileName,
        content: current.markdown
      });

      if (res.success && res.savedPath) {
        addToast('success', 'Gespeichert in Vault', 'Öffnen', () =>
          window.electronAPI.openInObsidian(settings.vaultPath, res.savedPath!)
        );
        return res.savedPath;
      }
      addToast('error', `Fehler: ${res.error}`);
      return null;
    } catch (e: any) {
      addToast('error', `Fehler: ${e.message}`);
      return null;
    }
  };

  const handleSaveCustom = async (fileName: string): Promise<string | null> => {
    const current = filesRef.current.find((f) => f.id === selectedId);
    if (!current || !current.markdown) return null;

    try {
      const targetPath = await window.electronAPI.saveFileDialog(fileName, settings.vaultPath);
      if (!targetPath) return null;

      const res = await window.electronAPI.saveCustomNote(targetPath, current.markdown);
      if (res.success && res.savedPath) {
        addToast('success', 'Gespeichert', 'Im Explorer zeigen', () =>
          window.electronAPI.openInExplorer(res.savedPath!)
        );
        return res.savedPath;
      }
      addToast('error', `Fehler: ${res.error}`);
      return null;
    } catch (e: any) {
      addToast('error', `Fehler: ${e.message}`);
      return null;
    }
  };

  const handleOpenInObsidian = async (filePath: string) => {
    await window.electronAPI.openInObsidian(settings.vaultPath, filePath);
  };

  const handleBatchExport = async () => {
    if (files.length === 0) return;

    try {
      const targetDir = await window.electronAPI.selectDirectory('Zielordner für Markdown-Export auswählen');
      if (!targetDir) return;

      const itemsToExport = files
        .filter((f) => f.markdown && f.status === 'success')
        .map((f) => {
          const dotIndex = f.name.lastIndexOf('.');
          const stem = dotIndex > 0 ? f.name.substring(0, dotIndex) : f.name;
          const mdName = `${stem}.md`;

          let relPath = f.relativePath || mdName;
          const relDot = relPath.lastIndexOf('.');
          if (relDot > 0) {
            relPath = `${relPath.substring(0, relDot)}.md`;
          }

          return { fileName: mdName, relativePath: relPath, content: f.markdown! };
        });

      if (itemsToExport.length === 0) {
        addToast('error', 'Keine fertig konvertierten Notizen zum Exportieren vorhanden.');
        return;
      }

      const res = await window.electronAPI.batchExport(targetDir, itemsToExport);
      if (res.success) {
        addToast('success', `${res.exportedCount} Dokumente exportiert`, 'Im Explorer zeigen', () =>
          window.electronAPI.openInExplorer(targetDir)
        );
      } else {
        addToast('error', `Fehler beim Batch-Export: ${res.error}`);
      }
    } catch (err: any) {
      addToast('error', `Batch-Export Fehler: ${err.message}`);
    }
  };

  const handleSelectVault = async () => {
    try {
      const selected = await window.electronAPI.selectDirectory('Obsidian Vault Ordner auswählen');
      if (selected) {
        await handleSaveSettings({ ...settings, vaultPath: selected });
      }
    } catch (err) {
      console.error('Vault-Auswahl Fehler:', err);
    }
  };

  /** Liest die echten Pfade abgelegter Dateien (Electron >= 32: kein File.path mehr). */
  const pathsFromDataTransfer = (dataTransfer: DataTransfer): string[] => {
    return Array.from(dataTransfer.files)
      .map((file) => {
        try {
          const viaApi = window.electronAPI?.getPathForFile?.(file);
          if (viaApi) return viaApi;
        } catch {
          /* Fallback unten */
        }
        return (file as unknown as { path?: string }).path || '';
      })
      .filter(Boolean);
  };

  const handleWindowDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasVault) setIsGlobalDragOver(true);
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
    if (!hasVault) return;

    const paths = pathsFromDataTransfer(e.dataTransfer);
    if (paths.length > 0) {
      void handleFilesAdded(paths);
    } else if (e.dataTransfer.files.length > 0) {
      addToast('error', 'Pfad der abgelegten Datei konnte nicht ermittelt werden. Bitte über "Dateien hinzufügen" auswählen.');
    }
  };

  const handleRunSetup = useCallback(async () => {
    try {
      const res = await window.electronAPI.installPythonRequirements();
      if (res.status) setEnvStatus(res.status);
      if (res.success) {
        addToast('success', 'Alle Voraussetzungen wurden installiert.');
        // Fehlgeschlagene Dateien direkt erneut versuchen
        const failed = filesRef.current.filter((f) => f.status === 'error');
        if (failed.length > 0) enqueueFiles(failed);
      } else {
        addToast('error', res.error || 'Einrichtung fehlgeschlagen.');
      }
      return res;
    } catch (err: any) {
      addToast('error', `Einrichtung fehlgeschlagen: ${err.message}`);
      return { success: false, log: '', error: err.message };
    }
  }, [addToast, enqueueFiles]);

  const refreshEnvStatus = useCallback(async () => {
    try {
      setEnvStatus(await window.electronAPI.checkPythonEnvironment());
    } catch {
      /* Diagnose ist optional */
    }
  }, []);

  const currentSelectedFile = files.find((f) => f.id === selectedId) || null;
  const queuedCount = files.filter((f) => f.status === 'queued').length;
  const convertingCount = files.filter((f) => f.status === 'converting').length;
  const doneCount = files.filter((f) => f.status === 'success' || f.status === 'error').length;

  // Onboarding: noch kein Vault gewählt
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
            <button className="btn-glass onboarding-skip" onClick={() => setIsSettingsOpen(true)}>
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
          onEnvStatusChange={setEnvStatus}
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
      {isGlobalDragOver && (
        <div className="global-drag-overlay">
          <Upload size={32} color="#ffffff" />
          <span>Dateien loslassen</span>
        </div>
      )}

      <Header
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        files={files}
        selectedId={selectedId}
        onSelectFile={setSelectedId}
        onRemoveFile={handleRemoveFile}
        onAddFiles={handleSelectFilesDialog}
        onBatchExport={handleBatchExport}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        queuedCount={queuedCount}
        isConverting={convertingCount > 0}
        doneCount={doneCount}
        onCancelQueue={cancelQueue}
      />

      <SetupBanner
        status={envStatus}
        onRunSetup={handleRunSetup}
        onRefresh={refreshEnvStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="main-workspace">
        {files.length === 0 ? (
          <DropZone onFilesAdded={handleFilesAdded} />
        ) : (
          <>
            <MarkdownPreview
              currentFile={currentSelectedFile}
              viewMode={viewMode}
              onConvertSingle={(file) => enqueueFiles([file])}
              onUpdateContent={handleUpdateContent}
              onRemoveFile={handleRemoveFile}
              onRunSetup={handleRunSetup}
              queuePosition={
                currentSelectedFile
                  ? queueRef.current.indexOf(currentSelectedFile.id) + 1
                  : 0
              }
            />

            <QuickSaveBar
              currentFile={currentSelectedFile}
              settings={settings}
              vaultSubfolders={vaultSubfolders}
              folderTree={folderTree}
              vaultRouting={vaultRouting}
              totalFilesCount={files.length}
              onSaveToVault={handleSaveToVault}
              onSaveCustom={handleSaveCustom}
              onBatchExport={handleBatchExport}
              onOpenInObsidian={handleOpenInObsidian}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          </>
        )}
      </main>

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
        onEnvStatusChange={setEnvStatus}
      />

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

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
