import { describe, it, expect } from 'vitest';
import { getThemePref } from '../use-theme';

describe('getThemePref', () => {
  it('default terang tanpa nilai tersimpan', () => {
    localStorage.removeItem('smartfit-theme');
    expect(getThemePref()).toBe('light');
  });
});
