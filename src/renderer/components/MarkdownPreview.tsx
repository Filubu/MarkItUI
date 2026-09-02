import React, { useMemo, useState } from 'react';
import { marked } from 'marked';
import {
  Copy,
  Check,
  Loader2,
  RefreshCw,
  X,
  FileText,
  Tag,
  Calendar,
  FileCode,
  Bookmark,
  SlidersHorizontal,
  Wrench,
  Terminal,
  ListOrdered
} from 'lucide-react';
import { FileQueueItem, InstallRequirementsResult } from '../../shared/types';

marked.setOptions({
  gfm: true,
  breaks: true
});

/** Tags, die in der Vorschau erlaubt sind. Alles andere wird entfernt. */
const ALLOWED_TAGS = new Set([
  'A', 'ABBR', 'B', 'BLOCKQUOTE', 'BR', 'CAPTION', 'CODE', 'DD', 'DEL', 'DIV', 'DL', 'DT',
  'EM', 'FIGCAPTION', 'FIGURE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'I', 'IMG',
  'INPUT', 'LI', 'OL', 'P', 'PRE', 'S', 'SPAN', 'STRONG', 'SUB', 'SUP', 'TABLE', 'TBODY',
  'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'U', 'UL'
]);

const ALLOWED_ATTRIBUTES = new Set([
  'href', 'src', 'alt', 'title', 'class', 'colspan', 'rowspan', 'align', 'type', 'checked', 'disabled', 'start'
]);

