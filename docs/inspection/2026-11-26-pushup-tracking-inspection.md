# Inspeksi Tracking Gerakan: Rep "Stuck" dan Hitungan Hilang

Tanggal: 26 November 2026
Lingkup: semua mode gerakan (`pushup`, `squat`, `situp`, `jumping_jack`, `plank`) di
`/workout/[exercise]` dan `/workout/routine/[routineId]`, plus pipeline inferensi bersama.

Status:
- Semua temuan di dokumen ini sudah diperbaiki.
- Test: 135/135 lulus (sebelumnya 113). Typecheck dan lint bersih.
- Halaman workout termuat tanpa error.
- **Belum diverifikasi:** gerakan nyata di depan kamera. Langkah uji ada di bagian 8.

---

## 1. Gejala yang dilaporkan

Saat push-up naik-turun, hitungan sering macet. Status tertahan "down" walau lengan sudah lurus,
atau tertahan "up" walau dada sudah turun. Kadang sesi tiba-tiba berhenti di tengah set.

## 2. Alur data

```
getUserMedia (640x480, 30 fps)             src/hooks/useCamera.ts
  -> PoseLandmarker.detectForVideo          src/lib/mediapipe/pose-detector.ts  (lite/full, VIDEO mode)
  -> LandmarkSmoother (1€ filter, 99 ch)    src/trackers/base-tracker.ts
  -> Tracker.processLandmarks               src/trackers/*-tracker.ts
       -> RepAccumulator / RepStateMachine  src/trackers/rep-state-machine.ts
  -> HandsFreeGestureDetector               src/lib/gestures/detector.ts  (jeda / selesai)
  -> publish (throttle) -> React state      src/hooks/usePoseDetection.ts
  -> HUD, voice coach, tempo, kalibrasi     halaman workout
```

State machine rep (dipakai push-up, squat, sit-up, jumping jack):

```
TOP --(sinyal < top-delta, tahan 80 ms)--> DESCENDING --(sinyal <= bottom)--> BOTTOM
BOTTOM --(sinyal > bottom+8)--> ASCENDING --(sinyal >= top)--> TOP  => rep dihitung
```

Rep hanya dihitung bila sinyal menyentuh `bottom` lalu kembali ke `top`. Apa pun yang mencegah
sinyal mencapai salah satu ambang membuat state machine diam di satu fase. Itulah "stuck".

## 3. Metode

Gerakan disimulasikan dengan geometri sendi nyata dalam ruang piksel 640x480, 30 fps, plus noise
4 px. Data itu dilewatkan ke `LandmarkSmoother` dan tracker yang sama dengan produksi. Yang
divariasikan: rentang sudut, tempo rep, parameter filter, dan arah kamera. Setiap bug dibuktikan
dulu dengan test yang gagal, baru diperbaiki.

---

## 4. Temuan bersama (semua gerakan)

### 4.1 Filter 1€ salah skala: puncak dan lembah gerakan terpotong (akar masalah utama)

**Lokasi:** `src/hooks/usePoseDetection.ts` memakai `new LandmarkSmoother(33, 1.0, 0.007)`.

`beta = 0.007` adalah contoh paper untuk koordinat **piksel**. Landmark MediaPipe ternormalisasi
0..1 dan hanya bergerak ~0,2–0,5 unit/detik. Suku adaptif filter jadi ~0, sehingga filter bekerja
sebagai low-pass tetap 1 Hz yang memotong dan menunda amplitudo.

| Push-up: sudut nyata | Tempo | Terbaca (beta 0.007) | Rep (lama) | Rep (beta 8) |
|---|---|---|---|---|
| 85–170° | 1,2 dtk | 95–160° | **0/10** | 10/10 |
| 90–165° | 1,2 dtk | 99–157° | **0/10** | 10/10 |
| 90–165° | 2,0 dtk | 94–162° | **1/10** | 10/10 |

Jitter saat diam praktis sama: SD 0,56° (lama) vs ~0,6° (baru).

