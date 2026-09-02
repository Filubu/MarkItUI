import React, { useState, useEffect } from 'react';
import {
  X,
  FolderOpen,
  FolderTree,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Terminal,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  Cpu,
  Download
} from 'lucide-react';
import { AppSettings, PythonEnvironmentStatus, InstallProgressEvent } from '../../shared/types';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  isObsidianVault: boolean;
  hasRouting: boolean;
  onClose: () => void;
  onSave: (newSettings: AppSettings) => void;
  onOpenRouting: () => void;
  /** Meldet den aktuellen Zustand der Python-Umgebung an die App zurück */
  onEnvStatusChange?: (status: PythonEnvironmentStatus) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  isObsidianVault,
  hasRouting,
  onClose,
  onSave,
  onOpenRouting,
  onEnvStatusChange
}) => {
  const [form, setForm] = useState<AppSettings>({ ...settings });
  const [tagsInput, setTagsInput] = useState<string>(settings.defaultTags.join(', '));
  const [dynamicIsVault, setDynamicIsVault] = useState<boolean>(isObsidianVault);
  
  // Environment Doctor State
  const [envStatus, setEnvStatus] = useState<PythonEnvironmentStatus | null>(null);
  const [isCheckingEnv, setIsCheckingEnv] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);
  const [installLog, setInstallLog] = useState<string>('');
  const [progress, setProgress] = useState<InstallProgressEvent | null>(null);

  // Live-Fortschritt der Installation aus dem Main-Prozess
  useEffect(() => {
    if (!window.electronAPI?.onInstallProgress) return;
    return window.electronAPI.onInstallProgress((event) => {
      setProgress(event);
      setInstallLog(event.message);
    });
  }, []);

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

  // Check Python Environment on modal open
  const runEnvCheck = async (customPath?: string) => {
    if (!window.electronAPI || !window.electronAPI.checkPythonEnvironment) return;
    setIsCheckingEnv(true);
    try {
      const status = await window.electronAPI.checkPythonEnvironment(customPath || form.customPythonPath);
      setEnvStatus(status);
      onEnvStatusChange?.(status);
    } catch (e: any) {
      setEnvStatus({
        isReady: false,
        pythonFound: false,
        pythonVersion: '',
        pythonPath: '',
        installedPackages: [],
        missingPackages: ['python'],
        hasMarkitdown: false,
        hasPdfplumber: false,
        hasMammoth: false,
        hasPptx: false,
        hasOpenpyxl: false,
        error: e.message
      });
    } finally {
      setIsCheckingEnv(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runEnvCheck();
      setInstallLog('');
    }
  }, [isOpen]);

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

  const handleInstallRequirements = async () => {
    if (!window.electronAPI || !window.electronAPI.installPythonRequirements) return;
    setIsInstalling(true);
    setProgress(null);
    setInstallLog('Einrichtung wird gestartet (installiert bei Bedarf auch Python)...');
    try {
      const res = await window.electronAPI.installPythonRequirements(form.customPythonPath);
      if (res.status) {
        setEnvStatus(res.status);
        onEnvStatusChange?.(res.status);
      }
      if (res.success) {
        setInstallLog('Installation erfolgreich abgeschlossen.');
      } else {
        setInstallLog(res.error || 'Fehler bei der Installation.');
      }
      if (!res.status) {
        await runEnvCheck();
      }
    } catch (err: any) {
      setInstallLog(`Fehler: ${err.message}`);
    } finally {
      setIsInstalling(false);
      setProgress(null);
    }
  };

  const handleInstallPython = async () => {
    if (!window.electronAPI?.ensurePythonInstalled) return;
    setIsInstalling(true);
    setInstallLog('Python wird installiert – das kann einige Minuten dauern...');
    try {
      const res = await window.electronAPI.ensurePythonInstalled();
      setInstallLog(res.success ? `Python bereit: ${res.pythonPath}` : res.error || 'Python-Installation fehlgeschlagen.');
      await runEnvCheck();
    } catch (err: any) {
      setInstallLog(`Fehler: ${err.message}`);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleOpenSetupScript = async () => {
    if (window.electronAPI && window.electronAPI.openSetupScript) {
      await window.electronAPI.openSetupScript();
    }
  };

  const handleCopyTerminalCommand = () => {
    const cmd =
      'pip install "markitdown[docx,pdf,pptx,xlsx,xls]" pdfplumber pypdfium2 pdfminer.six mammoth ' +
      'python-docx python-pptx openpyxl xlrd beautifulsoup4 puremagic markdown pygments';
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2500);
  };

  const handleSave = () => {
    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const cleanVaultPath = form.vaultPath.replace(/^["']|["']$/g, '').trim();
    const cleanPythonPath = form.customPythonPath ? form.customPythonPath.replace(/^["']|["']$/g, '').trim() : undefined;

    const updated: AppSettings = {
      ...form,
      vaultPath: cleanVaultPath,
      customPythonPath: cleanPythonPath || undefined,
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
          {/* Python Environment & Doctor Section */}
          <div className="form-group env-doctor-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cpu size={13} />
                <span>Python &amp; Konverter-Voraussetzungen</span>
              </label>
              <button
                type="button"
                className="btn-glass"
                style={{ padding: '3px 8px', fontSize: '11px' }}
                onClick={() => runEnvCheck()}
                disabled={isCheckingEnv}
                title="Umgebung erneut prüfen"
              >
                {isCheckingEnv ? <Loader2 size={11} className="spin" /> : <RefreshCw size={11} />}
                <span>Prüfen</span>
              </button>
            </div>

            {/* Status Card */}
            <div className="env-status-card">
              {envStatus ? (
                <>
                  <div className="env-status-header">
                    {envStatus.isReady ? (
                      <div className="env-status-pill success">
                        <CheckCircle2 size={12} />
                        <span>Bereit (Python {envStatus.pythonVersion || 'aktiv'})</span>
                      </div>
                    ) : (
                      <div className="env-status-pill warning">
                        <AlertCircle size={12} />
                        <span>Voraussetzungen unvollständig</span>
                      </div>
                    )}
                    {envStatus.pythonPath && (
                      <span className="env-path-label" title={envStatus.pythonPath}>
                        {envStatus.pythonPath.length > 40
                          ? '...' + envStatus.pythonPath.slice(-37)
                          : envStatus.pythonPath}
                      </span>
                    )}
                  </div>

                  {envStatus.missingPackages && envStatus.missingPackages.length > 0 && (
                    <div className="env-missing-info">
                      Fehlend: {envStatus.missingPackages.join(', ')}
                    </div>
                  )}

                  {installLog && <div className="env-install-log">{installLog}</div>}

                  {isInstalling && typeof progress?.percent === 'number' && (
                    <div className="setup-progress-track">
                      <div
                        className="setup-progress-fill"
                        style={{ width: `${Math.min(100, progress.percent)}%` }}
                      />
                    </div>
                  )}

                  <div className="env-action-row">
                    {!envStatus.pythonFound && (
                      <button
                        type="button"
                        className="btn-solid-white env-action-btn"
                        onClick={handleInstallPython}
                        disabled={isInstalling}
                        title="Installiert Python automatisch (winget oder python.org)"
                      >
                        {isInstalling ? <Loader2 size={12} className="spin" /> : <Download size={12} />}
                        <span>Python automatisch installieren</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-solid-white env-action-btn"
                      onClick={handleInstallRequirements}
                      disabled={isInstalling}
                    >
                      {isInstalling ? <Loader2 size={12} className="spin" /> : <Wrench size={12} />}
                      <span>{isInstalling ? 'Installiere...' : '1-Klick Pakete reparieren / installieren'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn-glass env-action-btn"
                      onClick={handleCopyTerminalCommand}
                      title="Befehl für cmd/PowerShell kopieren"
                    >
                      {copiedCmd ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedCmd ? 'Befehl kopiert!' : 'Terminal-Befehl kopieren'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn-glass env-action-btn"
                      onClick={handleOpenSetupScript}
                      title="Startet install_requirements.bat im Terminal"
                    >
                      <Terminal size={12} />
                      <span>Setup-Skript</span>
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  <Loader2 size={12} className="spin" />
                  <span>Prüfe Python-Installation...</span>
                </div>
              )}
            </div>
            {/* Eigener Python-Pfad (falls die automatische Erkennung daneben liegt) */}
            <div className="form-group" style={{ marginTop: '10px' }}>
              <label className="form-label">Eigener Python-Pfad (optional)</label>
              <input
                type="text"
                className="form-input"
                value={form.customPythonPath || ''}
                onChange={(e) =>
                  setForm({ ...form, customPythonPath: e.target.value.replace(/^["']|["']$/g, '').trim() })
                }
                placeholder="z. B. C:\\Users\\Name\\AppData\\Local\\Programs\\Python\\Python312\\python.exe"
                spellCheck={false}
              />
              <div className="toggle-desc" style={{ marginTop: '4px' }}>
                Leer lassen, damit MarkItUI Python automatisch findet.
              </div>
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '2px 0' }} />

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

          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '2px 0' }} />

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
