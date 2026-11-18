'use client';

// Diadaptasi dari 8B Sill template (MIT)
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/Nav';
import { useLenis } from '@/lib/motion/SmoothScroll';
import { cn } from '@/lib/cn';

const LINKS = [
  { href: '#cara-kerja', label: 'Cara kerja', panel: 1 },
  { href: '#gerakan', label: 'Gerakan', panel: 3 },
  { href: '#privasi', label: 'Privasi', panel: 5 },
  { href: '#harga', label: 'Harga', panel: 7 },
  { href: '#faq', label: 'FAQ', panel: 8 },
];

export function LandingNav() {
  const lenis = useLenis();
  const navRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // Sembunyi saat scroll turun, muncul saat scroll naik (logika section-script:nav template).
  useEffect(() => {
    const nav = navRef.current!;
    let last = window.scrollY;
    let run = 0;
    const onScroll = () => {
      const y = window.scrollY;
      const d = y - last;
      last = y;
      if (y < 90) { nav.removeAttribute('data-hidden'); run = 0; return; }
      if (d === 0) return;
      if (Math.sign(d) !== Math.sign(run)) run = 0;
      run += d;
      if (run > 30) nav.setAttribute('data-hidden', '');
      else if (run < -30) nav.removeAttribute('data-hidden');
    };
    const show = () => nav.removeAttribute('data-hidden');
    window.addEventListener('scroll', onScroll, { passive: true });
    nav.addEventListener('focusin', show);
    return () => {
      window.removeEventListener('scroll', onScroll);
      nav.removeEventListener('focusin', show);
    };
  }, []);

  const close = useCallback(
    (refocus: boolean) => {
      setOpen(false);
      lenis?.start();
      if (refocus) toggleRef.current?.focus();
    },
    [lenis],
  );

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('a')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(true); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Pindah ke layar lebar saat menu terbuka: tutup dan lepas kunci scroll.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 860px)');
    const onChange = () => { if (mq.matches) close(false); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [close]);

  const openMenu = () => {
    setOpen(true);
    navRef.current?.removeAttribute('data-hidden');
    lenis?.stop();
  };

  return (
    <header ref={navRef} className="la-nav" data-open={open || undefined}>
      <div className="la-nav__bar bg-ink text-paper">
        <Link href="/" className="la-nav__brand font-display">SMART-FIT</Link>
        <nav aria-label="Navigasi landing" className="la-nav__links">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="la-nav__link">{l.label}</a>
          ))}
        </nav>
        <div className="la-nav__end">
          <span className="[&_button]:text-paper [&_button:hover]:bg-paper/15">
            <ThemeToggle />
          </span>
          <Link href="/workout" className="ld-btn ld-btn--light la-nav__cta"><span>Mulai latihan</span></Link>
          <button
            ref={toggleRef}
            type="button"
            className="la-nav__toggle"
            aria-expanded={open}
            aria-controls="la-menu"
            aria-label={open ? 'Tutup menu' : 'Buka menu'}
            onClick={() => (open ? close(true) : openMenu())}
          >
            {open ? <X className="size-6" aria-hidden="true" /> : <Menu className="size-6" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div id="la-menu" ref={menuRef} className="la-menu bg-ink" inert={!open} onClick={(e) => { if ((e.target as HTMLElement).closest('a')) close(false); }}>
        <ul>
          {LINKS.map((l, i) => (
            <li key={l.href} style={{ ['--i' as string]: i }}>
              <a href={l.href} className={cn('la-menu__panel font-display', `panel-${l.panel}`)}>{l.label}</a>
            </li>
          ))}
          <li style={{ ['--i' as string]: LINKS.length }}>
            <Link href="/workout" className="la-menu__panel la-menu__panel--cta font-display bg-paper text-ink">Mulai latihan</Link>
          </li>
        </ul>
      </div>
    </header>
  );
}