**Perbaikan:** default `LandmarkSmoother` sekarang `minCutoff 1.0, beta 8`, dan hook memakai
default itu. Jumping jack cepat (0,9 dtk/rep) juga ikut tertolong: test 10/10.

### 4.2 Gestur hands-free terpicu palsu: sesi terjeda atau berakhir

**Lokasi:** `src/lib/gestures/detector.ts`.

Aturan gestur mengasumsikan orang berdiri:

- "Angkat tangan" berarti pergelangan di atas hidung. Ini terpenuhi saat push-up dari depan
  (kepala turun di bawah tangan), saat jumping jack fase terbuka, dan saat sit-up dengan tangan
  di belakang kepala.
- "Silang tangan" berarti pergelangan dekat bahu seberang. Ini terpenuhi saat push-up dari depan.

Bila tertahan 1,4 dtk, aksi `toggle_pause` menjeda loop inferensi dan hitungan membeku. Bila
tertahan 1,8 dtk, `cross_arms` mengakhiri sesi.

**Perbaikan, dua lapis:**

1. Detektor mengabaikan gestur kecuali torso tegak: pinggul terlihat, berada di bawah bahu, dan
   garis bahu-pinggul > 60° dari horizontal.
2. Hook hanya memproses gestur saat tracker di fase istirahat (`phase === 'top'`, atau tanpa fase
   untuk plank). Di tengah rep, detektor gestur di-reset.

### 4.3 Arsitektur render: 30 render ulang per detik

**Lokasi:** `src/hooks/usePoseDetection.ts`.

Sebelumnya tiap frame memanggil 3–4 `setState`, sehingga seluruh halaman workout (~600 baris)
dirender ulang 30×/dtk. `processFrame` juga dibuat ulang setiap `fps` atau `gestureResult`
berubah. Di HP, FPS turun di bawah 22 dan inferensi dilewati selang-seling. Frame yang dilewati
pun mengumpankan landmark lama dengan timestamp baru, sehingga sinyal bertangga dan dwell timer
menghitung data basi.

**Perbaikan:**
- Hasil per frame dipublish ke React seketika bila ada perubahan penting (rep, fase, label,
  feedback, fault, status lacak, gestur). Selain itu paling cepat tiap 100 ms.
- Tempo, simetri, dan overlay canvas tetap diproses tiap frame di luar React.
- Opsi dan tracker dibaca lewat ref, jadi loop stabil (tanpa deps `fps`/`gestureResult`).
- Frame yang dilewati karena FPS rendah kini tidak diproses sama sekali.
- `EnvironmentCheck` dulu menghitung "30 render = 1 detik", sekarang memakai timer 1 detik nyata.

**Tidak dilakukan:** memindah inferensi ke Web Worker. Worker hanya punya `OffscreenCanvas`, dan
perbaikan sebelumnya sengaja memakai canvas DOM karena sebagian browser memblokir WebGL di
`OffscreenCanvas`. Loop `requestAnimationFrame` dengan dedupe `video.currentTime` sudah memproses
tepat satu inferensi per frame kamera, setara `requestVideoFrameCallback`, tanpa risiko loop mati
saat elemen `<video>` di-remount antar fase.

### 4.4 Gestur memakai state basi

`drawGestureIndicator` dulu membaca `gestureResult` dari render sebelumnya. Sekarang memakai hasil
lokal frame yang sama.

### 4.5 Model pose

**Lokasi:** `src/lib/mediapipe/pose-detector.ts`. Sebelumnya selalu `pose_landmarker_lite`.

**Perbaikan:** model `pose_landmarker_full.task` dipakai otomatis bila file itu ada di
`public/models/` **dan** perangkat cukup kuat (≥ 6 core, RAM ≥ 4 GB). Selain itu, atau bila GPU
gagal, tetap lite.

