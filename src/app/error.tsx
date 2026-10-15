'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global Application Error:', error);
  }, [error]);

  return (
    <ErrorState
      title="Ada kendala di aplikasi"
      description="Terjadi kesalahan yang tidak terduga. Coba muat ulang, atau kembali ke beranda."
      reset={reset}
      detail={error?.message}
    />
  );
}
