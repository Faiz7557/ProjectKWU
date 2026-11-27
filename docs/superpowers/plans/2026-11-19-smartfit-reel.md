# SMART-FIT Promo Reel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a ±44 s, 1080×1920 Indonesian promo reel for SMART-FIT (story B, push-up session in a kamar kos) with Remotion, reusing the app's own 3D mannequin.

**Architecture:** Standalone Remotion project at `Project KWU/smartfit-reel/` that imports the app's pure-`three` modules from `../smartfit-v2/src` through an `@/` alias. Voiceover clips (edge-tts) produce a JSON manifest; a pure `buildTimeline()` turns it into scene slots, so scene lengths, captions and music ducking all derive from the audio. Every visual is a function of `useCurrentFrame()`.

**Tech Stack:** Remotion 4.0.545 (`remotion`, `@remotion/cli`, `@remotion/three`, `@remotion/google-fonts`, all pinned to the same exact version), `@react-three/fiber` 9.x, `three` 0.187.0, React 19.2.8, TypeScript 5, Vitest 5, Python 3.13 + `edge-tts` 7.3.1, ffmpeg/ffprobe (already installed).

**Spec:** `Project KWU/smartfit-v2/docs/superpowers/specs/2026-11-19-smartfit-reel-design.md`

## Global Constraints