**Catatan:** `public/models/pose_landmarker_full.task` (9,4 MB) diunduh dari bucket resmi
MediaPipe (`storage.googleapis.com/mediapipe-models/.../pose_landmarker_full/float16/latest`).
Di perangkat uji (16 core, 16 GB), browser memuat model full tanpa error.
Bila file ini dihapus, aplikasi otomatis kembali ke lite.

### 4.6 Kalibrasi personal tidak pernah berjalan

**Lokasi:** `src/trackers/calibration.ts`. `computeBottomThreshold` dan `saveBottomThreshold` tidak
pernah dipanggil, jadi ambang selalu default.

**Perbaikan, kalibrasi otomatis:**
- `RepAccumulator` mencatat puncak dan lembah sinyal tiap **rep penuh**.
- Saat sesi selesai (halaman tunggal) atau langkah sirkuit selesai, `persistCalibration` menyimpan
  ambang personal bila ada ≥ 2 rep penuh dengan ROM ≥ 40°.
- `bottom = top − 0,75·ROM`, di-clamp ke batas biomekanik.
- `top = top − 0,1·ROM`, hanya boleh **turun** dari default, tidak pernah naik.
- Rep parsial tidak dipakai, jadi standar kedalaman tidak bisa "dilatih" turun oleh half rep.
- Record lama yang hanya berisi `bottom` tetap terbaca.

Berlaku untuk push-up dan squat.

### 4.7 Rep dibatalkan diam-diam saat tubuh hilang sesaat

Sebelumnya tubuh yang tidak terlihat > 300 ms membatalkan rep yang berjalan tanpa pesan.

**Perbaikan:**
- Batas waktu bisa dikonfigurasi per tracker. Push-up memakai 600 ms karena siku sering tertutup
  badan di posisi bawah.
- Pembatalan memunculkan pesan selama 2 dtk, misalnya "Rep dibatalkan: lengan tidak terlihat
  kamera". Berlaku untuk push-up, squat, sit-up, dan jumping jack.

---

## 5. Temuan per gerakan

| Gerakan | Masalah | Bukti (sebelum) | Perbaikan |
|---|---|---|---|
| **Push-up** | Ambang atas 160° terlalu kaku. Banyak orang mengunci siku di 150–158°, jadi rep tidak kembali ke TOP. | Rentang 80–155°: **0/10** di semua tempo | `ANGLE_UP` 160 → 150 |
| **Push-up** | Kamera dari depan: sudut siku 2D terpendek, dan gating torso membatalkan rep (kasus screenshot laporan). | Tidak ada petunjuk ke pengguna | Deteksi tampak depan (lebar bahu / lengan atas > 0,8) dengan pesan "Letakkan kamera di SAMPING tubuh" |
| **Sit-up** | Rep selesai hanya bila torso ≤ 10°. Saat berbaring, bahu-pinggul terbaca 12–20° (tebal badan, matras, kamera di atas lantai). | Berbaring 15°: **0/8** (stuck "crunched") | `TORSO_LYING` 10 → 25 |
| **Jumping jack** | Pergelangan kaki wajib terlihat. Saat melompat, kaki keluar bawah frame dan rep dibatalkan. | Kaki di luar frame: **0/8** | Rep dihitung dari lengan. Kaki opsional, hanya untuk fault "kaki tidak dibuka". |
| **Jumping jack** | Tangan di atas kepala terbaca gestur "angkat tangan". | Lihat 4.2 | Gestur hanya di fase istirahat |
| **Plank** | Tanpa histeresis: pinggul yang bergetar di sekitar batas membuat status berkedip tiap frame. | 3 dtk di batas: **45 fault** tercatat; waktu tahan tersendat; voice coach berganti kalimat terus | Fault masuk di > 0,07, keluar di < 0,05 |
| **Squat** | Kamera dari depan: paha mengarah ke kamera, sudut lutut 2D hampir tidak berubah, rep stuck di atas. | Tidak ada petunjuk | Deteksi tampak depan (lebar bahu / torso > 0,5) dengan pesan |

## 6. Perubahan kode

