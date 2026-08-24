import React, { useState } from 'react';
import { X, Folder, Check, HardDrive, Tag, Sliders, FileCode } from 'lucide-react';
import { AppSettings } from '../../shared/types';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSave
}) => {
  const [form, setForm] = useState<AppSettings>({ ...settings });
  const [tagsInput, setTagsInput] = useState<string>(settings.defaultTags.join(', '));

  if (!isOpen) return null;

  const handleBrowseVault = async () => {
    try {
      const selected = await window.electronAPI.selectDirectory('Obsidian Vault Ordner auswählen (z.B. auf deiner SSD)');
      if (selected) {
        setForm((prev) => ({ ...prev, vaultPath: selected }));
      }
    } catch (err) {
      console.error('Fehler bei Vault-Auswahl:', err);
    }
  };

  const handleSave = () => {
    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const updated: AppSettings = {
      ...form,
      defaultTags: parsedTags.length > 0 ? parsedTags : ['schule', 'itslearning']
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} color="var(--accent-primary)" />
            <h3 className="modal-title">Einstellungen</h3>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ border: 'none' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Vault Path */}
          <div className="input-group">
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <HardDrive size={13} /> Obsidian Vault Verzeichnis (z. B. auf portabler SSD)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="app-input"
                style={{ flex: 1 }}
                value={form.vaultPath}
                onChange={(e) => setForm({ ...form, vaultPath: e.target.value })}
                placeholder="D:\MeinObsidianVault"
              />
              <button className="btn btn-secondary" onClick={handleBrowseVault}>
                <Folder size={14} /> Durchsuchen...
              </button>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Die App navigiert beim Speichern immer direkt in diesen Vault.
            </span>
          </div>

          {/* Frontmatter & Tags */}
          <div className="input-group">
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag size={13} /> Standard Obsidian Tags (kommagetrennt)
            </label>
            <input
              type="text"
              className="app-input"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="schule, itslearning, aufgaben"
            />
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Werden automatisch als Tags in das YAML-Frontmatter der Notiz eingefügt.
            </span>
          </div>

          <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />

          {/* Toggle Switches */}
          <div className="switch-row">
            <div>
              <div className="switch-label">YAML Frontmatter generieren</div>
              <div className="switch-desc">Fügt Titel, Datum, Original-Dateiname und Tags oben in die Notiz ein.</div>
            </div>
            <input
              type="checkbox"
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              checked={form.addFrontmatter}
              onChange={(e) => setForm({ ...form, addFrontmatter: e.target.checked })}
            />
          </div>

          <div className="switch-row">
            <div>
              <div className="switch-label">Automatisch in Obsidian öffnen</div>
              <div className="switch-desc">Öffnet die Notiz nach dem Speichern direkt in Obsidian.</div>
            </div>
            <input
              type="checkbox"
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              checked={form.autoOpenObsidian}
              onChange={(e) => setForm({ ...form, autoOpenObsidian: e.target.checked })}
            />
          </div>

          <div className="switch-row">
            <div>
              <div className="switch-label">Auto-Konvertierung bei Drag & Drop</div>
              <div className="switch-desc">Startet die MarkItDown-Umwandlung sofort, wenn eine Datei hineingezogen wird.</div>
            </div>
            <input
              type="checkbox"
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              checked={form.autoConvertOnDrop}
              onChange={(e) => setForm({ ...form, autoConvertOnDrop: e.target.checked })}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Check size={16} /> Einstellungen speichern
          </button>
        </div>
      </div>
    </div>
  );
};
