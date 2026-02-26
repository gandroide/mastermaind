import type { Metadata, Viewport } from 'next';
import './globals.css';
import LayoutSwitcher from '@/components/layout/LayoutSwitcher';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export const metadata: Metadata = {
  title: 'MASTERMIND — CEO Command Center',
  description: 'Executive command center for Brivex, Bio-Alert & Tech Ops',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MASTERMIND',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="antialiased">
        <LayoutSwitcher>{children}</LayoutSwitcher>
      </body>
    </html>
  );
}
