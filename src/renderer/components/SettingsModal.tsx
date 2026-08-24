import React, { useState, useEffect } from 'react';
import { X, Folder, FolderTree } from 'lucide-react';
import { AppSettings } from '../../shared/types';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  isObsidianVault: boolean;
  hasRouting: boolean;
  onClose: () => void;
  onSave: (newSettings: AppSettings) => void;
  onOpenRouting: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  isObsidianVault,
  hasRouting,
  onClose,
  onSave,
  onOpenRouting
}) => {
  const [form, setForm] = useState<AppSettings>({ ...settings });
  const [tagsInput, setTagsInput] = useState<string>(settings.defaultTags.join(', '));

  // Sync form when settings change externally
  useEffect(() => {
    setForm({ ...settings });
    setTagsInput(settings.defaultTags.join(', '));
  }, [settings]);

  if (!isOpen) return null;

  const handleBrowseVault = async () => {
    try {
      const selected = await window.electronAPI.selectDirectory('Obsidian Vault Ordner auswählen (z.B. auf SSD)');
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
      defaultTags: parsedTags.length > 0 ? parsedTags : ['schule']
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">Einstellungen</div>
          <button className="btn-icon-minimal" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div className="modal-content">
          {/* Vault Path */}
          <div className="form-group">
            <label className="form-label">Obsidian Vault Pfad (z. B. auf SSD)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                style={{ flex: 1 }}
                value={form.vaultPath}
                onChange={(e) => setForm({ ...form, vaultPath: e.target.value })}
                placeholder="D:\MeinVault"
              />
              <button className="btn-glass" onClick={handleBrowseVault}>
                <Folder size={13} />
              </button>
            </div>
            {isObsidianVault && (
              <div className="vault-detected-badge">
                Obsidian Vault erkannt
              </div>
            )}
          </div>

          {/* Vault Routing */}
          {form.vaultPath && (
            <div className="form-group">
              <label className="form-label">Vault-Routing</label>
              <div className="routing-settings-row">
                <div className="routing-settings-info">
                  {hasRouting
                    ? 'Routing-Konfiguration vorhanden'
                    : 'Keine Routing-Konfiguration'}
                </div>
                <button className="btn-glass" onClick={onOpenRouting}>
                  <FolderTree size={13} />
                  {hasRouting ? 'Routing bearbeiten' : 'Routing anlegen'}
                </button>
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="form-group">
            <label className="form-label">Standard Tags</label>
            <input
              type="text"
              className="form-input"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="schule, notizen"
            />
          </div>

          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />

          {/* Switches */}
          <div className="toggle-row">
            <div>
              <div className="toggle-label">YAML Frontmatter einfügen</div>
              <div className="toggle-desc">Titel, Datum und Tags als Metadaten</div>
            </div>
            <input
              type="checkbox"
              style={{ width: '16px', height: '16px', accentColor: '#ffffff', cursor: 'pointer' }}
              checked={form.addFrontmatter}
              onChange={(e) => setForm({ ...form, addFrontmatter: e.target.checked })}
            />
          </div>

          <div className="toggle-row">
            <div>
              <div className="toggle-label">Automatisch in Obsidian öffnen</div>
              <div className="toggle-desc">Öffnet die Notiz direkt nach dem Speichern</div>
            </div>
            <input
              type="checkbox"
              style={{ width: '16px', height: '16px', accentColor: '#ffffff', cursor: 'pointer' }}
              checked={form.autoOpenObsidian}
              onChange={(e) => setForm({ ...form, autoOpenObsidian: e.target.checked })}
            />
          </div>

          <div className="toggle-row">
            <div>
              <div className="toggle-label">Auto-Konvertierung bei Drop</div>
              <div className="toggle-desc">Sofortige MarkItUI-Umwandlung</div>
            </div>
            <input
              type="checkbox"
              style={{ width: '16px', height: '16px', accentColor: '#ffffff', cursor: 'pointer' }}
              checked={form.autoConvertOnDrop}
              onChange={(e) => setForm({ ...form, autoConvertOnDrop: e.target.checked })}
            />
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn-glass" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn-solid-white" onClick={handleSave}>
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
};
