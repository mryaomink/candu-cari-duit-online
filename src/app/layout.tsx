import type { Metadata, Viewport } from 'next';
import './globals.css';

// Note: This is a Server Component. Firebase is initialized client-side only
// via AppProvider ('use client') which is rendered inside page.tsx.

export const metadata: Metadata = {
  title: 'CANDU — Hyperlocal Creator Radar',
  description:
    'Temukan kreator konten, fotografer, videografer, dan freelancer lokal terbaik di sekitarmu. Platform marketplace talenta hyperlocal pertama di Indonesia dengan AI-powered matching.',
  keywords: ['freelancer indonesia', 'kreator konten lokal', 'marketplace talenta', 'fotografer lokal', 'videografer lokal', 'cari duit online'],
  authors: [{ name: 'CANDU' }],
  creator: 'CANDU',
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://candu.app',
    title: 'CANDU — Hyperlocal Creator Radar',
    description: 'Platform AI-powered untuk menemukan kreator lokal terbaik di sekitarmu.',
    siteName: 'CANDU',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CANDU — Hyperlocal Creator Radar',
    description: 'Marketplace talenta hyperlocal pertama di Indonesia.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#030712',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
