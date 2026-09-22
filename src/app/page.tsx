import Link from 'next/link';
import {
  ShieldCheck,
  Activity,
  ArrowRight,
  Sparkles,
  Cpu,
} from 'lucide-react';
import { PrivacyBadge } from '@/components/ui/PrivacyBadge';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      {/* Top Navigation */}
      <header className="max-w-6xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-blue-500/25">
            S
          </div>
          <span className="text-xl font-extrabold tracking-tight">SMART-FIT</span>
        </div>

        <nav className="flex items-center gap-4">
          <Link
            href="/history"
            className="text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Riwayat
          </Link>
          <Link
            href="/workout"
            className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/20"
          >
            Mulai Latihan
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-16 text-center space-y-8 my-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-blue-400 text-xs font-semibold uppercase tracking-wider shadow-inner">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>Arsitektur Client-Side Generasi Baru</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1]">
          Hitung Repetisi & Koreksi Form Latihan{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
            Secara Real-Time
          </span>
        </h1>

        <p className="text-slate-400 text-base sm:text-xl max-w-2xl mx-auto leading-relaxed">
          Inference pose tubuh berjalan langsung di browser Anda menggunakan MediaPipe BlazePose (WASM).
          <strong className="text-slate-200 font-semibold block mt-1">
            Video tidak pernah meninggalkan perangkat Anda. 100% privat, cepat, dan tanpa beban server.
          </strong>
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/workout"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base shadow-xl shadow-blue-500/25 flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5"
          >
            <span>Buka Aplikasi Latihan</span>
            <ArrowRight className="w-5 h-5" />
          </Link>

          <a
            href="#features"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-semibold text-base transition-all"
          >
            Pelajari Cara Kerja
          </a>
        </div>

        {/* Privacy Trust Badge */}
        <div className="pt-2 flex justify-center">
          <PrivacyBadge variant="full" />
        </div>

        {/* Feature Cards Grid */}
        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Privasi Mutlak</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Video webcam Anda diolah 100% lokal di browser. Server hanya mencatat ringkasan repetisi dan durasi.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Adaptive One-Euro Filter</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Smoothing 99 kanal landmark untuk meredam jitter kamera tanpa menghasilkan lag pada gerakan cepat.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">5 Gerakan Tier 1</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Dukungan teruji untuk Push-up, Squat, Sit-up, Jumping Jack, dan Plank hold timer dengan feedback live.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full px-6 py-8 border-t border-slate-900 text-center text-xs text-slate-600">
        &copy; 2026 SMART-FIT &bull; AI Powered Fitness System &bull; Powered by MediaPipe BlazePose
      </footer>
    </div>
  );
}
