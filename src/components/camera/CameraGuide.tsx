'use client';

import { useState } from 'react';
import type { ExerciseConfig } from '@/trackers/types';
import { Camera, Smartphone, CheckCircle2, UserCheck, ShieldCheck } from 'lucide-react';
import { ReferencePoseVisualizer } from './ReferencePoseVisualizer';
import { SegmentedControl } from '@/components/ui/Controls';
import { Button } from '@/components/ui/Button';
import { Card, Badge } from '@/components/ui/Surfaces';
import { ExerciseIcon } from '@/components/ui/ExerciseIcon';

interface CameraGuideProps {
  config: ExerciseConfig;
  onReady: () => void;
}

type GuideTab = 'pose' | 'camera';

export function CameraGuide({ config, onReady }: CameraGuideProps) {
  const isFront = config.cameraOrientation === 'front';
  const [tab, setTab] = useState<GuideTab>('pose');

  return (
    <Card className="mx-auto max-w-xl space-y-6 p-5 sm:p-6">
      <header className="flex items-center gap-3">
        <ExerciseIcon exercise={config.id} />
        <div className="min-w-0">
          <p className="text-caption font-semibold text-accent-text">Persiapan latihan</p>
          <h2 className="text-title-2 text-text">{config.name}</h2>
        </div>
      </header>

      <SegmentedControl<GuideTab>
        label="Panduan"
        value={tab}
        onValueChange={setTab}
        options={[
          { value: 'pose', label: 'Contoh gerakan', icon: <UserCheck className="size-4" aria-hidden="true" /> },
          { value: 'camera', label: 'Posisi kamera', icon: <Smartphone className="size-4" aria-hidden="true" /> },
        ]}
      />

      {tab === 'pose' && <ReferencePoseVisualizer exerciseId={config.id} autoPlayDefault={true} />}

      {tab === 'camera' && (
        <div className="animate-enter space-y-4">
          <div className="flex flex-col items-center gap-3 rounded-lg bg-surface-3 p-5 text-center">
            <span className="grid size-16 place-items-center rounded-full border-2 border-dashed border-accent-text/40 text-accent-text" aria-hidden="true">
              <Smartphone className="size-8" />
            </span>
            <Badge tone="accent">{isFront ? 'Menghadap ke depan' : 'Arahkan dari samping'}</Badge>
            <p className="max-w-sm text-callout text-text-2">
              {isFront
                ? 'Letakkan HP atau laptop tegak lurus di depan kamu, agar seluruh tubuh dari kepala sampai kaki terlihat.'
                : 'Posisikan kamera di samping tubuh kamu (jarak sekitar 1,5 sampai 2 meter), agar lutut, pinggul, atau siku terlihat jelas.'}
            </p>
          </div>

          <ul className="space-y-2.5 rounded-lg border border-separator bg-canvas p-4">
            {config.instructions.map((inst, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-callout text-text-2">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
                <span>{inst}</span>
              </li>
            ))}
            <li className="flex items-start gap-2.5 text-callout text-text-2">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
              <span>Video kamu tidak pernah dikirim ke server mana pun.</span>
            </li>
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <Button size="xl" className="w-full" onClick={onReady} icon={<Camera className="size-5" aria-hidden="true" />}>
          Nyalakan kamera
        </Button>
        <p className="text-center text-footnote text-text-3">Browser akan meminta izin kamera.</p>
      </div>
    </Card>
  );
}
