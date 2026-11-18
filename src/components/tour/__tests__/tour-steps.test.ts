import { describe, expect, it } from 'vitest';
import { STEPS, TOUR_TARGETS, tourKey } from '../tour-steps';

describe('tourKey', () => {
  it.each([
    ['/workout', '/workout'],
    ['/workout/pushup', '/workout/[exercise]'],
    ['/workout/routine/abc', '/workout/routine/[routineId]'],
    ['/history', '/history'],
    ['/', null],
    ['/dev/three', null],
    ['/workout/routine', null],
    ['/workout/a/b/c', null],
  ])('%s -> %s', (path, key) => expect(tourKey(path)).toBe(key));
});

describe('STEPS', () => {
  it('semua halaman punya >= 3 langkah berisi', () => {
    for (const [page, steps] of Object.entries(STEPS)) {
      expect(steps.length, page).toBeGreaterThanOrEqual(3);
      for (const s of steps) {
        expect(s.title.trim(), page).not.toBe('');
        expect(s.body.trim(), page).not.toBe('');
      }
    }
  });

  it('TOUR_TARGETS cocok dengan target di STEPS', () => {
    expect(Object.keys(TOUR_TARGETS).sort()).toEqual(Object.keys(STEPS).sort());
    for (const [page, steps] of Object.entries(STEPS)) {
      expect(TOUR_TARGETS[page]).toEqual(steps.flatMap((s) => (s.target ? [s.target] : [])));
    }
    expect(TOUR_TARGETS['/workout']).toContain('wk-tabs');
    expect(TOUR_TARGETS['/history']).toContain('hs-stats');
  });
});
