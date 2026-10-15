import Link from 'next/link';
import { ShieldCheck, Target, Timer, ChevronDown, Dumbbell } from 'lucide-react';
import { PrivacyBadge } from '@/components/ui/PrivacyBadge';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/Nav';

const FEATURES = [
  {
    icon: Timer,
    tone: 'text-data-reps bg-accent-soft',
    title: 'Hitung otomatis',
    body: 'Rep dihitung sendiri saat kamu bergerak. Tidak perlu menekan tombol.',
  },
  {
    icon: Target,
    tone: 'text-data-form bg-success-soft',
    title: 'Koreksi form',
    body: 'Dapat peringatan singkat saat punggung turun, lutut tertekuk terlalu dalam, atau gerakan terlalu cepat.',
  },
  {
    icon: ShieldCheck,
    tone: 'text-success bg-success-soft',
    title: 'Privat sepenuhnya',
    body: 'Video tidak pernah keluar dari perangkatmu. Server hanya menyimpan angka latihan.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-text">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="pressable flex items-center gap-2.5 rounded-sm">
          <span className="grid size-9 place-items-center rounded-md bg-accent text-on-accent" aria-hidden="true">
            <Dumbbell className="size-5" />
          </span>
          <span className="text-headline font-bold tracking-tight">SMART-FIT</span>
        </Link>

        <nav aria-label="Utama" className="flex items-center gap-1 sm:gap-2">
          <Link href="/history" className="pressable inline-flex min-h-11 items-center rounded-sm px-3 text-subhead font-medium text-text-2 hover:text-text">
            Riwayat
          </Link>
          <ThemeToggle />
          <Button href="/workout" size="md" className="hidden sm:inline-flex">
            Mulai latihan
          </Button>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-4 pb-16 pt-10 text-center sm:px-6 sm:pt-16">
        <p className="rounded-full border border-separator bg-surface px-3.5 py-1.5 text-caption font-semibold uppercase tracking-wide text-accent-text">
          Pelatih AI di browser
        </p>

        <h1 className="mt-6 max-w-3xl text-display text-balance">Hitung rep dan perbaiki form secara langsung.</h1>

        <p className="mt-5 max-w-xl text-callout text-text-2 sm:text-headline sm:font-normal">
          Kamera HP atau laptopmu sudah cukup. Video tidak pernah meninggalkan perangkatmu.
        </p>

        <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Button href="/workout" size="xl" className="sm:px-8">
            Mulai latihan
          </Button>
          <Button variant="tertiary" size="lg" href="#cara-kerja">
            Cara kerjanya
          </Button>
        </div>

        {/* Pratinjau statis panggung kamera. Angka ilustrasi, bukan data pengguna. */}
        <div className="mt-12 w-full max-w-md rounded-xl bg-canvas p-5 text-left shadow-3 ring-1 ring-separator" data-theme="dark" aria-hidden="true">
          <div className="flex items-center justify-between text-caption text-text-3">
            <span>Contoh tampilan latihan</span>
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-accent-text">Turun</span>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="num text-metric-xl text-text">12</p>
              <p className="text-footnote text-text-2">repetisi</p>
            </div>
            <div className="rounded-md bg-surface px-3 py-2 text-right">
              <p className="text-caption text-text-3">Form</p>
              <p className="num text-metric-m text-data-form">94</p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <PrivacyBadge variant="full" />
        </div>

        <section id="cara-kerja" aria-labelledby="fitur-judul" className="mt-16 w-full scroll-mt-6">
          <h2 id="fitur-judul" className="sr-only">
            Keunggulan SMART-FIT
          </h2>
          <ul className="grid grid-cols-1 gap-4 text-left md:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.title} className="rounded-lg bg-surface p-5 shadow-1">
                  <span className={`grid size-11 place-items-center rounded-md ${f.tone}`} aria-hidden="true">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-title-3 text-text">{f.title}</h3>
                  <p className="mt-1.5 text-callout text-text-2">{f.body}</p>
                </li>
              );
            })}
          </ul>

          <details className="group mt-6 rounded-lg bg-surface p-5 text-left shadow-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-headline font-semibold text-text">
              Cara kerjanya di balik layar
              <ChevronDown className="size-5 text-text-3 transition-transform duration-150 group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="mt-3 space-y-2 text-callout text-text-2">
              <p>
                Pose tubuh dikenali dengan model MediaPipe BlazePose yang berjalan di browser. Sinyal gerakan dihaluskan
                dengan filter One-Euro agar hitungan tidak melompat saat kamera bergetar.
              </p>
              <p>Tidak ada data video yang dikirim. Hanya ringkasan latihan yang disimpan di riwayat.</p>
            </div>
          </details>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-6xl border-t border-separator px-4 py-6 text-center text-footnote text-text-3 sm:px-6">
        &copy; 2026 SMART-FIT
      </footer>
    </div>
  );
}
