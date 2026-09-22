import { describe, it, expect } from 'vitest';
import { buildWhatsAppShareUrl } from '../share-card';

describe('Social Sharing Formatter', () => {
  it('should generate valid WhatsApp intent URL with session metrics', () => {
    const url = buildWhatsAppShareUrl({
      exerciseName: 'Push-up',
      reps: 20,
      cleanReps: 18,
      holdDurationSec: null,
      sessionDurationSec: 90,
      formScore: 94,
      caloriesBurned: 15,
    });

    expect(url).toContain('https://api.whatsapp.com/send?text=');
    expect(url).toContain(encodeURIComponent('Push-up'));
    expect(url).toContain(encodeURIComponent('94%'));
  });
});
