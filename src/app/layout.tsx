import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import ThemeProvider from '@/components/ThemeProvider';
import ToastProvider from '@/components/ToastProvider';
import PageSuspenseFallback from '@/components/PageSuspenseFallback';
import { AuthProvider } from '@/contexts/AuthContext';
import ServiceWorkerProvider from '@/components/ServiceWorkerProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { CsrfProvider } from '@/components/providers/CsrfProvider';

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var STORAGE_KEY = 'kanbanpro-theme';
                  var VALID_THEMES = ['light', 'dark', 'system'];
                  var raw = localStorage.getItem(STORAGE_KEY);
                  var stored = null;

                  // Safely parse JSON-stored theme
                  if (raw) {
                    try {
                      stored = JSON.parse(raw);
                    } catch (e) {
                      stored = null;
                    }
                  }

                  // Validate theme value
                  var theme = (stored && VALID_THEMES.indexOf(stored) !== -1) ? stored : 'system';

                  // Resolve 'system' to actual theme
                  var resolved = theme;
                  if (theme === 'system') {
                    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }

                  // Apply theme to DOM
                  document.documentElement.setAttribute('data-theme', resolved);
                  document.documentElement.style.colorScheme = resolved;
                  if (resolved === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {
                  // Fallback to light theme on any error
                  document.documentElement.setAttribute('data-theme', 'light');
                  document.documentElement.style.colorScheme = 'light';
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <QueryProvider>
            <CsrfProvider>
              <AuthProvider>
                <main className="scroll-smooth">
                  <Suspense fallback={<PageSuspenseFallback />}>{children}</Suspense>
                </main>
                <ToastProvider />
                <ServiceWorkerProvider />
              </AuthProvider>
            </CsrfProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
