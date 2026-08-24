import React, { useState } from 'react';
import { Upload, Plus } from 'lucide-react';

interface DropZoneProps {
  onFilesAdded: (filePaths: string[]) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFilesAdded }) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      const paths = droppedFiles
        .map((f: any) => f.path || f.name)
        .filter(Boolean);
      if (paths.length > 0) {
        onFilesAdded(paths);
      }
    }
  };

  const handleClick = async () => {
    try {
      const selected = await window.electronAPI.selectFiles();
      if (selected && selected.length > 0) {
        onFilesAdded(selected);
      }
    } catch (err) {
      console.error('Dateiauswahl-Fehler:', err);
    }
  };

  return (
    <div className="empty-drop-container">
      <div
        className={`empty-drop-box ${isDragActive ? 'drag-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="drop-icon-wrap">
          {isDragActive ? <Upload size={20} /> : <Plus size={20} />}
        </div>
        <div className="drop-headline">Dateien ablegen</div>
        <div className="drop-subtext">oder klicken zum Auswählen</div>

        <div className="format-tags-list">
          {['.PDF', '.DOCX', '.PPTX', '.XLSX', '.CSV', '.TXT'].map((tag, idx) => (
            <span
              key={tag}
              className="format-tag"
              style={{ '--i': idx } as React.CSSProperties}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
