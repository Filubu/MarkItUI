import React, { useState, useEffect } from 'react';
import { Save, FolderPlus, ExternalLink, HardDrive, Check } from 'lucide-react';
import { AppSettings, FileQueueItem } from '../../shared/types';

interface QuickSaveBarProps {
  currentFile: FileQueueItem | null;
  settings: AppSettings;
  vaultSubfolders: string[];
  onSaveToVault: (subfolder: string, fileName: string) => Promise<string | null>;
  onSaveCustom: (fileName: string) => Promise<string | null>;
  onOpenInObsidian: (filePath: string) => void;
  onOpenSettings: () => void;
}

export const QuickSaveBar: React.FC<QuickSaveBarProps> = ({
  currentFile,
  settings,
  vaultSubfolders,
  onSaveToVault,
  onSaveCustom,
  onOpenInObsidian,
  onOpenSettings
}) => {
  const [selectedSubfolder, setSelectedSubfolder] = useState<string>('');
  const [customFileName, setCustomFileName] = useState<string>('');
  const [lastSavedPath, setLastSavedPath] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize defaults whenever currentFile or settings change
  useEffect(() => {
    if (currentFile) {
      const stem = currentFile.name.substring(0, currentFile.name.lastIndexOf('.')) || currentFile.name;
      setCustomFileName(`${stem}.md`);
      setLastSavedPath(null);
    }
  }, [currentFile?.id]);

  useEffect(() => {
    if (settings.defaultSubfolder && vaultSubfolders.includes(settings.defaultSubfolder)) {
      setSelectedSubfolder(settings.defaultSubfolder);
    } else if (vaultSubfolders.length > 0) {
      setSelectedSubfolder(vaultSubfolders[0]);
    }
  }, [settings.defaultSubfolder, vaultSubfolders]);

  if (!currentFile || !currentFile.markdown) {
    return null;
  }

  const hasVault = !!settings.vaultPath;

  const handleVaultSave = async () => {
    if (!hasVault) {
      onOpenSettings();
      return;
    }
    setIsSaving(true);
    const saved = await onSaveToVault(selectedSubfolder, customFileName);
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
    const saved = await onSaveCustom(customFileName);
    setIsSaving(false);
    if (saved) {
      setLastSavedPath(saved);
    }
  };

  return (
    <div className="save-bar">
      <div className="save-controls-left">
        <div className="input-group" style={{ flex: 1, maxWidth: '280px' }}>
          <label className="input-label">Dateiname</label>
          <input
            type="text"
            className="app-input"
            value={customFileName}
            onChange={(e) => setCustomFileName(e.target.value)}
            placeholder="Aufgabe.md"
          />
        </div>

        {hasVault ? (
          <div className="input-group">
            <label className="input-label">Obsidian Fach / Ordner</label>
            <select
              className="app-select"
              value={selectedSubfolder}
              onChange={(e) => setSelectedSubfolder(e.target.value)}
            >
              {vaultSubfolders.map((folder) => (
                <option key={folder} value={folder}>
                  📁 {folder}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="input-group">
            <label className="input-label">Obsidian Vault</label>
            <button
              className="btn btn-outline"
              onClick={onOpenSettings}
              style={{ fontSize: '12px', padding: '7px 12px' }}
            >
              <FolderPlus size={14} /> Vault-Pfad hinterlegen
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {lastSavedPath && (
          <button
            className="btn btn-secondary"
            onClick={() => onOpenInObsidian(lastSavedPath)}
            title="In Obsidian öffnen"
            style={{ color: '#c4b5fd', borderColor: 'rgba(124, 58, 237, 0.4)' }}
          >
            <ExternalLink size={14} /> In Obsidian öffnen
          </button>
        )}

        <button
          className="btn btn-secondary"
          onClick={handleCustomSave}
          disabled={isSaving}
          title="An einem beliebigen Ort speichern"
        >
          <HardDrive size={14} /> Speichern unter...
        </button>

        <button
          className="btn btn-primary"
          onClick={handleVaultSave}
          disabled={isSaving}
          title={hasVault ? `Im Vault ablegen (${selectedSubfolder})` : 'Zuerst Vault-Pfad konfigurieren'}
        >
          {lastSavedPath ? <Check size={16} /> : <Save size={16} />}
          {hasVault ? 'In Obsidian speichern' : 'Vault wählen & speichern'}
        </button>
      </div>
    </div>
  );
};
