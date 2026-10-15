import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getThemePref, resolveTheme, setThemePref } from '../use-theme';

let systemLight = false;
const meta = { content: '', setAttribute(_: string, v: string) { this.content = v; } };
const root = { dataset: {} as Record<string, string>, style: {} as Record<string, string> };

beforeEach(() => {
  localStorage.clear();
  systemLight = false;
  root.dataset = {};
  root.style = {};
  vi.stubGlobal('document', { documentElement: root, querySelector: () => meta });
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: q.includes('light') ? systemLight : false,
    addEventListener() {},
    removeEventListener() {},
  }));
});

describe('use-theme', () => {
  it('default dark tanpa preferensi tersimpan', () => {
    expect(getThemePref()).toBe('dark');
  });

  it('system mengikuti matchMedia', () => {
    expect(resolveTheme('system')).toBe('dark');
    systemLight = true;
    expect(resolveTheme('system')).toBe('light');
  });

  it('setThemePref menulis localStorage dan data-theme', () => {
    setThemePref('light');
    expect(localStorage.getItem('smartfit-theme')).toBe('light');
    expect(getThemePref()).toBe('light');
    expect(root.dataset.theme).toBe('light');
    expect(root.style.colorScheme).toBe('light');
    expect(meta.content).toBe('#F5F5F7');

    systemLight = false;
    setThemePref('system');
    expect(localStorage.getItem('smartfit-theme')).toBe('system');
    expect(root.dataset.theme).toBe('dark');
  });
});
