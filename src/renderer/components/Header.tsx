import React from 'react';
import { Plus, X, Settings, Eye, Columns, Code } from 'lucide-react';
import { AppSettings, FileQueueItem } from '../../shared/types';

interface HeaderProps {
  settings: AppSettings;
  onOpenSettings: () => void;
  files: FileQueueItem[];
  selectedId: string | null;
  onSelectFile: (id: string) => void;
  onRemoveFile: (id: string) => void;
  onAddFiles: () => void;
  viewMode: 'preview' | 'split' | 'raw';
  onChangeViewMode: (mode: 'preview' | 'split' | 'raw') => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onOpenSettings,
  files,
  selectedId,
  onSelectFile,
  onRemoveFile,
  onAddFiles,
  viewMode,
  onChangeViewMode
}) => {
  return (
    <header className="app-topbar">
      {/* Left: Brand & File Tabs */}
      <div className="topbar-left-tabs">
        <div className="topbar-brand" title="MarkItUI">
          <img src="app_logo.png" alt="MarkItUI" className="topbar-brand-logo" />
          {files.length === 0 && <span className="topbar-brand-title">MarkItUI</span>}
        </div>

        {files.map((f, index) => {
          const isActive = f.id === selectedId;
          const statusClass = f.status === 'converting' ? 'converting' : f.status === 'success' ? 'success' : f.status === 'error' ? 'error' : '';

          return (
            <div
              key={f.id}
              className={`file-tab ${isActive ? 'active' : ''}`}
              style={{ '--i': index } as React.CSSProperties}
              onClick={() => onSelectFile(f.id)}
              title={f.path}
            >
              <span className={`tab-status-dot ${statusClass}`} />
              <span className="tab-title">{f.name}</span>
              <button
                className="tab-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFile(f.id);
                }}
                title="Schließen"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}

        {files.length > 0 && (
          <button className="tab-add-btn" onClick={onAddFiles} title="Dateien hinzufügen">
            <Plus size={13} />
          </button>
        )}
      </div>

      {/* Right: View Mode Toggle & Settings */}
      <div className="topbar-right">
        {files.length > 0 && (
          <div className="view-mode-group">
            <button
              className={`view-mode-btn ${viewMode === 'preview' ? 'active' : ''}`}
              onClick={() => onChangeViewMode('preview')}
              title="Vorschau"
            >
              <Eye size={13} />
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'split' ? 'active' : ''}`}
              onClick={() => onChangeViewMode('split')}
              title="Split (Editor & Vorschau)"
            >
              <Columns size={13} />
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'raw' ? 'active' : ''}`}
              onClick={() => onChangeViewMode('raw')}
              title="Quelltext Editor"
            >
              <Code size={13} />
            </button>
          </div>
        )}

        <button className="btn-icon-minimal" onClick={onOpenSettings} title="Einstellungen">
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
};
