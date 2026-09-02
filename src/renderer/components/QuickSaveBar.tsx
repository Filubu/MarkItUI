import React, { useState, useEffect } from 'react';
import { Check, ArrowUpRight, FolderPlus, Tag, Archive } from 'lucide-react';
import { AppSettings, FileQueueItem, FolderTreeNode, VaultRouting } from '../../shared/types';
import { FolderTreePicker } from './FolderTreePicker';

interface QuickSaveBarProps {
  currentFile: FileQueueItem | null;
  settings: AppSettings;
  vaultSubfolders: string[];
  folderTree: FolderTreeNode[];
  vaultRouting: VaultRouting | null;
  totalFilesCount?: number;
  onSaveToVault: (subfolder: string, fileName: string) => Promise<string | null>;
  onSaveCustom: (fileName: string) => Promise<string | null>;
  onBatchExport?: () => void;
  onOpenInObsidian: (filePath: string) => void;
  onOpenSettings: () => void;
}

export const QuickSaveBar: React.FC<QuickSaveBarProps> = ({
  currentFile,
  settings,
  vaultSubfolders,
  folderTree,
  vaultRouting,
  totalFilesCount = 1,
  onSaveToVault,
  onSaveCustom,
  onBatchExport,
  onOpenInObsidian,
  onOpenSettings
}) => {
  const [selectedSubfolder, setSelectedSubfolder] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [lastSavedPath, setLastSavedPath] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeRouteLabel, setActiveRouteLabel] = useState<string | null>(null);

  useEffect(() => {
    if (currentFile) {
      const stem = currentFile.name.substring(0, currentFile.name.lastIndexOf('.')) || currentFile.name;
      setFileName(`${stem}.md`);
      setLastSavedPath(null);
      setActiveRouteLabel(null);
    }
  }, [currentFile?.id]);

  useEffect(() => {
    // Das Hauptverzeichnis wird intern als leerer Pfad geführt, damit der
    // Ordner-Picker es korrekt als ausgewählt markiert.
    const isRoot = (value: string) => !value || value === '/' || value === '/ (Hauptverzeichnis)';

    if (settings.defaultSubfolder && vaultSubfolders.includes(settings.defaultSubfolder)) {
      setSelectedSubfolder(isRoot(settings.defaultSubfolder) ? '' : settings.defaultSubfolder);
    } else if (vaultSubfolders.length > 0) {
      setSelectedSubfolder(isRoot(vaultSubfolders[0]) ? '' : vaultSubfolders[0]);
    }
  }, [settings.defaultSubfolder, vaultSubfolders]);

  if (!currentFile || !currentFile.markdown) {
    return null;
  }

  const hasVault = Boolean(settings.vaultPath);

  const handleVaultSave = async () => {
    if (!hasVault) {
      onOpenSettings();
      return;
    }
    setIsSaving(true);
    // Convert empty/root to proper format for save handler
    const subfolder = selectedSubfolder || '/ (Hauptverzeichnis)';
    const saved = await onSaveToVault(subfolder, fileName);
    setIsSaving(false);
    if (saved) {
      setLastSavedPath(saved);
      if (settings.autoOpenObsidian) {
        onOpenInObsidian(saved);
      }
    }
  };

  const handleCustomSave = async () => {
    setIsSaving(true);
    const saved = await onSaveCustom(fileName);
    setIsSaving(false);
    if (saved) {
      setLastSavedPath(saved);
    }
  };

  const handleRouteClick = (label: string, targetFolder: string) => {
    setSelectedSubfolder(targetFolder);
    setActiveRouteLabel(label);
  };

  // Flatten routes including sub-routes for display
  const routeChips: Array<{ label: string; targetFolder: string; isSubRoute: boolean }> = [];
  if (vaultRouting?.routes) {
    for (const route of vaultRouting.routes) {
      routeChips.push({ label: route.label, targetFolder: route.targetFolder, isSubRoute: false });
      if (route.subRoutes) {
        for (const sub of route.subRoutes) {
          const fullPath = route.targetFolder
            ? `${route.targetFolder}/${sub.targetFolder}`
            : sub.targetFolder;
          routeChips.push({ label: `${route.label} › ${sub.label}`, targetFolder: fullPath, isSubRoute: true });
        }
      }
    }
  }

  return (
    <div className="save-bar-container">
      {/* Route Quick-Access Chips */}
      {routeChips.length > 0 && (
        <div className="route-chips-bar">
          {routeChips.map((chip, idx) => (
            <button
              key={idx}
              className={`route-chip ${activeRouteLabel === chip.label ? 'active' : ''} ${chip.isSubRoute ? 'sub' : ''}`}
              style={{ '--i': idx } as React.CSSProperties}
              onClick={() => handleRouteClick(chip.label, chip.targetFolder)}
              title={`Ziel: ${chip.targetFolder || 'Hauptverzeichnis'}`}
            >
              <Tag size={10} />
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Main Save Dock */}
      <div className="floating-save-dock">
        {/* File Name Input */}
        <input
          type="text"
          className="ghost-input"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          placeholder="dateiname.md"
          title="Dateiname"
        />

        {/* Folder Tree Picker */}
        {hasVault ? (
          <FolderTreePicker
            tree={folderTree}
            selectedPath={selectedSubfolder}
            vaultPath={settings.vaultPath}
            onSelect={(path) => {
              setSelectedSubfolder(path);
              setActiveRouteLabel(null);
            }}
            onChangeVault={onOpenSettings}
          />
        ) : (
          <button
            className="btn-glass"
            onClick={onOpenSettings}
          >
            <FolderPlus size={13} /> Vault wählen
          </button>
        )}

        {/* Custom Save */}
        <button
          className="btn-glass"
          onClick={handleCustomSave}
          disabled={isSaving}
          title="An beliebigem Ort speichern"
        >
          Speichern unter...
        </button>

        {/* Batch Export / Unzip if multiple files */}
        {totalFilesCount > 1 && onBatchExport && (
          <button
            className="btn-glass batch-export-btn"
            onClick={onBatchExport}
            disabled={isSaving}
            title="Alle konvertierten Notizen in einen Ordner entpacken/exportieren"
          >
            <Archive size={13} />
            <span>Alle exportieren</span>
            <span className="batch-count-badge">{totalFilesCount}</span>
          </button>
        )}

        {/* Open in Obsidian Link if saved */}
        {lastSavedPath && (
          <button
            className="btn-glass"
            onClick={() => onOpenInObsidian(lastSavedPath)}
            title="In Obsidian öffnen"
          >
            Obsidian <ArrowUpRight size={12} />
          </button>
        )}

        {/* Primary Save to Vault Button */}
        <button
          className="btn-solid-white"
          onClick={handleVaultSave}
          disabled={isSaving}
          title={hasVault ? `In Obsidian Vault ablegen (${selectedSubfolder || 'Hauptverzeichnis'})` : 'Zuerst Vault wählen'}
        >
          {lastSavedPath ? <Check size={14} /> : null}
          {hasVault ? 'In Vault speichern' : 'Vault wählen & speichern'}
        </button>
      </div>
    </div>
  );
};
