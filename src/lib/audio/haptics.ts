/**
 * Haptic feedback utility memanfaatkan Web Vibration API
 * Berjalan aman di mobile browser (Android Chrome/Samsung Internet, dll)
 * dengan fallback senyap jika perangkat tidak mendukung vibration.
 */

export function triggerHapticSuccess(): void {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      // Getaran halus 50ms untuk repetisi bersih
      navigator.vibrate(50);
    } catch {
      // Ignore vibration error
    }
  }
}

export function triggerHapticFault(): void {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      // Getaran ganda tajam untuk peringatan kesalahan form
      navigator.vibrate([100, 60, 100]);
    } catch {
      // Ignore
    }
  }
}

export function triggerHapticMilestone(): void {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      // Pola getaran selebrasi untuk pencapaian target / selesai sesi
      navigator.vibrate([80, 50, 80, 50, 180]);
    } catch {
      // Ignore
    }
  }
}
