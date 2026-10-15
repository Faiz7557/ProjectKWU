'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';

export default function HistoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('History Page Error:', error);
  }, [error]);

  return (
    <ErrorState
      title="Riwayat belum bisa dimuat"
      description="Ada masalah saat membaca riwayat latihan dari penyimpanan perangkat. Data kamu tidak hilang. Coba lagi beberapa saat."
      reset={reset}
      detail={error?.message}
    />
  );
}
