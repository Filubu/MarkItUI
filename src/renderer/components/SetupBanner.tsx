import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Wrench, Settings, X } from 'lucide-react';
import { InstallProgressEvent, InstallRequirementsResult, PythonEnvironmentStatus } from '../../shared/types';
import { summarizeMissingPackages } from '../utils/packageLabels';

interface SetupBannerProps {
  status: PythonEnvironmentStatus | null;
  onRunSetup: () => Promise<InstallRequirementsResult>;
  onRefresh: () => void;
  onOpenSettings: () => void;
}

/**
 * Zeigt eine Hinweisleiste, solange die Konverter-Voraussetzungen fehlen –
 * mit direkter 1-Klick-Einrichtung (installiert bei Bedarf auch Python selbst).
 */
export const SetupBanner: React.FC<SetupBannerProps> = ({ status, onRunSetup, onRefresh, onOpenSettings }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<InstallProgressEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!window.electronAPI?.onInstallProgress) return;
    return window.electronAPI.onInstallProgress((event) => setProgress(event));
  }, []);

  // Nach einer erfolgreichen Prüfung den Hinweis wieder zulassen
  useEffect(() => {
    if (status?.isReady) {
      setDismissed(false);
      setProgress(null);
    }
  }, [status?.isReady]);

  if (!status || status.isReady || dismissed) {
    return null;
  }

  const handleRun = async () => {
    setIsRunning(true);
    setProgress({ stage: 'python', message: 'Einrichtung wird gestartet...' });
    try {
      await onRunSetup();
    } finally {
      setIsRunning(false);
      onRefresh();
    }
  };

  const headline = !status.pythonFound
    ? 'Python fehlt – MarkItUI kann es automatisch installieren'
    : status.pythonTooOld
      ? `Python ${status.pythonVersion} ist zu alt (mindestens 3.10 nötig)`
      : 'Es fehlen Konverter-Pakete';

  // Rohe Pip-Paketnamen (z. B. "pdfminer.six, beautifulsoup4, ...") sagen Nutzer:innen ohne
  // Python-Kenntnisse nichts - stattdessen die betroffenen Dateiformate zusammenfassen. Die
  // technische Liste bleibt als Tooltip erhalten, für alle, die es genau wissen wollen.
  const detail =
    status.missingPackages.length > 0
      ? `Fehlt für: ${summarizeMissingPackages(status.missingPackages)}`
      : status.error || '';
  const detailTitle = status.missingPackages.length > 0 ? status.missingPackages.join(', ') : undefined;

  return (
    <div className="setup-banner">
      <div className="setup-banner-icon">
        {isRunning ? <Loader2 size={15} className="spin" /> : <AlertCircle size={15} />}
      </div>

      <div className="setup-banner-text">
        <div className="setup-banner-title">{isRunning ? 'Einrichtung läuft...' : headline}</div>
        <div className="setup-banner-detail" title={isRunning ? undefined : detailTitle}>
          {isRunning ? progress?.message || 'Bitte warten...' : detail}
        </div>
        {isRunning && typeof progress?.percent === 'number' && (
          <div className="setup-progress-track">
            <div className="setup-progress-fill" style={{ width: `${Math.min(100, progress.percent)}%` }} />
          </div>
        )}
      </div>

      <div className="setup-banner-actions">
        <button className="btn-solid-white" onClick={handleRun} disabled={isRunning}>
          {isRunning ? <Loader2 size={12} className="spin" /> : <Wrench size={12} />}
          <span>{isRunning ? 'Installiere...' : 'Jetzt automatisch einrichten'}</span>
        </button>
        <button className="btn-glass" onClick={onOpenSettings} disabled={isRunning} title="Details in den Einstellungen">
          <Settings size={12} />
        </button>
        <button className="btn-icon-minimal" onClick={() => setDismissed(true)} disabled={isRunning} title="Ausblenden">
          <X size={13} />
        </button>
      </div>
    </div>
  );
};
