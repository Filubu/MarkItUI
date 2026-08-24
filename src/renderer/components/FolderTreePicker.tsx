import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Home } from 'lucide-react';
import { FolderTreeNode } from '../../shared/types';

interface FolderTreePickerProps {
  tree: FolderTreeNode[];
  selectedPath: string;
  onSelect: (path: string) => void;
}

const TreeNode: React.FC<{
  node: FolderTreeNode;
  depth: number;
  selectedPath: string;
  onSelect: (path: string) => void;
}> = ({ node, depth, selectedPath, onSelect }) => {
  const [expanded, setExpanded] = useState(
    // Auto-expand if selected path is within this node
    selectedPath.startsWith(node.path + '/') || selectedPath === node.path
  );

  const isSelected = selectedPath === node.path;
  const hasChildren = node.children.length > 0;

  return (
    <div className="tree-node-group">
      <div
        className={`tree-node ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${12 + depth * 18}px` }}
        onClick={() => onSelect(node.path)}
      >
        {hasChildren ? (
          <button
            className="tree-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        ) : (
          <span className="tree-toggle-spacer" />
        )}
        {expanded && hasChildren ? (
          <FolderOpen size={14} className="tree-folder-icon" />
        ) : (
          <Folder size={14} className="tree-folder-icon" />
        )}
        <span className="tree-node-label">{node.name}</span>
      </div>
      {expanded && hasChildren && (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FolderTreePicker: React.FC<FolderTreePickerProps> = ({
  tree,
  selectedPath,
  onSelect
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const displayPath = selectedPath || '/ (Hauptverzeichnis)';

  return (
    <div className="folder-tree-picker" ref={pickerRef}>
      <button
        className="folder-tree-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title={`Zielordner: ${displayPath}`}
      >
        <Folder size={13} />
        <span className="folder-tree-trigger-text">
          {selectedPath ? selectedPath.split('/').pop() || selectedPath : 'Hauptverzeichnis'}
        </span>
        <ChevronDown size={11} className={`folder-tree-chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="folder-tree-dropdown">
          <div className="folder-tree-header">Zielordner wählen</div>
          <div className="folder-tree-scroll">
            {/* Root entry */}
            <div
              className={`tree-node root-node ${!selectedPath ? 'selected' : ''}`}
              onClick={() => {
                onSelect('');
                setIsOpen(false);
              }}
            >
              <Home size={14} className="tree-folder-icon" />
              <span className="tree-node-label">Hauptverzeichnis</span>
            </div>

            {tree.map((node) => (
              <TreeNode
                key={node.path}
                node={node}
                depth={0}
                selectedPath={selectedPath}
                onSelect={(p) => {
                  onSelect(p);
                  setIsOpen(false);
                }}
              />
            ))}

            {tree.length === 0 && (
              <div className="tree-empty">Keine Unterordner vorhanden</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