- Output: MP4 H.264 + AAC, 1080×1920, 30 fps, total < 50 s (target ±44 s), file `smartfit-reel/out/smartfit-reel.mp4`.
- No changes to anything under `smartfit-v2/` except reading it (screenshots run its dev server).
- `three` must be exactly `0.187.0` and resolve to ONE copy (the reel's) for both reel code and aliased app code.
- Voiceover text, verbatim, voice `id-ID-ArdiNeural`:
  - s1 "Jam setengah sepuluh malam. Mau push-up… tapi sudah benar belum, ya?"
  - s2 "Cukup buka SMART-FIT di browser. Nggak perlu install, nggak perlu alat."
  - s3 "Kamera HP-mu membaca tiga puluh tiga titik tubuh, lalu menghitung setiap repetisi otomatis."
  - s4 "Pinggulmu turun? SMART-FIT langsung mengingatkan lewat suara, kayak ada pelatih di sebelahmu."
  - s5 "Progresmu tercatat tiap hari. Dan videomu nggak pernah keluar dari HP-mu."
  - s6 "SMART-FIT. Pelatih pribadi di browser-mu. Coba gratis sekarang, link di bio."
- App coach cue (scene 4), voice `id-ID-GadisNeural` + phone EQ: "Jaga otot perut kencang agar pinggul sejajar dengan bahu dan kaki." (exact `description` of `sagging_hips`, `src/trackers/pushup-tracker.ts:104`; this is what `voiceCoach.speakCorrection` speaks while the fault is active).
- On-screen fault label: "Pinggul Turun / Melengkung". Opening caption: "21.30, kamar kos." CTA: "Coba gratis · Link di bio".
- Brand: import colours from `@/lib/design/tokens` (`panels`, `stage`); accent `#cf6224`, near-black `#0b0a0a`, off-white `#f4f1ee`. Fonts Gabarito (display) + Rethink Sans (body) via `@remotion/google-fonts`.
- Reels safe zone for all text: x 60–960, y 220–1500.
- Never mention vibration/getaran. No invented marketing numbers.
- Determinism: no `Math.random`, `Date.now`, `requestAnimationFrame`, `useFrame` clocks in `src/`.
- Git: `smartfit-reel/` gets its own repo. Commit messages carry NO `Co-Authored-By: Claude` line (a local hook blocks it).

## Review Focus

1. Aliased app files resolving `three` from `smartfit-v2/node_modules` (two copies) → blank canvas or R3F "not an Object3D" errors. Pinned by `alias.test.ts` (Task 1).
2. VO clips run long → total ≥ 50 s or CTA held < 4 s. Pinned by `timeline.test.ts` limits (Task 4).
3. Captions or labels drawn into the Reels overlay zones. Pinned by `safe.test.ts` (Task 4).
4. edge-tts 7.x emits only sentence boundaries by default → empty `words`, no captions. Pinned by `manifest.test.ts` (Task 3).
5. Fonts not loaded before frame capture → fallback serif in render. Checked on stills in Task 7 and Task 8.

---

### Task 1: Scaffold the reel project and prove the app import path

**Files:**
- Create: `smartfit-reel/package.json`, `tsconfig.json`, `remotion.config.ts`, `vitest.config.ts`, `.gitignore`
- Create: `smartfit-reel/src/index.ts`, `src/Root.tsx`, `src/Probe.tsx`
- Test: `smartfit-reel/src/__tests__/alias.test.ts`

**Interfaces:**
- Produces: alias `@/*` → `../smartfit-v2/src/*` in tsconfig, webpack (Remotion) and Vitest; alias `three` → `<reel>/node_modules/three` in webpack and Vitest. Composition registry in `src/Root.tsx` (later tasks add `SmartfitReel`).

- [ ] **Step 1:** `git init` in `smartfit-reel/`; `.gitignore` = `node_modules/`, `out/`. `npm init -y`; install exact: `remotion@4.0.545 @remotion/cli@4.0.545 @remotion/three@4.0.545 @remotion/google-fonts@4.0.545 @react-three/fiber@9 three@0.187.0 react@19.2.8 react-dom@19.2.8`; dev: `typescript@5 vitest@5 @types/react @types/three`. Scripts: `"studio": "remotion studio"`, `"test": "vitest run"`, `"render": "remotion render SmartfitReel out/smartfit-reel.mp4 --codec h264"`.
- [ ] **Step 2:** `remotion.config.ts`: `Config.setChromiumOpenGlRenderer('angle')`; `Config.overrideWebpackConfig` adding `resolve.alias['@'] = path.resolve(__dirname, '../smartfit-v2/src')`, `resolve.alias['three$'] = path.resolve(__dirname, 'node_modules/three')` and `three/addons` → `node_modules/three/examples/jsm`. Mirror the aliases in `vitest.config.ts` and `@/*` in `tsconfig.json` `paths`.
- [ ] **Step 3: Write the failing test** `alias.test.ts`:
  ```ts
  import * as THREE from 'three';
  import { EXERCISE_REFERENCES } from '@/lib/mediapipe/reference-poses';
  import { createMannequin } from '@/lib/three/mannequin';
  test('app modules load through @ alias', () => {
    expect(EXERCISE_REFERENCES.pushup.phases).toHaveLength(2);
  });
  test('app three and reel three are the same copy', () => {
    const m = createMannequin({ bodyColor: '#f4f1ee', jointColor: '#cf6224' });
    expect(m.group).toBeInstanceOf(THREE.Group);
  });
  ```
- [ ] **Step 4:** `npm test` → FAIL before the aliases exist, PASS after Step 2.
- [ ] **Step 5:** `Probe.tsx`: `<ThreeCanvas width={1080} height={1920}>` with lights and a mannequin from `createMannequin` (built once in `useMemo`, `update(withDepth(phases[1].landmarks,'side'),'side')`), camera at a 3/4 view. Register `Probe` (1080×1920, 30 fps, 30 frames) in `Root.tsx`.
- [ ] **Step 6:** `npx remotion still Probe out/probe.png --frame=0` → open the PNG: a lit mannequin in plank pose.
- [ ] **Step 7:** Commit `chore: scaffold remotion reel, alias app 3D modules`.

### Task 2: Push-up poses (cycle, sagging fault, full 33 points)

**Files:**
- Create: `smartfit-reel/src/poses.ts`
- Test: `smartfit-reel/src/__tests__/poses.test.ts`

**Interfaces:**
- Consumes: `EXERCISE_REFERENCES`, `withDepth`, `blendPose`, `NormalizedLandmark` (`@/trackers/types`).
- Produces:
  - `PUSHUP_UP`, `PUSHUP_DOWN: NormalizedLandmark[]` (depth applied; up = the phase whose nose `y` is smaller; today `phases[1]` is up, `phases[0]` is down).
  - `pushupAt(reps: number): NormalizedLandmark[]`: fractional part 0→0.5 up→down, 0.5→1 down→up, `easeInOutSine`, via `blendPose`.
  - `sagging(pose: NormalizedLandmark[], amount: number): NormalizedLandmark[]`: hips 23/24 `y += 0.08*amount`, knees 25/26 `y += 0.04*amount`, everything else unchanged.
  - `toFullBody33(pose: NormalizedLandmark[]): NormalizedLandmark[]`: fills 1–10 (eyes, ears, mouth around the nose, offset along shoulder→nose), 17–22 (pinky/index/thumb ahead of the wrist along elbow→wrist), 29–32 (heel/foot-index around the ankle along knee→ankle).

- [ ] **Step 1: Write failing tests:** `pushupAt(0)` equals `PUSHUP_UP` within 1e-6 for joints 11–28; `pushupAt(0.5)` equals `PUSHUP_DOWN`; `pushupAt(1)` equals `pushupAt(0)`; `sagging(p,1)[23].y - p[23].y` ≈ 0.08 with `[11]` and `[27]` unchanged; `sagging(p,0)` deep-equals `p`; `toFullBody33(PUSHUP_UP)` has length 33, and every derived index (1–10, 17–22, 29–32) is within 0.06 (x/y distance) of its anchor (nose 0, wrists 15/16, ankles 27/28) and is not the `createEmptyPose` default `(0.5, 0.5)`.
- [ ] **Step 2:** `npm test -- poses` → FAIL.
- [ ] **Step 3:** Implement `src/poses.ts`.
- [ ] **Step 4:** `npm test -- poses` → PASS.
- [ ] **Step 5:** Commit `feat: push-up cycle, sagging fault and 33-point poses`.

### Task 3: Voiceover generation and manifest

**Files:**
- Create: `smartfit-reel/scripts/tts.py`, `smartfit-reel/scripts/vo-text.json`, `smartfit-reel/src/vo-text.ts`, `smartfit-reel/src/timeline.ts` (types only)
- Output: `public/vo/s1.mp3`…`s6.mp3`, `public/vo/coach.mp3`, `src/vo-manifest.json`
- Test: `smartfit-reel/src/__tests__/manifest.test.ts`

**Interfaces:**
- Produces (types in `src/timeline.ts`, Task 4 adds the functions):
  ```ts
  export type SceneId = 's1' | 's2' | 's3' | 's4' | 's5' | 's6';
  export interface Word { text: string; startMs: number; endMs: number }
  export interface VoManifest {
    scenes: { id: SceneId; file: string; durationMs: number; words: Word[] }[];
    coach: { file: string; durationMs: number };
  }
  ```
- `scripts/vo-text.json` is the single source of the strings (verbatim from Global Constraints, keys `s1`…`s6`, `coach`); `src/vo-text.ts` re-exports it as `VO_TEXT: Record<SceneId, string>` and `COACH_TEXT`.

- [ ] **Step 1:** Tell the user the script text goes to Microsoft's TTS service (spec: accepted), then `pip install edge-tts==7.3.1`.
- [ ] **Step 2: Write failing test** `manifest.test.ts`: 6 scenes in order s1–s6; each `file` exists under `public/`; each `words` non-empty with strictly increasing `startMs` and last `endMs` ≤ `durationMs`; joined `words` text (case- and punctuation-insensitive) equals `VO_TEXT[id]`; `coach.durationMs` > 0.
- [ ] **Step 3:** `npm test -- manifest` → FAIL (no manifest).
- [ ] **Step 4:** `tts.py`: per scene `edge_tts.Communicate(text, 'id-ID-ArdiNeural', boundary='WordBoundary')`, stream audio to mp3 and collect `WordBoundary` events (offset/duration in 100 ns units → ms). Coach: `id-ID-GadisNeural`, then `ffmpeg -af "highpass=f=450,lowpass=f=3400"`. `durationMs` from `ffprobe -show_entries format=duration`. Write `src/vo-manifest.json`. Run `python scripts/tts.py`.
- [ ] **Step 5:** `npm test -- manifest` → PASS. Listen to `s2.mp3` and `coach.mp3` once (how "SMART-FIT" and "HP-mu" are read). If "SMART-FIT" is misread, add an optional `tts` override per key in `vo-text.json` (e.g. "Smart Fit") used only for synthesis; captions and the test keep the original text, and the test normalises that token.
- [ ] **Step 6:** Commit `feat: edge-tts voiceover and word-timed manifest`.

### Task 4: Timeline, music ducking, captions, safe zone

**Files:**
- Modify: `smartfit-reel/src/timeline.ts`
- Create: `smartfit-reel/src/ui/safe.ts`
- Test: `src/__tests__/timeline.test.ts`, `src/__tests__/safe.test.ts`

**Interfaces:**
- Produces:
  - `TARGET_SEC: Record<SceneId, number> = { s1: 4, s2: 6, s3: 10, s4: 10, s5: 8, s6: 6 }`
  - `interface SceneSlot { id: SceneId; from: number; durationInFrames: number; voFrom: number; voFile: string; voFrames: number; coachFrom?: number }` (`voFrom`, `coachFrom` relative to the scene start, in frames)
  - `buildTimeline(m: VoManifest, fps: number): SceneSlot[]`. Rules: `voFrom` = 0.4 s for s1, 0.3 s otherwise; s4 has `coachFrom` = 1.0 s and `voFrom` = 1.0 s + coach + 0.3 s. Duration = `max(TARGET_SEC, voFrom + vo + 0.6 s)`, except s6 = `max(6 s, voFrom + vo + 1.5 s)`. Round up to whole frames.
  - `totalFrames(slots: SceneSlot[]): number`
  - `voWindows(slots: SceneSlot[], m: VoManifest, fps: number): [number, number][]` (absolute frames, includes the coach cue).
  - `musicVolume(frame: number, windows: [number, number][], total: number): number`: base 0.45, 0.09 inside any window (−14 dB), 6-frame linear ramps at window edges, fade in over frames 0–15, fade out over the last 30 frames.
  - `captionAt(words: Word[], ms: number): string | null`: words grouped into phrases of ≤ 4 words, breaking after `, . ? …`; returns the phrase whose span contains `ms` (held until the next phrase starts), `null` before the first word.
  - `src/ui/safe.ts`: `SAFE = { left: 60, right: 960, top: 220, bottom: 1500 }`, `CAPTION_BOX = { x: 80, y: 1240, w: 840, h: 220 }`, `TOP_LABEL_BOX = { x: 80, y: 260, w: 840, h: 160 }`.

- [ ] **Step 1: Write failing tests** with a fixture manifest: durations follow the rules for both short and long VO; slots are contiguous (`from[i+1] = from[i] + dur[i]`, `from[0] = 0`); s4 `voFrom` > `coachFrom` + coach frames. With the real `vo-manifest.json`: `totalFrames / 30 < 50`, s6 `durationInFrames >= 4*30` and `s6.durationInFrames - (s6.voFrom + s6.voFrames) >= 1.5*30`. `musicVolume`: 0 at frame 0, 0.45 at frame 20 outside windows, 0.09 mid-window, strictly between 0.09 and 0.45 three frames into a window, 0 at `total`. `captionAt`: `null` at −1 ms, the first phrase at word 0's start, never more than 4 words. `safe.test.ts`: `CAPTION_BOX` and `TOP_LABEL_BOX` lie inside `SAFE`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: audio-driven timeline, ducking and captions`.

### Task 5: Real app screenshots with demo data

**Files:**
- Create: `smartfit-reel/scripts/seed-demo.js`
- Output: `smartfit-reel/public/screens/workout.png`, `public/screens/history.png`

**Interfaces:**
- Produces: two PNGs at 1170×2532 (390×844 CSS px, DPR 3), used as phone textures in Task 6.

- [ ] **Step 1:** Read `smartfit-v2/src/lib/storage/storage.ts` and `src/lib/gamification/types.ts`; write `seed-demo.js` (a browser snippet) that writes valid `smartfit_workout_history`, `smartfit_gamification` and `smartfit_schema_version = 2`: 7 push-up sessions on the 7 consecutive days ending today, the latest with 12 reps, current streak 7; XP and badges as the app's own rules award for that history (use the app's functions if exported, otherwise values the history page renders without errors).
- [ ] **Step 2:** Start the app with `preview_start` using the existing `smartfit-v2/.claude/launch.json` config.
- [ ] **Step 3:** With the chrome-devtools MCP: `new_page` at the dev URL, `emulate` viewport 390×844 DPR 3 mobile, light theme; `evaluate_script` the seed; navigate to `/workout`, `take_screenshot` → `public/screens/workout.png`; navigate to `/history`, screenshot → `public/screens/history.png`.
- [ ] **Step 4:** Open both PNGs: real UI, no error overlay, Next.js dev indicator hidden (remove it via `evaluate_script` before capture if present), history shows 12 reps and streak 7.
- [ ] **Step 5:** Stop the preview server. Commit `feat: real app screenshots with demo data`.

