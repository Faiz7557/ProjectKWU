# SMART-FIT Promo Reel — Design

Date: 2026-11-19 · Status: draft, awaiting approval

## Intent

A short vertical promo video (Instagram/TikTok Reels) that sells SMART-FIT v2 to
**prospective customers: university students and beginners who work out at home
without a coach**. The viewer should come away knowing that SMART-FIT watches their
form through the phone camera, counts reps, corrects mistakes in real time, keeps
their video private, and is free to try in the browser, and then tap the link in bio.

## Goals

- 9:16, 1080×1920, 30 fps, MP4 (H.264 + AAC), total length about 44 s (hard cap < 60 s).
- Immersive 3D: the app's own 3D mannequin, a 3D phone mockup, camera moves around the figure.
- Indonesian voiceover plus background music, and large on-screen subtitles that carry the
  message with the sound off.
- Story direction **B, "one workout session in a boarding-house room (kamar kos)"**: follow one
  user from opening the app to finishing a push-up session.

## Non-goals

- No other exercises: push-up only, so one session stays focused.
- No real human footage, no avatars.
- No pricing details beyond "coba gratis" (the Free vs Paid feature list is still undecided by the team).
- Not added to the SMART-FIT web app; no change to app code.

## Anti-goals (fail even if it renders)

- Claims the product does not make: no "getaran/vibration" (Android-only), no fake stats,
  no team names, no features not in the codebase.
- A first second that is calm or empty: the opening frame must already show motion
  (the mannequin doing a faulty push-up), or viewers scroll past.
- Subtitles or key UI sitting under Reels' overlay zones (see Constraints).
- A mockup screen that is invented UI rather than the real app.

## Approaches considered

1. **Remotion + `@remotion/three` (React).** Chosen by the user. Imports the existing
   TypeScript 3D modules directly (`mannequin.ts`, `pose-blend.ts`, `pose-depth.ts`,
   `pose-figure.ts`, `reference-poses`), frame-driven so 3D, captions and audio stay in sync.
   Cost: audio ducking is done by hand with per-frame volume. Remotion licence is free for
   individuals and teams of 3 or fewer.
2. HyperFrames (HTML to video) + Three.js. Better built-in audio and caption tooling, but the
   TS 3D modules would have to be bundled or ported, making the mannequin a separate copy.
3. Plain Three.js + canvas recording. Rejected: real-time capture drops frames and audio sync is unreliable.

## Storyboard and voiceover (approved by user)

Voice: edge-tts `id-ID-ArdiNeural` (male). Tone: casual, talking to a classmate.
Timings are targets; the real scene lengths follow the generated voiceover clips.

| # | Time | On screen | Voiceover (verbatim) |
|---|------|-----------|----------------------|
| 1 | 0–4 s | Low-poly 3D kamar kos at night. Mannequin mid push-up with hips sagging, torso glowing red. Text "21.30, kamar kos." | "Jam setengah sepuluh malam. Mau push-up… tapi sudah benar belum, ya?" |
| 2 | 4–10 s | Phone leaning on a desk (3D), camera pushes into its screen showing the real app UI. | "Cukup buka SMART-FIT di browser. Nggak perlu install, nggak perlu alat." |
| 3 | 10–20 s | Pull back out to the mannequin; the 33-point skeleton lights up orange point by point; rep counter climbs. | "Kamera HP-mu membaca tiga puluh tiga titik tubuh, lalu menghitung setiap repetisi otomatis." |
| 4 | 20–30 s | Hips sag, red highlight plus fault label "Pinggul Turun / Melengkung" (real string, `src/trackers/pushup-tracker.ts:102`); form corrects and turns green. | "Pinggulmu turun? SMART-FIT langsung mengingatkan lewat suara, kayak ada pelatih di sebelahmu." |
| 5 | 30–38 s | Session summary: streak, XP, 3D badge spinning, a lock icon for privacy. | "Progresmu tercatat tiap hari. Dan videomu nggak pernah keluar dari HP-mu." |
| 6 | 38–44 s | Orange panel (`#cf6224`), SMART-FIT wordmark, "Coba gratis · Link di bio", held at least 4 s. | "SMART-FIT. Pelatih pribadi di browser-mu. Coba gratis sekarang, link di bio." |