const SAFE_URL = /^(https?:|mailto:|obsidian:|data:image\/(png|jpe?g|gif|webp);|#|\/|\.\.?\/)/i;

/**
 * Entfernt Skripte, Event-Handler und gefährliche URLs aus dem gerenderten Markdown.
 * Konvertierte Dokumente können beliebiges HTML enthalten – das darf im Renderer
 * niemals ausgeführt werden.
 */
function sanitizeHtml(html: string): string {
  if (!html) return '';

  const doc = new DOMParser().parseFromString(`<div id="markitui-root">${html}</div>`, 'text/html');
  const root = doc.getElementById('markitui-root');
  if (!root) return '';

  const walk = (element: Element) => {
    for (const child of Array.from(element.children)) {
      if (!ALLOWED_TAGS.has(child.tagName)) {
        // Inhalt behalten, Element selbst entfernen (Skripte/Styles komplett verwerfen)
        if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE' || child.tagName === 'IFRAME') {
          child.remove();
        } else {
          const text = doc.createTextNode(child.textContent || '');
          child.replaceWith(text);
        }
        continue;
      }

      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase();
        if (name.startsWith('on') || !ALLOWED_ATTRIBUTES.has(name)) {
          child.removeAttribute(attr.name);
          continue;
        }
        if ((name === 'href' || name === 'src') && !SAFE_URL.test(attr.value.trim())) {
          child.removeAttribute(attr.name);
        }
      }

      walk(child);
    }
  };

  walk(root);
  return root.innerHTML;
}

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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const match = line.match(/^(#{1,3}\s*)?[Tt]itle:\s*(.+)$/);
    if (match) {
      lines[i] = `# ${match[2].trim()}`;
    }
    break;
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
  const body = cleanTitleInBody(raw.slice(match[0].length));

  const frontmatter: NonNullable<ParsedDocument['frontmatter']> = {};
  const lines = yamlBlock.split('\n');
  let currentKey = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('- ') && currentKey === 'tags') {
      if (!frontmatter.tags) frontmatter.tags = [];
      const tagVal = trimmed.replace(/^[-\s*]+/, '').replace(/^['"]|['"]$/g, '').trim();
      if (tagVal) frontmatter.tags.push(tagVal);
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const val = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
    currentKey = key;

    if (key === 'tags') {
      if (!frontmatter.tags) frontmatter.tags = [];
      if (val) {
        const tags = val
          .replace(/[[\]]/g, '')
          .split(',')
          .map((t) => t.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
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

  return { frontmatter, body };
}

interface MarkdownPreviewProps {
  currentFile: FileQueueItem | null;
  viewMode: 'preview' | 'split' | 'raw';
  onConvertSingle: (file: FileQueueItem) => void;
  onUpdateContent: (content: string) => void;
  onRemoveFile?: (id: string) => void;
  onRunSetup?: () => Promise<InstallRequirementsResult>;
  /** Position in der Warteschlange (1 = als nächstes dran) */
  queuePosition?: number;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  currentFile,
  viewMode,
  onConvertSingle,
  onUpdateContent,
  onRemoveFile,
  onRunSetup,
  queuePosition = 0
}) => {
  // WICHTIG: Alle Hooks stehen vor jedem bedingten Return. Sonst ändert sich die
  // Hook-Anzahl zwischen den Zuständen (idle -> converting -> success) und React bricht
  // mit "Rendered fewer hooks than expected" ab – genau das ließ die App beim
  // Umwandeln abstürzen.
  const [copied, setCopied] = useState(false);
  const [isRepairing, setIsRepairing] = useState<boolean>(false);

  const rawContent = currentFile?.markdown || '';

  const { frontmatter, body: cleanBody } = useMemo(
    () => parseFrontmatterAndBody(rawContent),
    [rawContent]
  );

  const htmlContent = useMemo(() => {
    if (!cleanBody) return '';
    try {
      return sanitizeHtml(marked.parse(cleanBody) as string);
    } catch {
      const escaped = cleanBody.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<pre>${escaped}</pre>`;
    }
  }, [cleanBody]);

  const wordCount = useMemo(() => {
    if (!rawContent) return 0;
    return rawContent.trim().split(/\s+/).filter(Boolean).length;
  }, [rawContent]);

  const isPrerequisiteError = useMemo(() => {
    if (!currentFile?.error) return false;
    const err = currentFile.error.toLowerCase();
    return (
      err.includes('python') ||
      err.includes('paket') ||
      err.includes('voraussetzung') ||
      err.includes('no module named') ||
      err.includes('modulenotfounderror')
    );
  }, [currentFile?.error]);

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

  const handleRepairPrerequisites = async () => {
    setIsRepairing(true);
    try {
      if (onRunSetup) {
        await onRunSetup();
      } else if (window.electronAPI?.installPythonRequirements) {
        const res = await window.electronAPI.installPythonRequirements();
        if (res.success && currentFile) onConvertSingle(currentFile);
      }
    } catch (err) {
      console.error('Reparatur fehlgeschlagen:', err);
    } finally {
      setIsRepairing(false);
    }
  };

  const handleOpenSetupScript = async () => {
    if (window.electronAPI?.openSetupScript) {
      await window.electronAPI.openSetupScript();
    }
  };

  if (!currentFile) {
    return null;
  }

  // In der Warteschlange
  if (currentFile.status === 'queued') {
    return (
      <div className="doc-viewport" style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', animation: 'fadeIn 0.2s ease' }}>
          <ListOrdered size={22} color="#ffffff" />
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {currentFile.name} wartet in der Warteschlange
            {queuePosition > 0 ? ` (Platz ${queuePosition})` : ''}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Dateien werden nacheinander umgewandelt, damit das Notebook flüssig bleibt.
          </div>
        </div>
      </div>
    );
  }

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

  if (currentFile.status === 'error') {
    return (
      <div className="doc-viewport" style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', maxWidth: '540px', padding: '32px', textAlign: 'center', animation: 'fadeIn 0.2s ease' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={18} color="#ffffff" />
          </div>

          <div style={{ fontSize: '14px', fontWeight: 500, color: '#ffffff' }}>Fehler beim Umwandeln</div>

          <div style={{ width: '100%', background: 'var(--glass-l1)', backdropFilter: 'var(--glass-blur-l1)', padding: '14px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textAlign: 'left', whiteSpace: 'pre-wrap', maxHeight: '180px', overflowY: 'auto' }}>
            {currentFile.error || 'Unerwarteter Fehler bei der Textextraktion'}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', marginTop: '4px' }}>
            {isPrerequisiteError && (
              <>
                <button className="btn-solid-white" onClick={handleRepairPrerequisites} disabled={isRepairing}>
                  {isRepairing ? <Loader2 size={12} className="spin" /> : <Wrench size={12} />}
                  <span>{isRepairing ? 'Installiere Pakete...' : '1-Klick Pakete reparieren'}</span>
                </button>
                <button className="btn-glass" onClick={handleOpenSetupScript} title="Startet install_requirements.bat">
                  <Terminal size={12} />
                  <span>Setup-Skript</span>
                </button>
              </>
            )}

            <button
              className={isPrerequisiteError ? 'btn-glass' : 'btn-solid-white'}
              onClick={() => onConvertSingle(currentFile)}
              disabled={isRepairing}
            >
              <RefreshCw size={12} /> Erneut versuchen
            </button>
            {onRemoveFile && (
              <button className="btn-glass" onClick={() => onRemoveFile(currentFile.id)} disabled={isRepairing}>
                <X size={12} /> Schließen
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

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

      {frontmatter && (
        <div className="obsidian-properties-card">
          <div className="obsidian-properties-header">
            <SlidersHorizontal size={12} className="prop-header-icon" />
            <span>Eigenschaften</span>
          </div>
          <div className="obsidian-properties-grid">
            {frontmatter.tags && frontmatter.tags.length > 0 && (
              <div className="obsidian-prop-row">
                <div className="obsidian-prop-label">
                  <Tag size={12} />
                  <span>Tags</span>
                </div>
                <div className="obsidian-prop-tags">
                  {frontmatter.tags.map((t, idx) => (
                    <span key={`${t}-${idx}`} className="obsidian-tag-pill" style={{ '--i': idx } as React.CSSProperties}>
                      #{t.replace(/^#/, '')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(frontmatter.created || frontmatter.date) && (
              <div className="obsidian-prop-row">
                <div className="obsidian-prop-label">
                  <Calendar size={12} />
                  <span>Datum</span>
                </div>
                <div className="obsidian-prop-val">{frontmatter.created || frontmatter.date}</div>
              </div>
            )}

            {frontmatter.source_file && (
              <div className="obsidian-prop-row">
                <div className="obsidian-prop-label">
                  <FileCode size={12} />
                  <span>Quelle</span>
                </div>
                <div className="obsidian-prop-val obsidian-prop-source">{frontmatter.source_file}</div>
              </div>
            )}

            {frontmatter.subject && (
              <div className="obsidian-prop-row">
                <div className="obsidian-prop-label">
                  <Bookmark size={12} />
                  <span>Fach / Thema</span>
                </div>
                <div className="obsidian-prop-val">{frontmatter.subject}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="markdown-body-rendered" dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </div>
  );

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
      {viewMode === 'preview' && <div className="split-pane">{renderedPane}</div>}
      {viewMode === 'raw' && <div className="split-pane">{editorPane}</div>}
      {viewMode === 'split' && (
        <div className="split-view-container">
          <div className="split-pane">{editorPane}</div>
          <div className="split-pane">{renderedPane}</div>
        </div>
      )}
    </div>
  );
};
