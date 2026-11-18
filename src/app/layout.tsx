import type { Metadata, Viewport } from 'next';
import { Gabarito, Rethink_Sans, Playwrite_ID } from 'next/font/google';
import { themeColor } from '@/lib/design/tokens';
import './globals.css';
import { Toaster } from '@/components/ui/Toast';

const gabarito = Gabarito({ variable: '--font-gabarito', subsets: ['latin'] });
const rethink = Rethink_Sans({ variable: '--font-rethink', subsets: ['latin'] });
const playwrite = Playwrite_ID({ variable: '--font-playwrite' });

export const viewport: Viewport = {
  themeColor: themeColor.light,
};

export const metadata: Metadata = {
  title: 'SMART-FIT v2 - AI Workout Coach & Rep Counter',
  description:
    'Client-side pose estimation workout counter using MediaPipe BlazePose. 100% private, zero video sent to servers.',
  manifest: '/manifest.json',
};

// Sinkron sebelum paint: terapkan tema tersimpan tanpa flash (UI_UX_BRIEF §5.3), lalu daftarkan service worker.
const themeInit = `(()=>{try{var p=localStorage.getItem('smartfit-theme')||'light';
var t=p==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):p;
var d=document.documentElement;d.dataset.theme=t;d.style.colorScheme=t;
var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=t==='light'?'${themeColor.light}':'${themeColor.dark}';}catch(e){}})();
if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" data-theme="light" suppressHydrationWarning className={`${gabarito.variable} ${rethink.variable} ${playwrite.variable} h-full`}>
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
