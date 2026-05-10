'use client';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAppStore, useFirebaseUser } from '@/store/useAppStore';
import AppProvider from '@/components/AppProvider';

// Load client dashboard elements dynamically
const CreatorDashboard = dynamic(() => import('@/components/dashboard/CreatorDashboard'), { ssr: false });
const ClientDashboard = dynamic(() => import('@/components/dashboard/ClientDashboard'), { ssr: false });

import AppShell from '@/components/layout/AppShell';

export default function DashboardLayout() {
  return (
    <AppProvider>
      <AppShell showSearch={false}>
        <DashboardContent />
      </AppShell>
    </AppProvider>
  );
}

function DashboardContent() {
  const firebaseUser = useFirebaseUser();
  const appUser = useAppStore((s) => s.user);
  const loading = useAppStore((s) => s.isAuthLoading);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace('/');
    }
  }, [firebaseUser, loading, router]);

  if (loading || !firebaseUser) {
    return (
      <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="animate-spin" style={{ fontSize: 24, color: 'var(--color-primary)' }}>⟳</div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        
        <header style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 8 }}>
            Overview
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Selamat datang, {firebaseUser.displayName}
          </p>
        </header>

        {appUser?.role === 'creator' ? (
          <CreatorDashboard />
        ) : (
          <ClientDashboard />
        )}

      </div>
    </div>
  );
}
