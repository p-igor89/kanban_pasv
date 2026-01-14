import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import ThemeProvider from '@/components/ThemeProvider';
import ToastProvider from '@/components/ToastProvider';
import PageSuspenseFallback from '@/components/PageSuspenseFallback';
import { AuthProvider } from '@/contexts/AuthContext';
import ServiceWorkerProvider from '@/components/ServiceWorkerProvider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'KanbanPro - Task Management',
  description: 'Modern Kanban board for task management',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KanbanPro',
  },
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0d12' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <main className="scroll-smooth">
              <Suspense fallback={<PageSuspenseFallback />}>{children}</Suspense>
            </main>
            <ToastProvider />
            <ServiceWorkerProvider />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
