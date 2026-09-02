import React from 'react';
import { Plus, X, Settings, Eye, Columns, Code, Archive, Loader2, ListOrdered } from 'lucide-react';
import { AppSettings, FileQueueItem } from '../../shared/types';

interface HeaderProps {
  settings: AppSettings;
  onOpenSettings: () => void;
  files: FileQueueItem[];
  selectedId: string | null;
  onSelectFile: (id: string) => void;
  onRemoveFile: (id: string) => void;
  onAddFiles: () => void;
  onBatchExport?: () => void;
  viewMode: 'preview' | 'split' | 'raw';
  onChangeViewMode: (mode: 'preview' | 'split' | 'raw') => void;
  /** Anzahl wartender Dateien in der Konvertierungs-Warteschlange */
  queuedCount?: number;
  /** Läuft gerade eine Konvertierung? */
  isConverting?: boolean;
  /** Bereits abgeschlossene Dateien (Erfolg oder Fehler) */
  doneCount?: number;
  onCancelQueue?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onOpenSettings,
  files,
  selectedId,
  onSelectFile,
  onRemoveFile,
  onAddFiles,
  onBatchExport,
  viewMode,
  onChangeViewMode,
  queuedCount = 0,
  isConverting = false,
  doneCount = 0,
  onCancelQueue
}) => {
  const queueActive = isConverting || queuedCount > 0;
  const totalInBatch = doneCount + queuedCount + (isConverting ? 1 : 0);
  return (
    <header className="app-topbar">
      {/* Left: File Tabs */}
      <div className="topbar-left-tabs">
        {files.map((f, index) => {
          const isActive = f.id === selectedId;
          const statusClass =
            f.status === 'converting'
              ? 'converting'
              : f.status === 'queued'
                ? 'queued'
                : f.status === 'success'
                  ? 'success'
                  : f.status === 'error'
                    ? 'error'
                    : '';

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
        {queueActive && (
          <div className="queue-status-pill" title="Dateien werden nacheinander umgewandelt">
            {isConverting ? <Loader2 size={12} className="spin" /> : <ListOrdered size={12} />}
            <span>
              {doneCount}/{totalInBatch} umgewandelt
              {queuedCount > 0 ? ` · ${queuedCount} in Warteschlange` : ''}
            </span>
            {queuedCount > 0 && onCancelQueue && (
              <button className="queue-cancel-btn" onClick={onCancelQueue} title="Warteschlange leeren">
                <X size={11} />
              </button>
            )}
          </div>
        )}

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

        {files.length > 1 && onBatchExport && (
          <button
            className="btn-glass batch-export-btn"
            onClick={onBatchExport}
            title={`Alle ${files.length} Notizen exportieren / entpacken`}
          >
            <Archive size={13} />
            <span>Exportieren</span>
          </button>
        )}

        <button className="btn-icon-minimal" onClick={onOpenSettings} title="Einstellungen">
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
};
