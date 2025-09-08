import type {Metadata, Viewport} from 'next';
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/contexts/auth-context';
import { PWAInstaller } from '@/components/pwa-installer';
import { Header } from '@/components/header';
import { createClient } from '@/lib/supabase/server';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cosmic Quirks',
  description: 'Your future, revealed with a wink from history. Get funny predictions with AI-generated character illustrations.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Cosmic Quirks',
  },
  icons: {
    icon: [
      { url: '/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { url: '/icon-512x512.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.svg', sizes: '180x180', type: 'image/svg+xml' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
  themeColor: '#7c3aed',
};

// Force dynamic rendering for auth-dependent layout
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch server session for SSR hydration
  let initialSession = null;
  try {
    console.log('[Layout] Fetching server session...');
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[Layout] Server session error:', error);
    } else {
      initialSession = session;
      console.log('[Layout] Server session:', session ? 'authenticated' : 'anonymous');
    }
  } catch (error) {
    console.error('[Layout] Failed to fetch server session:', error);
  }

  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider initialSession={initialSession}>
          <PWAInstaller />
          <Header />
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
