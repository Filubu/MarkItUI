import React from 'react';
import { FileText, Settings, FolderOpen } from 'lucide-react';
import { AppSettings } from '../../shared/types';

interface HeaderProps {
  settings: AppSettings;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ settings, onOpenSettings }) => {
  const hasVault = !!settings.vaultPath;
  const vaultDisplay = hasVault
    ? settings.vaultPath.split(/[\\/]/).filter(Boolean).pop() || settings.vaultPath
    : 'Kein Vault gewählt';

  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-logo">
          <FileText size={22} />
        </div>
        <div className="brand-title">
          MarkItDown
          <span className="brand-badge">FOR OBSIDIAN</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          className="vault-status-indicator"
          onClick={onOpenSettings}
          title={hasVault ? `Verbunden mit: ${settings.vaultPath}` : 'Klicke hier, um deinen Obsidian Vault festzulegen'}
        >
          <FolderOpen size={14} />
          <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {vaultDisplay}
          </span>
          <div className={`status-dot ${hasVault ? 'connected' : 'missing'}`} />
        </div>

        <button className="btn-icon" onClick={onOpenSettings} title="Einstellungen">
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
};