### Task 6: 3D set pieces

**Files:**
- Create: `smartfit-reel/src/three/Mannequin.tsx`, `Skeleton33.tsx`, `Room.tsx`, `Phone.tsx`, `Badge.tsx`, `src/Lab.tsx`
- Modify: `src/Root.tsx` (register `Lab`, remove `Probe`)

**Interfaces:**
- Consumes: Task 2 poses, `createMannequin`, `floorY`, `panels`, `stage`, Task 5 PNGs via `staticFile('screens/…')`.
- Produces (R3F components, pure functions of their props):
  - `<Mannequin pose={NormalizedLandmark[]} fault={0..1} />`: one `createMannequin` per mount, `update(pose,'side')` every render; body colour lerps from `#f4f1ee` to `stage.boneFault` with `fault`.
  - `<Skeleton33 pose={NormalizedLandmark[]} lit={0..33} color={string} />`: 33 emissive spheres plus bones from `POSE_CONNECTIONS`; point `i` (order: head → torso → arms → legs → hands/feet) visible when its rank < `lit`; a bone shows once both ends are lit. Positions via `toWorld` from `@/lib/three/pose-figure` so it overlays the mannequin.
  - `<Room />`: low-poly kos at night: floor, back and side wall, bed, desk with lamp (warm point light `#e3b867`), window with cool moonlight; boxes only, no external models.
  - `<Phone screen="workout" | "history" />`: rounded box 0.75×1.6×0.08 with a screen plane textured from the PNG (load with `THREE.TextureLoader` inside `delayRender`/`continueRender`).
  - `<Badge spin={number} />`: extruded medal (circle + star), accent `#cf6224`, metallic.