## Constraints

- **Location:** new standalone project at `Project KWU/smartfit-reel/` (sibling of `smartfit-v2/`),
  its own `package.json`. It imports the 3D modules from `../smartfit-v2/src/...` via a path
  alias (`@/` mapped to `../smartfit-v2/src`) in Remotion's webpack override, and uses the
  same `three` version as the app (0.187.0) so the modules behave identically.
- **Brand:** colours and fonts from the app: `src/lib/design/tokens.ts` and `src/app/globals.css`
  (accent `#cf6224`; panels `#6e1116`, `#5a3cd4`, `#80a89b`, `#e3b867`; near-black `#0b0a0a`;
  off-white `#f4f1ee`). Fonts: Gabarito (display), Rethink Sans (body), Google Fonts.
- **Reels safe zone:** keep subtitles and key text inside roughly the central area, clear of the
  top ~220 px and bottom ~420 px, and of the right-hand ~120 px (action buttons).
- **Determinism:** all motion derives from `useCurrentFrame()`; no `requestAnimationFrame`,
  `Date.now()` or `Math.random()` without a seed.
- **Audio:** voiceover generated with `edge-tts` (`pip install edge-tts`); the script text is sent
  to Microsoft's TTS service (user accepted). Music: a royalty-free track with a licence that
  allows commercial social use (e.g. Pixabay Music), with source and licence noted in the project
  README. Music ducks under the voice (around -14 dB while speaking).
- **Subtitles:** large, high-contrast, synced to the voiceover (per sentence or per phrase).

## Decided by the user

- Audience: students and home-workout beginners without a coach.
- Story direction B; push-up only; the voiceover script above, verbatim.
- Music + voiceover; voiceover via edge-tts.
- Built with Remotion.
- CTA "Coba gratis … link di bio"; no public URL or social handle exists yet.
- Scene 5 keeps streak, XP and badges alongside "coba gratis" (they are ungated in the code today;
  the user accepts this even though the Free vs Paid split is not final).

## My calls (correctable)

- Narrator voice `id-ID-ArdiNeural`; swapping to `id-ID-GadisNeural` is one parameter.
- Opening frame shows the faulty push-up in motion before the caption, to hook in the first second.
- No vibration claim in the reel.
- Separate project folder so video dependencies never touch the app.
- **Demo data for app screens:** seed one plausible demo session into local storage before
  capturing screenshots (12 push-ups matching the scene 3 counter, 7-day streak). This is product
  UI shown with example data, not a claim about users; "no fake stats" means no invented
  marketing figures (user counts, accuracy percentages).
- **"33 titik":** BlazePose really tracks 33 landmarks, so the line is true. The push-up reference
  only fills 13; for the light-up effect, derive the missing face, hand and foot points from the
  nearest joints (as `mannequin.ts` already does for head/hands/feet) so 33 points light up.
  It is an illustration of what the tracker sees, not tracker output.
- **App voice in scene 4:** play the app's own spoken correction as a short cue right before the
  narrator line, using a second voice (`id-ID-GadisNeural`) with a small phone-speaker EQ, so the
  viewer hears the coach, then the narrator explains it. Use the exact string the app speaks
  (`voiceCoach.speakCorrection` path) for that fault.

## Left to the builder

- **Faulty pose:** reference data in `src/lib/mediapipe/reference-poses` only has correct
  push-up phases. Derive the "hips sagging" pose by lowering hip/knee landmarks of the plank
  phase, and blend between correct and faulty with `blendPose`.
- **Real app UI for the phone screen (scene 2) and summary (scene 5):** capture screenshots of
  the running app (e.g. exercise picker/workout start, session summary) at phone size from the
  local dev server, and map them as textures onto the 3D phone. The workout screen itself needs a
  live camera, so pick screens that render without one, or overlay the tracking HUD look in 3D.
- Kamar kos set: simple low-poly geometry built in code (floor, wall, bed, desk, lamp), warm
  night lighting; no external models needed.
- Camera paths, easing, transitions, sound effects (light whooshes or ticks on rep count), and the
  exact music track.
- Exact scene lengths from the voiceover clip durations, keeping the total under 50 s.
- Render command and output path (e.g. `smartfit-reel/out/smartfit-reel.mp4`).
