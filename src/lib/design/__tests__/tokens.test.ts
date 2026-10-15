import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { dark, light } from '../tokens';

const css = fs.readFileSync(path.resolve(__dirname, '../../../app/globals.css'), 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

const kebab = (k: string) => k.replace(/([a-z])([A-Z0-9])/g, '$1-$2').toLowerCase();

describe('tokens.ts sinkron dengan globals.css', () => {
  it.each([
    ['dark', dark, ':root,\n[data-theme="dark"]'],
    ['light', light, '[data-theme="light"] {'],
  ] as const)('%s', (_, tokens, selector) => {
    const vars = block(selector);
    for (const [k, v] of Object.entries(tokens)) expect(vars[kebab(k)], kebab(k)).toBe(v);
  });
});