- [ ] **Step 1:** Build the components; `Lab.tsx` shows them in one frame (mannequin at `pushupAt(0.25)` with `fault=0.5`, skeleton `lit=20`, phone on the desk, badge floating).
- [ ] **Step 2:** `npx remotion still Lab out/lab.png --frame=0` and open it: the room reads as a bedroom, the phone screen shows the real UI sharply, the skeleton sits on the mannequin, colours match the brand.
- [ ] **Step 3:** `npm test` PASS. Commit `feat: 3D set pieces (room, phone, skeleton, badge)`.

### Task 7: Scenes, captions and the full composition

**Files:**
- Create: `smartfit-reel/src/scenes/S1Hook.tsx`, `S2Open.tsx`, `S3Track.tsx`, `S4Correct.tsx`, `S5Progress.tsx`, `S6Cta.tsx`, `src/ui/Caption.tsx`, `src/ui/fonts.ts`, `src/Reel.tsx`
- Modify: `src/Root.tsx` (register `SmartfitReel`: 1080×1920, 30 fps, `durationInFrames = totalFrames(buildTimeline(manifest, 30))`; keep `Lab`)

**Interfaces:**
- Consumes: everything above.
- Produces: composition id `SmartfitReel`.

Scene beats (frame-local; durations come from the slot):
- S1: frame 0 already moving: mannequin doing `pushupAt` with `sagging(…, 1)` and `fault=1`, slow camera push-in toward the hips; "21.30, kamar kos." in `TOP_LABEL_BOX`.
- S2: camera dollies from the room to the phone on the desk and into its screen (`workout.png`) until the screen nearly fills the frame.
- S3: camera pulls back out to the mannequin doing clean reps; `Skeleton33.lit` ramps 0→33 over the first 4 s; big rep counter (Gabarito, ~280 px) in `TOP_LABEL_BOX` counts completed `pushupAt` cycles.
- S4: hips sag (`sagging` amount 0→1 over 0.8 s, `fault` follows), red label "Pinggul Turun / Melengkung" pops in `TOP_LABEL_BOX` as the coach cue plays; after the narrator's first phrase ("Pinggulmu turun?") ends, amount eases back to 0, the skeleton turns `#80a89b` and the label becomes "Form benar".
- S5: phone with `history.png` turns toward camera; `Badge` spins in front; small lock icon + "Video tetap di HP-mu" chip.
- S6: full-frame panel `#cf6224`; "SMART-FIT" wordmark (Gabarito, `#0b0a0a`) and "Coba gratis · Link di bio" below, gentle scale-in; nothing moves after 1 s.
- `Caption`: `captionAt(scene words, localMs − voFromMs)` inside `CAPTION_BOX`; Rethink Sans 64 px bold, off-white on a `rgba(11,10,10,0.72)` pill; hidden in S6.
- `fonts.ts`: `loadFont()` from `@remotion/google-fonts/Gabarito` and `@remotion/google-fonts/RethinkSans`, called at module top level.
- `Reel.tsx`: `<Series>` of scenes from the slots; per slot `<Sequence from={slot.from + slot.voFrom}><Audio src={staticFile(slot.voFile)} /></Sequence>`; the coach cue likewise at `slot.from + coachFrom`. Music comes in Task 8.

