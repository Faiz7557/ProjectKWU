// Menyalin runtime WASM MediaPipe dari paket yang di-lock ke public/wasm.
// Dengan begitu versi WASM = versi package (tidak ada @latest dari CDN) dan PWA bisa offline.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const dest = join(root, 'public', 'wasm');

if (!existsSync(src)) {
  console.warn('[sync-mediapipe-wasm] node_modules/@mediapipe/tasks-vision/wasm tidak ditemukan; dilewati.');
  process.exit(0);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`[sync-mediapipe-wasm] WASM disalin ke ${dest}`);
