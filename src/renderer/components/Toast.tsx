import React from 'react';
import { Check, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className="toast-pill">
          {t.type === 'success' ? (
            <Check size={13} color="#ffffff" />
          ) : t.type === 'error' ? (
            <AlertCircle size={13} color="var(--status-error)" />
          ) : (
            <Info size={13} color="var(--text-muted)" />
          )}

          <span style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t.text}
          </span>

          {t.actionLabel && t.onAction && (
            <button
              className="toast-btn"
              onClick={() => {
                t.onAction?.();
                onDismiss(t.id);
              }}
            >
              {t.actionLabel}
            </button>
          )}

          <button
            className="btn-icon-minimal"
            style={{ padding: '2px', marginLeft: '2px' }}
            onClick={() => onDismiss(t.id)}
          >
            <X size={11} />
          </button>
        </div>
      ))}
    </div>
  );
};
