import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { dark, light, panels } from '../tokens';

const css = fs.readFileSync(path.resolve(__dirname, '../../../app/globals.css'), 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

const kebab = (k: string) => k.replace(/([a-z])([A-Z0-9])/g, '$1-$2').toLowerCase();

describe('tokens.ts sinkron dengan globals.css', () => {
  it.each([
    ['light', light, ':root,\n[data-theme="light"]'],
    ['dark', dark, '[data-theme="dark"] {'],
  ] as const)('%s', (_, tokens, selector) => {
    const vars = block(selector);
    for (const [k, v] of Object.entries(tokens)) expect(vars[kebab(k)], kebab(k)).toBe(v);
  });

  it('panel sinkron', () => {
    const vars = block(':root {');
    panels.forEach((p, i) => {
      expect(vars[`panel-${i + 1}`]).toBe(p.bg);
      expect(vars[`on-panel-${i + 1}`]).toBe(p.on);
    });
  });
});

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

describe('kontras WCAG', () => {
  it.each([['light', light], ['dark', dark]] as const)('%s: teks/data di atas semua latar >= 4.5', (_, t) => {
    const fg = [t.text, t.text2, t.text3, t.accentText, t.success, t.warning, t.danger,
      t.dataReps, t.dataForm, t.dataKcal, t.dataSym, t.dataXp, t.dataStreak, t.focusRing];
    for (const f of fg) for (const bg of [t.canvas, t.surface, t.surface2, t.surface3]) {
      expect(ratio(f, bg), `${f} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each([['light', light], ['dark', dark]] as const)('%s: onAccent di atas accent', (_, t) => {
    expect(ratio(t.onAccent, t.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it('on-panel di atas panel', () => {
    for (const p of panels) expect(ratio(p.on, p.bg), p.bg).toBeGreaterThanOrEqual(4.5);
  });
});
