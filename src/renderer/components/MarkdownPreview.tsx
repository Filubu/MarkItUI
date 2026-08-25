import React, { useMemo, useState } from 'react';
import { marked } from 'marked';
import { Copy, Check, Loader2, RefreshCw, X, FileText, Tag, Calendar, FileCode, Bookmark, SlidersHorizontal, Wrench, Terminal } from 'lucide-react';
import { FileQueueItem } from '../../shared/types';

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: true
});

interface ParsedDocument {
  frontmatter: {
    title?: string;
    created?: string;
    date?: string;
    source_file?: string;
    source_type?: string;
    subject?: string;
    tags?: string[];
  } | null;
  body: string;
}

function cleanTitleInBody(text: string): string {
  if (!text) return '';
  const lines = text.split('\n');
  let firstContentFound = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (!firstContentFound) {
      firstContentFound = true;
      // Match "Title: ...", "title: ...", "# Title: ...", "### Title: ..."
      const match = line.match(/^(#{1,3}\s*)?[Tt]itle:\s*(.+)$/);
      if (match) {
        lines[i] = `# ${match[2].trim()}`;
      }
    }
  }
  return lines.join('\n');
}

function parseFrontmatterAndBody(raw: string): ParsedDocument {
  if (!raw) return { frontmatter: null, body: '' };

  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
  const match = raw.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: null, body: cleanTitleInBody(raw) };
  }

  const yamlBlock = match[1];
  let body = raw.slice(match[0].length);
  body = cleanTitleInBody(body);

  const frontmatter: ParsedDocument['frontmatter'] = {};
  const lines = yamlBlock.split('\n');
  let currentKey = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check list item under tags
    if (trimmed.startsWith('- ') && currentKey === 'tags') {
      if (!frontmatter.tags) frontmatter.tags = [];
      const tagVal = trimmed.replace(/^[-\s*]+/, '').replace(/^['"]|['"]$/g, '').trim();
      if (tagVal) frontmatter.tags.push(tagVal);
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      let val = line.slice(colonIdx + 1).trim();
      // Remove surrounding quotes
      val = val.replace(/^["']|["']$/g, '');

      currentKey = key;
      if (key === 'tags') {
        if (!frontmatter.tags) frontmatter.tags = [];
        if (val) {
          const cleanedVal = val.replace(/[\[\]]/g, '');
          const tags = cleanedVal.split(',').map((t) => t.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
          frontmatter.tags.push(...tags);
        }
      } else if (key === 'title') {
        frontmatter.title = val;
      } else if (key === 'created') {
        frontmatter.created = val;
      } else if (key === 'date') {
        frontmatter.date = val;
      } else if (key === 'source_file' || key === 'source') {
        frontmatter.source_file = val;
      } else if (key === 'subject') {
        frontmatter.subject = val;
      }
    }
  }

  return { frontmatter, body };
}

interface MarkdownPreviewProps {
  currentFile: FileQueueItem | null;
  viewMode: 'preview' | 'split' | 'raw';
  onConvertSingle: (file: FileQueueItem) => void;
  onUpdateContent: (content: string) => void;
  onRemoveFile?: (id: string) => void;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  currentFile,
  viewMode,
  onConvertSingle,
  onUpdateContent,
  onRemoveFile
}) => {
  const [copied, setCopied] = useState(false);

  const rawContent = currentFile?.markdown || '';

  // Parse frontmatter and body
  const { frontmatter, body: cleanBody } = useMemo(() => {
    return parseFrontmatterAndBody(rawContent);
  }, [rawContent]);

  const htmlContent = useMemo(() => {
    if (!cleanBody) return '';
    try {
      return marked.parse(cleanBody) as string;
    } catch {
      return `<pre>${cleanBody}</pre>`;
    }
  }, [cleanBody]);

  const handleCopy = async () => {
    if (!rawContent) return;
    try {
      await navigator.clipboard.writeText(rawContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error('Kopieren fehlgeschlagen:', err);
    }
  };

  const wordCount = useMemo(() => {
    if (!rawContent) return 0;
    return rawContent.trim().split(/\s+/).filter(Boolean).length;
  }, [rawContent]);

  if (!currentFile) {
    return null;
  }

  // Converting state
  if (currentFile.status === 'converting') {
    return (
      <div className="doc-viewport" style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', animation: 'fadeIn 0.2s ease' }}>
          <Loader2 size={24} className="spin" color="#ffffff" />
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
            Konvertiere {currentFile.name}...
          </div>
        </div>
      </div>
    );
  }

  const [isRepairing, setIsRepairing] = useState<boolean>(false);

  const handleRepairPrerequisites = async () => {
    if (!window.electronAPI || !window.electronAPI.installPythonRequirements) return;
    setIsRepairing(true);
    try {
      const res = await window.electronAPI.installPythonRequirements();
      if (res.success && currentFile) {
        onConvertSingle(currentFile);
      }
    } catch (err) {
      console.error('Reparatur fehlgeschlagen:', err);
    } finally {
      setIsRepairing(false);
    }
  };

  const handleOpenSetupScript = async () => {
    if (window.electronAPI && window.electronAPI.openSetupScript) {
      await window.electronAPI.openSetupScript();
    }
  };

  const isPrerequisiteError = useMemo(() => {
    if (!currentFile?.error) return false;
    const err = currentFile.error.toLowerCase();
    return err.includes('python') || err.includes('paket') || err.includes('voraussetzung') || err.includes('no module named') || err.includes('import');
  }, [currentFile?.error]);

  // Error state (Pure Monochromatic & Clean)
  if (currentFile.status === 'error') {
    return (
      <div className="doc-viewport" style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', maxWidth: '540px', padding: '32px', textAlign: 'center', animation: 'fadeIn 0.2s ease' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={18} color="#ffffff" />
          </div>
          
          <div style={{ fontSize: '14px', fontWeight: 500, color: '#ffffff' }}>
            Fehler beim Umwandeln
          </div>

          <div style={{ width: '100%', background: 'var(--glass-l1)', backdropFilter: 'var(--glass-blur-l1)', padding: '14px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textAlign: 'left', whiteSpace: 'pre-wrap', maxHeight: '180px', overflowY: 'auto' }}>
            {currentFile.error || 'Unerwarteter Fehler bei der Textextraktion'}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', marginTop: '4px' }}>
            {isPrerequisiteError && (
              <>
                <button
                  className="btn-solid-white"
                  onClick={handleRepairPrerequisites}
                  disabled={isRepairing}
                >
                  {isRepairing ? <Loader2 size={12} className="spin" /> : <Wrench size={12} />}
                  <span>{isRepairing ? 'Installiere Pakete...' : '1-Klick Pakete reparieren'}</span>
                </button>
                <button
                  className="btn-glass"
                  onClick={handleOpenSetupScript}
                  title="Startet install_requirements.bat"
                >
                  <Terminal size={12} />
                  <span>Setup-Skript</span>
                </button>
              </>
            )}

            <button className={isPrerequisiteError ? "btn-glass" : "btn-solid-white"} onClick={() => onConvertSingle(currentFile)}>
              <RefreshCw size={12} /> Erneut versuchen
            </button>
            {onRemoveFile && (
              <button className="btn-glass" onClick={() => onRemoveFile(currentFile.id)}>
                <X size={12} /> Schließen
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Idle state
  if (currentFile.status === 'idle' || !rawContent) {
    return (
      <div className="doc-viewport" style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', animation: 'fadeIn 0.2s ease' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{currentFile.name} bereit</div>
          <button className="btn-solid-white" onClick={() => onConvertSingle(currentFile)}>
            Umwandeln
          </button>
        </div>
      </div>
    );
  }

  // Rendered Pane (with Obsidian Properties Card & clean Markdown body)
  const renderedPane = (
    <div className="markdown-rendered-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="doc-meta-badge">
          {wordCount} Wörter · {rawContent.length} Zeichen
        </div>
        <button className="btn-glass" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={handleCopy}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Kopiert' : 'Kopieren'}
        </button>
      </div>

      {/* Obsidian Properties Card */}
      {frontmatter && (
        <div className="obsidian-properties-card">
          <div className="obsidian-properties-header">
            <SlidersHorizontal size={12} className="prop-header-icon" />
            <span>Eigenschaften</span>
          </div>
          <div className="obsidian-properties-grid">
            {/* Tags */}
            {frontmatter.tags && frontmatter.tags.length > 0 && (
              <div className="obsidian-prop-row">
                <div className="obsidian-prop-label">
                  <Tag size={12} />
                  <span>Tags</span>
                </div>
                <div className="obsidian-prop-tags">
                  {frontmatter.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="obsidian-tag-pill"
                      style={{ '--i': idx } as React.CSSProperties}
                    >
                      #{t.replace(/^#/, '')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Created / Date */}
            {(frontmatter.created || frontmatter.date) && (
              <div className="obsidian-prop-row">
                <div className="obsidian-prop-label">
                  <Calendar size={12} />
                  <span>Datum</span>
                </div>
                <div className="obsidian-prop-val">
                  {frontmatter.created || frontmatter.date}
                </div>
              </div>
            )}

            {/* Source File */}
            {frontmatter.source_file && (
              <div className="obsidian-prop-row">
                <div className="obsidian-prop-label">
                  <FileCode size={12} />
                  <span>Quelle</span>
                </div>
                <div className="obsidian-prop-val obsidian-prop-source">
                  {frontmatter.source_file}
                </div>
              </div>
            )}

            {/* Subject */}
            {frontmatter.subject && (
              <div className="obsidian-prop-row">
                <div className="obsidian-prop-label">
                  <Bookmark size={12} />
                  <span>Fach / Thema</span>
                </div>
                <div className="obsidian-prop-val">
                  {frontmatter.subject}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clean Rendered Markdown Body */}
      <div className="markdown-body-rendered" dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </div>
  );

  // Raw Editor Pane
  const editorPane = (
    <div className="raw-editor-wrap">
      <textarea
        className="raw-editor-textarea"
        value={rawContent}
        onChange={(e) => onUpdateContent(e.target.value)}
        placeholder="Markdown bearbeiten..."
        spellCheck={false}
      />
    </div>
  );

  return (
    <div className="doc-viewport">
      {viewMode === 'preview' && (
        <div className="split-pane">{renderedPane}</div>
      )}

      {viewMode === 'raw' && (
        <div className="split-pane">{editorPane}</div>
      )}

      {viewMode === 'split' && (
        <div className="split-view-container">
          <div className="split-pane">{editorPane}</div>
          <div className="split-pane">{renderedPane}</div>
        </div>
      )}
    </div>
  );
};