- [ ] **Step 1:** Build the scenes and `Reel.tsx`.
- [ ] **Step 2:** Determinism check: `rg "Math.random|Date.now|requestAnimationFrame|useFrame" src` → no matches.
- [ ] **Step 3:** Stills at the start, middle and end of each scene (`npx remotion still SmartfitReel out/check-<n>.png --frame=<f>`, frames from `buildTimeline`), open each: frame 0 shows the sagging push-up; captions render in Gabarito/Rethink Sans (not a fallback serif) inside the safe zone; S4 shows red then green; S6 readable.
- [ ] **Step 4:** `npm test` PASS. Commit `feat: six scenes, captions and full reel composition`.

### Task 8: Music, final render, credits

**Files:**
- Modify: `smartfit-reel/src/Reel.tsx` (music track)
- Create: `smartfit-reel/README.md`
- Output: `smartfit-reel/public/music/bed.mp3`, `smartfit-reel/out/smartfit-reel.mp4`

- [ ] **Step 1:** Music: ask the user to drop a track at `public/music/bed.mp3` or approve a download (state title, Pixabay URL, licence, size). Requirements: upbeat lo-fi/electronic, ~95–115 BPM, ≥ 50 s, Pixabay Content License.
- [ ] **Step 2:** Add `<Audio src={staticFile('music/bed.mp3')} volume={(f) => musicVolume(f, windows, total)} />` at the top level of `Reel.tsx`.
- [ ] **Step 3:** `npm run render`.
- [ ] **Step 4:** Verify: `ffprobe out/smartfit-reel.mp4` → 1080×1920, 30 fps, h264 + aac, duration < 50 s. Extract frames at 0 s, 1 s and one per scene (`ffmpeg -ss <t> -i … -frames:v 1`) and open them; listen once: VO intelligible over music, coach cue audible before the narrator in S4, no clipping.
- [ ] **Step 5:** `README.md`: how to regenerate (`python scripts/tts.py`, `npm test`, `npm run render`), music title/artist/source URL/licence, edge-tts voice names.
- [ ] **Step 6:** Commit `feat: music bed, final render, credits` (`out/` stays ignored). Send `out/smartfit-reel.mp4` to the user.
