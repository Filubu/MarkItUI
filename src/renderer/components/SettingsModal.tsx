import React, { useState, useEffect } from 'react';
import { X, FolderOpen, FolderTree, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const [dynamicIsVault, setDynamicIsVault] = useState<boolean>(isObsidianVault);

  // Sync form when settings change externally
  useEffect(() => {
    setForm({ ...settings });
    setTagsInput(settings.defaultTags.join(', '));
    setDynamicIsVault(isObsidianVault);
  }, [settings, isObsidianVault]);

  // Live detection of Obsidian vault on path edit
  useEffect(() => {
    if (window.electronAPI && form.vaultPath && form.vaultPath.trim()) {
      const cleanPath = form.vaultPath.replace(/^["']|["']$/g, '').trim();
      window.electronAPI.checkIsObsidianVault(cleanPath).then(setDynamicIsVault).catch(() => setDynamicIsVault(false));
    } else {
      setDynamicIsVault(false);
    }
  }, [form.vaultPath]);

  if (!isOpen) return null;

  const handleBrowseVault = async () => {
    try {
      const selected = await window.electronAPI.selectDirectory('Obsidian Vault Ordner auswählen (z.B. auf SSD oder Festplatte)');
      if (selected) {
        setForm((prev) => ({ ...prev, vaultPath: selected }));
      }
    } catch (err) {
      console.error('Fehler bei Vault-Auswahl:', err);
    }
  };

  const handlePathChange = (val: string) => {
    const cleaned = val.replace(/^["']|["']$/g, '').trimStart();
    setForm({ ...form, vaultPath: cleaned });
  };

  const handleSave = () => {
    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const cleanVaultPath = form.vaultPath.replace(/^["']|["']$/g, '').trim();

    const updated: AppSettings = {
      ...form,
      vaultPath: cleanVaultPath,
      defaultTags: parsedTags.length > 0 ? parsedTags : ['schule']
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">Einstellungen</div>
          <button className="btn-icon-minimal" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div className="modal-content">
          {/* Vault Path */}
          <div className="form-group">
            <label className="form-label">Obsidian Vault Pfad (Speicherort)</label>
            <div className="vault-input-group">
              <input
                type="text"
                className="form-input vault-path-input"
                value={form.vaultPath}
                onChange={(e) => handlePathChange(e.target.value)}
                placeholder="z. B. D:\MeinVault oder C:\Users\...\Obsidian"
                title={form.vaultPath}
                spellCheck={false}
              />
              <button
                type="button"
                className="btn-glass browse-btn"
                onClick={handleBrowseVault}
                title="Ordner über Windows Explorer auswählen"
              >
                <FolderOpen size={13} />
                <span>Ordner wählen</span>
              </button>
            </div>

            {form.vaultPath && dynamicIsVault && (
              <div className="vault-detected-badge success">
                <CheckCircle2 size={12} />
                <span>Gültiger Obsidian Vault (.obsidian Ordner gefunden)</span>
              </div>
            )}

            {form.vaultPath && !dynamicIsVault && (
              <div className="vault-detected-badge info">
                <span>Standard-Ordner (wird als Notiz-Ablageort genutzt)</span>
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
