import React, { useState } from 'react';
import { UploadCloud, Plus } from 'lucide-react';

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

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const paths = files
        // Electron webUtils or file.path gives absolute path
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
    <div className="dropzone-container">
      <div
        className={`dropzone ${isDragActive ? 'active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="dropzone-icon-box">
          {isDragActive ? <UploadCloud size={24} /> : <Plus size={24} />}
        </div>
        <div className="dropzone-title">Dateien hier hineinziehen</div>
        <div className="dropzone-desc">oder klicken, um Schulaufgaben auszuwählen</div>

        <div className="format-tags">
          <span className="format-pill">.DOCX</span>
          <span className="format-pill">.PDF</span>
          <span className="format-pill">.PPTX</span>
          <span className="format-pill">.XLSX</span>
          <span className="format-pill">.CSV</span>
          <span className="format-pill">.TXT</span>
        </div>
      </div>
    </div>
  );
};
