import React, { useState, useMemo } from 'react';
import { marked } from 'marked';
import { Eye, Code, Copy, Check, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { FileQueueItem } from '../../shared/types';

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true
});

interface MarkdownPreviewProps {
  currentFile: FileQueueItem | null;
  onConvertSingle: (file: FileQueueItem) => void;
  onUpdateContent: (content: string) => void;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  currentFile,
  onConvertSingle,
  onUpdateContent
}) => {
  const [activeTab, setActiveTab] = useState<'rendered' | 'raw'>('rendered');
  const [copied, setCopied] = useState(false);

  const markdownContent = currentFile?.markdown || '';

  const htmlContent = useMemo(() => {
    if (!markdownContent) return '';
    try {
      return marked.parse(markdownContent) as string;
    } catch (e) {
      return `<pre>${markdownContent}</pre>`;
    }
  }, [markdownContent]);

  const handleCopy = async () => {
    if (!markdownContent) return;
    try {
      await navigator.clipboard.writeText(markdownContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Kopieren fehlgeschlagen:', err);
    }
  };

  const wordCount = useMemo(() => {
    if (!markdownContent) return 0;
    return markdownContent.trim().split(/\s+/).length;
  }, [markdownContent]);

  if (!currentFile) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', gap: '12px', padding: '40px', textAlign: 'center' }}>
        <Sparkles size={48} color="var(--accent-primary)" style={{ opacity: 0.8 }} />
        <h3 style={{ color: 'var(--text-main)', fontSize: '18px' }}>Keine Datei ausgewählt</h3>
        <p style={{ maxWidth: '400px', fontSize: '13px' }}>
          Wähle links eine Datei aus der Warteschlange aus oder ziehe neue Schulaufgaben aus deinem Download-Ordner hinein.
        </p>
      </div>
    );
  }

  if (currentFile.status === 'converting') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', gap: '16px' }}>
        <Loader2 size={36} className="spin" color="var(--accent-primary)" />
        <div style={{ fontSize: '16px', fontWeight: 600 }}>Konvertiere '{currentFile.name}'...</div>
        <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Microsoft MarkItDown extrahiert Text, Tabellen und Struktur...</p>
      </div>
    );
  }

  if (currentFile.status === 'error') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--error)', gap: '16px', padding: '30px', textAlign: 'center' }}>
        <AlertTriangle size={42} />
        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Fehler bei der Konvertierung</h3>
        <pre style={{ maxWidth: '600px', background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', textAlign: 'left' }}>
          {currentFile.error || 'Unbekannter Fehler'}
        </pre>
        <button className="btn btn-primary" onClick={() => onConvertSingle(currentFile)}>
          Erneut versuchen
        </button>
      </div>
    );
  }

  if (currentFile.status === 'idle' || !markdownContent) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'var(--text-dim)' }}>
        <h3 style={{ color: 'var(--text-main)', fontSize: '16px' }}>'{currentFile.name}' ist bereit</h3>
        <button className="btn btn-primary" style={{ padding: '10px 24px', fontSize: '14px' }} onClick={() => onConvertSingle(currentFile)}>
          <Sparkles size={16} /> Jetzt mit MarkItDown umwandeln
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="preview-header">
        <div className="tab-group">
          <button
            className={`tab-btn ${activeTab === 'rendered' ? 'active' : ''}`}
            onClick={() => setActiveTab('rendered')}
          >
            <Eye size={14} /> Vorschau
          </button>
          <button
            className={`tab-btn ${activeTab === 'raw' ? 'active' : ''}`}
            onClick={() => setActiveTab('raw')}
          >
            <Code size={14} /> Quellcode (Editor)
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            {wordCount} Wörter · {markdownContent.length} Zeichen
          </span>

          <button
            className="btn btn-secondary"
            style={{ padding: '5px 12px', fontSize: '12px' }}
            onClick={handleCopy}
          >
            {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
            {copied ? 'Kopiert!' : 'Kopieren'}
          </button>
        </div>
      </div>

      <div className="preview-body">
        {activeTab === 'rendered' ? (
          <div
            className="markdown-rendered"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        ) : (
          <div className="raw-editor-container">
            <textarea
              className="raw-textarea"
              value={markdownContent}
              onChange={(e) => onUpdateContent(e.target.value)}
              placeholder="Markdown Quelltext hier bearbeiten..."
            />
          </div>
        )}
      </div>
    </div>
  );
};
