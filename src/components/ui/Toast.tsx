'use client';
import { useUIState, useAppStore } from '@/store/useAppStore';

const ICONS: Record<string, string> = {
  success: '✨',
  error: '⚠️',
  info: '💡',
};

export default function Toast() {
  const { toast } = useUIState();
  const clearToast = useAppStore((s) => s.clearToast);

  if (!toast) return null;

  return (
    <div className="toast-container">
      <div className={`toast toast-${toast.type}`} role="alert" aria-live="polite">
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          {ICONS[toast.type]}
        </span>
        <span style={{ flex: 1, fontSize: 'var(--text-sm)', lineHeight: 1.5, fontWeight: 500 }}>
          {toast.message}
        </span>
        <button
          onClick={clearToast}
          aria-label="Tutup notifikasi"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'inherit',
            opacity: 0.6,
            fontSize: 20,
            lineHeight: 1,
            padding: '0 4px',
            flexShrink: 0,
            transition: 'opacity 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseOut={(e) => (e.currentTarget.style.opacity = '0.6')}
        >
          &times;
        </button>
      </div>
    </div>
  );
}
