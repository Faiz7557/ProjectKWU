import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/Toast';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  themeColor: '#09090B',
};

export const metadata: Metadata = {
  title: 'SMART-FIT v2 - AI Workout Coach & Rep Counter',
  description:
    'Client-side pose estimation workout counter using MediaPipe BlazePose. 100% private, zero video sent to servers.',
  manifest: '/manifest.json',
};

// Sinkron sebelum paint: terapkan tema tersimpan tanpa flash (UI_UX_BRIEF §5.3), lalu daftarkan service worker.
const themeInit = `(()=>{try{var p=localStorage.getItem('smartfit-theme')||'dark';
var t=p==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):p;
var d=document.documentElement;d.dataset.theme=t;d.style.colorScheme=t;
var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=t==='light'?'#F5F5F7':'#09090B';}catch(e){}})();
if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" data-theme="dark" suppressHydrationWarning className={`${geistSans.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
