import { SmoothScroll } from '@/lib/motion/SmoothScroll';
import { HeroFigureLazy } from '@/components/three/HeroFigureLazy';
import { LandingNav } from '@/components/landing/LandingNav';
import { Opening } from '@/components/landing/Opening';
import { ExerciseExplorer } from '@/components/landing/ExerciseExplorer';
import { SessionDay } from '@/components/landing/SessionDay';
import { CoachSenses } from '@/components/landing/CoachSenses';
import { CoachNotes } from '@/components/landing/CoachNotes';
import { Privacy } from '@/components/landing/Privacy';
import { ProgressPreview } from '@/components/landing/ProgressPreview';
import { Programs } from '@/components/landing/Programs';
import { Promises } from '@/components/landing/Promises';
import { Pricing } from '@/components/landing/Pricing';
import { Faq } from '@/components/landing/Faq';
import { FinalCta } from '@/components/landing/FinalCta';
import { LandingFooter } from '@/components/landing/LandingFooter';
import '@/components/landing/landing.css';
import '@/components/landing/landing-a.css';
import '@/components/landing/landing-b.css';
import '@/components/landing/landing-c.css';

// Landing gaya 8B "Sill" (REDESIGN_PLAN.md §3.1). Lenis dan GSAP hanya dimuat di route ini.
export default function LandingPage() {
  return (
    <SmoothScroll>
      <div className="bg-canvas text-text">
        <LandingNav />
        {/* clip: posisi awal adegan (panel bergeser, bukit ink) tidak boleh membuat scroll horizontal */}
        <main className="overflow-x-clip">
          <Opening hero={<HeroFigureLazy className="h-full w-full" />} />
          <ExerciseExplorer />
          <SessionDay />
          <CoachSenses />
          <CoachNotes />
          <Privacy />
          <ProgressPreview />
          <Programs />
          <Promises />
          <Pricing />
          <Faq />
          <FinalCta />
        </main>
        <LandingFooter />
      </div>
    </SmoothScroll>
  );
}
