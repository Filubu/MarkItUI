import React from 'react';
import { FileQueueItem } from '../../shared/types';
import { Trash2, Play, Check, AlertCircle, Loader2, FileCode } from 'lucide-react';

interface FileQueueProps {
  files: FileQueueItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onConvertAll: () => void;
  isConvertingAny: boolean;
}

export const FileQueue: React.FC<FileQueueProps> = ({
  files,
  selectedId,
  onSelect,
  onRemove,
  onClearAll,
  onConvertAll,
  isConvertingAny
}) => {
  if (files.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', color: 'var(--text-dim)', textAlign: 'center' }}>
        Keine Dateien in der Warteschlange.<br />Ziehe Dateien aus deinem Download-Ordner hierher.
      </div>
    );
  }

  const unconvertedCount = files.filter(f => f.status === 'idle').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="queue-header">
        <span>Warteschlange ({files.length})</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {unconvertedCount > 0 && (
            <button
              className="btn btn-primary"
              style={{ padding: '3px 8px', fontSize: '11px' }}
              onClick={onConvertAll}
              disabled={isConvertingAny}
              title="Alle noch nicht konvertierten Dateien umwandeln"
            >
              <Play size={11} /> Alle ({unconvertedCount})
            </button>
          )}
          <button
            className="btn btn-outline"
            style={{ padding: '3px 8px', fontSize: '11px' }}
            onClick={onClearAll}
            title="Liste leeren"
          >
            Leeren
          </button>
        </div>
      </div>

      <div className="file-list">
        {files.map((file) => {
          const isSelected = file.id === selectedId;
          const ext = file.extension.replace('.', '').toLowerCase();

          return (
            <div
              key={file.id}
              className={`file-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelect(file.id)}
            >
              <div className="file-item-info">
                <span className={`file-ext-badge ${ext}`}>{ext}</span>
                <div style={{ overflow: 'hidden' }}>
                  <div className="file-name" title={file.name}>
                    {file.name}
                  </div>
                  <div className="file-meta">
                    {file.status === 'success' && file.markdown ? (
                      <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Check size={11} /> Bereit zum Speichern
                      </span>
                    ) : file.status === 'converting' ? (
                      <span style={{ color: 'var(--warning)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Loader2 size={11} className="spin" /> Konvertiere...
                      </span>
                    ) : file.status === 'error' ? (
                      <span style={{ color: 'var(--error)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <AlertCircle size={11} /> Fehler
                      </span>
                    ) : (
                      <span>Nicht konvertiert</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                className="btn-icon"
                style={{ padding: '4px', border: 'none' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(file.id);
                }}
                title="Aus Liste entfernen"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
