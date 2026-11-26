import { Lock } from 'lucide-react';
import { Card } from './Surfaces';
import { Button } from './Button';
import { rupiah } from '@/components/landing/pricing-data';
import { PREMIUM_LIFETIME } from '@/lib/payment/plans';

/** Pengganti konten fitur Premium untuk akun gratis / tamu. */
export function PremiumLock({ feature, description, className }: { feature: string; description: string; className?: string }) {
  return (
    <Card tone={8} className={className}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Lock className="mt-1 size-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-display text-title-3">{feature} khusus Premium</h2>
            <p className="mt-1 text-footnote">{description}</p>
          </div>
        </div>
        <Button href="/premium" variant="secondary" className="shrink-0 self-start sm:self-auto">
          Buka Premium {rupiah(PREMIUM_LIFETIME.price)}
        </Button>
      </div>
    </Card>
  );
}
