import { describe, it, expect } from 'vitest';
import { motionQueries } from '../useScene';

describe('motionQueries', () => {
  it('default: satu query motion-ok', () => {
    expect(motionQueries()).toEqual({ motion: '(prefers-reduced-motion: no-preference)' });
  });
  it('custom: tiap query digabung dengan no-preference', () => {
    const q = motionQueries({ wide: '(min-width: 768px)', narrow: '(max-width: 767.98px)' });
    expect(Object.keys(q)).toEqual(['wide', 'narrow']);
    for (const v of Object.values(q)) expect(v).toContain('prefers-reduced-motion: no-preference');
    expect(q.wide).toBe('(min-width: 768px) and (prefers-reduced-motion: no-preference)');
  });
});
