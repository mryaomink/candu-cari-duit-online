'use client';
import { useUIState, useAppStore } from '@/store/useAppStore';

const ICONS: Record<string, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
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
            width: 20,
            height: 20,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
            marginTop: 1,
            background:
              toast.type === 'success' ? 'rgba(16,185,129,0.3)'
              : toast.type === 'error' ? 'rgba(239,68,68,0.3)'
              : 'rgba(0,216,255,0.2)',
          }}
        >
          {ICONS[toast.type]}
        </span>
        <span style={{ flex: 1, fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
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
            fontSize: 16,
            lineHeight: 1,
            padding: '0 2px',
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
