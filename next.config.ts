import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== 'production';

// Script inline dari layout (registrasi service worker) dan runtime Next.js masih
// membutuhkan 'unsafe-inline'. Perketat dengan nonce via middleware bila memungkinkan.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ''} https://app.sandbox.midtrans.com https://app.midtrans.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://app.sandbox.midtrans.com https://app.midtrans.com",
  "worker-src 'self' blob:",
  "frame-src https://app.sandbox.midtrans.com https://app.midtrans.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    // Runtime WASM (~11.7 MB) dan model pose (5.8-9.4 MB) tidak berubah antar deploy kecuali
    // @mediapipe/tasks-vision di-upgrade. Default public/ adalah max-age=0 (revalidasi tiap kunjungan).
    // Nama file tidak berversi, jadi bukan `immutable`: cache 7 hari lalu revalidasi di latar.
    const heavyAssetCache = {
      key: 'Cache-Control',
      value: 'public, max-age=604800, stale-while-revalidate=86400',
    };
    return [
      { source: '/wasm/:path*', headers: [heavyAssetCache] },
      { source: '/models/:path*', headers: [heavyAssetCache] },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            // microphone=(self): voice command (SpeechRecognition) butuh izin mic.
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
