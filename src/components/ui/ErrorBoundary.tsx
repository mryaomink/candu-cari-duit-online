'use client';
import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { logCritical } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** If true, shows degraded 2D list instead of generic error UI */
  is3DContext?: boolean;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const code = this.props.is3DContext ? 'WEBGL_CRASH' : 'UNKNOWN_ERROR';
    logCritical(code, error.message, {
      componentStack: info.componentStack ?? '',
      stack: error.stack ?? '',
    });
    this.props.onError?.(error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 'var(--space-6)',
          padding: 'var(--space-8)',
          background: 'var(--color-bg)',
          textAlign: 'center',
        }}
        role="alert"
        aria-live="assertive"
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
          }}
        >
          {this.props.is3DContext ? '🌐' : '⚠️'}
        </div>

        <div style={{ maxWidth: 400 }}>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>
            {this.props.is3DContext ? 'Radar 3D Tidak Tersedia' : 'Terjadi Kesalahan'}
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
            {this.props.is3DContext
              ? 'Browser kamu tidak mendukung WebGL atau terjadi crash pada radar 3D. Beralih ke tampilan daftar.'
              : 'Terjadi kesalahan yang tidak terduga. Coba muat ulang halaman.'}
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre
              style={{
                marginTop: 'var(--space-4)',
                padding: 'var(--space-3)',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 11,
                color: 'var(--color-error)',
                overflowX: 'auto',
                textAlign: 'left',
                whiteSpace: 'pre-wrap',
              }}
            >
              {this.state.error.message}
            </pre>
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-primary btn-sm" onClick={this.handleReset} id="error-boundary-retry-btn">
            Coba Lagi
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => window.location.reload()}
            id="error-boundary-reload-btn"
          >
            Muat Ulang
          </button>
        </div>
      </div>
    );
  }
}
