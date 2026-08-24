import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronRight, FolderTree, Save } from 'lucide-react';
import { VaultRouting, VaultRoute, FolderTreeNode } from '../../shared/types';
import { FolderTreePicker } from './FolderTreePicker';

interface VaultRoutingModalProps {
  isOpen: boolean;
  vaultPath: string;
  vaultName: string;
  existingRouting: VaultRouting | null;
  folderTree: FolderTreeNode[];
  onClose: () => void;
  onSave: (routing: VaultRouting) => void;
  onSkip?: () => void;
  isFirstTime: boolean;
}

const RouteEditor: React.FC<{
  route: VaultRoute;
  index: number;
  folderTree: FolderTreeNode[];
  onChange: (index: number, updated: VaultRoute) => void;
  onRemove: (index: number) => void;
}> = ({ route, index, folderTree, onChange, onRemove }) => {
  const [showSubRoutes, setShowSubRoutes] = useState(
    (route.subRoutes && route.subRoutes.length > 0) || false
  );

  const handleAddSubRoute = () => {
    const newSubs = [...(route.subRoutes || []), { label: '', targetFolder: '' }];
    onChange(index, { ...route, subRoutes: newSubs });
    setShowSubRoutes(true);
  };

  const handleSubRouteChange = (subIdx: number, field: keyof VaultRoute, value: string) => {
    const subs = [...(route.subRoutes || [])];
    subs[subIdx] = { ...subs[subIdx], [field]: value };
    onChange(index, { ...route, subRoutes: subs });
  };

  const handleRemoveSubRoute = (subIdx: number) => {
    const subs = (route.subRoutes || []).filter((_, i) => i !== subIdx);
    onChange(index, { ...route, subRoutes: subs.length > 0 ? subs : undefined });
    if (subs.length === 0) setShowSubRoutes(false);
  };

  return (
    <div className="routing-entry" style={{ '--i': index } as React.CSSProperties}>
      <div className="routing-entry-main">
        <input
          type="text"
          className="form-input routing-label-input"
          value={route.label}
          onChange={(e) => onChange(index, { ...route, label: e.target.value })}
          placeholder="z.B. Herr Müller, LF01..."
        />
        <span className="routing-arrow">→</span>
        <FolderTreePicker
          tree={folderTree}
          selectedPath={route.targetFolder}
          onSelect={(path) => onChange(index, { ...route, targetFolder: path })}
        />
        <button
          className="btn-icon-minimal routing-sub-toggle"
          onClick={() => setShowSubRoutes(!showSubRoutes)}
          title="Unterordner / Themen"
        >
          {showSubRoutes ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <button
          className="btn-icon-minimal routing-remove-btn"
          onClick={() => onRemove(index)}
          title="Zuordnung entfernen"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {showSubRoutes && (
        <div className="routing-subroutes">
          <div className="routing-subroutes-label">Themen / Unterordner</div>
          {(route.subRoutes || []).map((sub, subIdx) => (
            <div key={subIdx} className="routing-subentry">
              <input
                type="text"
                className="form-input routing-label-input"
                value={sub.label}
                onChange={(e) => handleSubRouteChange(subIdx, 'label', e.target.value)}
                placeholder="z.B. Netzwerke, Datenbanken..."
              />
              <span className="routing-arrow">→</span>
              <input
                type="text"
                className="form-input routing-folder-input"
                value={sub.targetFolder}
                onChange={(e) => handleSubRouteChange(subIdx, 'targetFolder', e.target.value)}
                placeholder="Unterordner-Name"
              />
              <button
                className="btn-icon-minimal routing-remove-btn"
                onClick={() => handleRemoveSubRoute(subIdx)}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button className="btn-glass routing-add-sub" onClick={handleAddSubRoute}>
            <Plus size={12} /> Thema hinzufügen
          </button>
        </div>
      )}
    </div>
  );
};

export const VaultRoutingModal: React.FC<VaultRoutingModalProps> = ({
  isOpen,
  vaultPath,
  vaultName,
  existingRouting,
  folderTree,
  onClose,
  onSave,
  onSkip,
  isFirstTime
}) => {
  const [routes, setRoutes] = useState<VaultRoute[]>(
    existingRouting?.routes || []
  );

  useEffect(() => {
    if (existingRouting?.routes) {
      setRoutes(existingRouting.routes);
    } else {
      setRoutes([]);
    }
  }, [existingRouting]);

  if (!isOpen) return null;

  const handleAddRoute = () => {
    setRoutes([...routes, { label: '', targetFolder: '' }]);
  };

  const handleChangeRoute = (index: number, updated: VaultRoute) => {
    const newRoutes = [...routes];
    newRoutes[index] = updated;
    setRoutes(newRoutes);
  };

  const handleRemoveRoute = (index: number) => {
    setRoutes(routes.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    // Filter empty routes
    const validRoutes = routes.filter((r) => r.label.trim() || r.targetFolder.trim());
    const routing: VaultRouting = {
      vaultName: vaultName,
      description: 'MarkItUI Routing-Konfiguration – Zuordnung von Lehrern/Lernfeldern zu Ordnern. Diese Datei kann auch händisch bearbeitet werden.',
      routes: validRoutes
    };
    onSave(routing);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog routing-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">
            <FolderTree size={15} style={{ marginRight: '8px', opacity: 0.7 }} />
            {isFirstTime ? 'Obsidian Vault erkannt' : 'Vault-Routing bearbeiten'}
          </div>
          <button className="btn-icon-minimal" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div className="modal-content">
          {isFirstTime && (
            <div className="routing-intro">
              <p>
                <strong>{vaultName}</strong> ist ein Obsidian Vault. Du kannst eine
                Routing-Konfiguration anlegen, um Dateien schneller in die richtigen
                Ordner zu sortieren.
              </p>
              <p className="routing-intro-sub">
                Lege Zuordnungen an wie: <em>Lehrer → Ordner</em> oder <em>Lernfeld → Ordner</em>.
                Jede Zuordnung kann Unterordner für Themen haben.
                Die Konfiguration wird als <code>.markitui-routing.json</code> im Vault gespeichert
                und kann auch händisch bearbeitet werden.
              </p>
            </div>
          )}

          <div className="routing-list">
            {routes.length === 0 && (
              <div className="routing-empty">
                Noch keine Zuordnungen. Klicke auf "Zuordnung hinzufügen" um zu starten.
              </div>
            )}
            {routes.map((route, index) => (
              <RouteEditor
                key={index}
                route={route}
                index={index}
                folderTree={folderTree}
                onChange={handleChangeRoute}
                onRemove={handleRemoveRoute}
              />
            ))}
          </div>

          <button className="btn-glass routing-add-main" onClick={handleAddRoute}>
            <Plus size={13} /> Zuordnung hinzufügen
          </button>
        </div>

        <div className="modal-foot">
          {isFirstTime && onSkip && (
            <button className="btn-glass" onClick={onSkip}>
              Überspringen
            </button>
          )}
          <button className="btn-glass" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn-solid-white" onClick={handleSave}>
            <Save size={13} />
            {isFirstTime ? 'Routing anlegen' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
};