| File | Perubahan |
|---|---|
| `src/trackers/base-tracker.ts` | Default `LandmarkSmoother` beta 0.007 → 8 |
| `src/trackers/rep-state-machine.ts` | `RepAccumulator`: opsi `lostResetMs`, `abortNotice()`, `romSamples()` |
| `src/trackers/calibration.ts` | Ambang atas personal, `loadCalibration`, `persistCalibration`, kompatibel record lama |
| `src/trackers/types.ts` | `ExerciseTracker.getRomSamples?()` |
| `src/trackers/index.ts` | Tracker push-up/squat memakai `loadCalibration` |
| `src/trackers/pushup-tracker.ts` | Top 150, deteksi tampak depan, lost 600 ms, pesan abort, kalibrasi top |
| `src/trackers/squat-tracker.ts` | Deteksi tampak depan, pesan abort, kalibrasi top, `getRomSamples` |
| `src/trackers/situp-tracker.ts` | `TORSO_LYING` 10 → 25, pesan abort |
| `src/trackers/jumping-jack-tracker.ts` | Pergelangan kaki opsional, pesan abort |
| `src/trackers/plank-tracker.ts` | Histeresis fault pinggul |
| `src/lib/gestures/detector.ts` | Gestur hanya saat torso tegak |
| `src/lib/mediapipe/pose-detector.ts` | Pemilihan model lite/full |
| `src/hooks/usePoseDetection.ts` | Publish ber-throttle, loop berbasis ref, skip frame bersih, gestur hanya di fase istirahat |
| `src/components/camera/EnvironmentCheck.tsx` | Lulus otomatis berbasis waktu, bukan jumlah render |
| `src/app/workout/[exercise]/page.tsx`, `src/app/workout/routine/[routineId]/page.tsx` | Panggil `persistCalibration` saat sesi/langkah selesai |
| `src/trackers/__tests__/*.test.ts`, `src/lib/gestures/__tests__/gestures.test.ts` | 22 test baru (regresi + kalibrasi + model) |

## 7. Verifikasi otomatis

- `npx vitest run`: **135/135 lulus**. Setiap test regresi gagal sebelum perbaikan dan lulus
  sesudahnya.
- `tsc --noEmit`: bersih.
- `eslint`: bersih pada semua file yang diubah.
- `/workout/pushup`, `/workout/jumping_jack`, `/workout/routine/full-body-burn` termuat tanpa
  dialog error.

## 8. Uji manual yang masih perlu

Siapkan kamera untuk push-up, squat, sit-up, dan plank di **samping** tubuh, jarak 1,5–2 m, seluruh
tubuh masuk frame. Untuk jumping jack, letakkan kamera di depan.

1. **Push-up:** 10 rep tempo normal (±1,5 dtk), 10 rep cepat (±1 dtk), 5 rep tanpa mengunci siku
   penuh. Tahan 2 dtk di bawah; sesi tidak boleh terjeda.
2. **Squat:** 10 rep. Lalu coba dari depan; harus muncul pesan pindahkan kamera.
3. **Sit-up:** 8 rep di atas matras. Rep harus terhitung saat punggung kembali rebah.
4. **Jumping jack:** 15 rep cepat, termasuk saat kaki sedikit keluar frame.
5. **Plank:** tahan 30 dtk. Feedback suara tidak boleh berganti-ganti terus.
6. Selesaikan sesi push-up dengan ≥ 2 rep, lalu mulai sesi baru. Ambang personal tersimpan di
   localStorage `smartfit_calibration`.
7. Bandingkan setiap hitungan aplikasi dengan hitungan manual.

## 9. Catatan

- Working tree juga berisi perubahan lain yang **bukan** bagian inspeksi ini (payment, premium,
  README, `pricing-data.ts`). Saat inspeksi, `pricing-data.ts` sempat menampilkan error
  `Export PLANS doesn't exist` dari perubahan tersebut.
- Model full sudah diunduh (bagian 4.5). FPS model full di HP belum diukur.
