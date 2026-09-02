# Audit Ronde 9 — PrepLab-Portal
Tanggal: 2026-09-02 · Scope: verifikasi tes CI + kesiapan deploy

---

## ✅ Tes guard sudah dibuat

```
6b045ae test(security): add automated CI test suite for centralized auth guard
```

`test/auth-guard.test.ts` menguji 9 endpoint terproteksi (harus 401) dan 2 endpoint allowlist
(harus bukan 401), lalu `process.exit(1)` kalau ada yang gagal — jadi bisa memutus pipeline.
Terhubung ke `npm test` → `npm run test:auth`. `/api/health` yang diuji memang ada
(`misc.ts:803`). Isinya sudah benar.

---

# 🔴 DEPLOY AKAN GAGAL: `JWT_SECRET` tidak ada di konfigurasi deploy

Ini harus dibereskan sebelum deploy berikutnya, kalau tidak service-nya mati.

**Bukti:**

`server/config/env.ts` sekarang mewajibkan `JWT_SECRET` dan melempar error kalau tidak ada:
```ts
JWT_SECRET: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : '...dev'),
...
if (!env.JWT_SECRET || (NODE_ENV === 'production' && env.JWT_SECRET.length < 32)) {
  missing.push("JWT_SECRET ...");
}
throw new Error(...)   // ← server berhenti di sini
```

`Dockerfile:35` menetapkan `ENV NODE_ENV=production`, jadi cabang production yang berlaku —
fallback dev tidak dipakai (ini benar dan memang yang kita inginkan).

Tapi `JWT_SECRET` tidak ada di konfigurasi deploy mana pun:
```yaml
# cloudbuild-staging.yaml:28
--set-secrets  SQL_PASSWORD=... , DATABASE_URL=... , GEMINI_API_KEY=... ,
               SMTP_PASS=... , VAPID_PRIVATE_KEY=...
               ← tidak ada JWT_SECRET
```
```yaml
# cloudbuild.yaml (production)
   ← tidak ada --set-env-vars maupun --set-secrets sama sekali
```

**Akibatnya:** `validateEnv()` melempar error saat startup → container gagal boot → Cloud Run
menolak revisi baru dan tetap menjalankan revisi lama. Aplikasi tidak rusak, tapi **seluruh
perbaikan security tidak akan pernah aktif**, dan bisa terlihat seperti "deploy sukses tapi kok
tidak berubah".

**Perbaikan — tiga langkah:**

1. Buat secret-nya:
```bash
openssl rand -base64 48 | gcloud secrets create JWT_SECRET --data-file=-
```

2. Tambahkan ke `cloudbuild-staging.yaml` baris 28 (sambung dengan koma):
```
,JWT_SECRET=JWT_SECRET:latest
```

3. Untuk production, `cloudbuild.yaml` tidak menyetel env sama sekali — ia mengandalkan konfigurasi
   yang sudah tersimpan di service Cloud Run. Karena `JWT_SECRET` variabel baru, ia belum ada di sana.
   Set sekali secara manual:
```bash
gcloud run services update preplab-portal --region us-central1 \
  --update-secrets JWT_SECRET=JWT_SECRET:latest
```
   Lebih baik lagi: samakan pola `cloudbuild.yaml` dengan staging (eksplisit `--set-secrets`), supaya
   konfigurasi terbaca dari repo, bukan tersembunyi di state service.

**Cara memastikan sebelum deploy production:** deploy ke staging dulu, lalu cek log startup. Kalau
muncul `MISSING OR INVALID REQUIRED ENVIRONMENT VARIABLES: JWT_SECRET`, berarti secret-nya belum masuk.

---

## 🟡 Tes belum terpasang di pipeline

`cloudbuild.yaml` dan `cloudbuild-staging.yaml` hanya punya tiga langkah: build → push → deploy.
Tidak ada langkah `npm test`.

Jadi tesnya ada, tapi tidak ada yang menjalankannya otomatis — regresi seperti kemarin masih bisa
lolos ke production.

Catatan teknis: tes ini menembak server lewat HTTP (`fetch` ke `TEST_BASE_URL`), jadi bukan unit test —
ia butuh server yang sudah berjalan. Dua cara memasangnya:

**Cara paling sederhana — jalankan setelah deploy staging:**
```yaml
  - name: 'node:20-slim'
    entrypoint: bash
    args:
      - '-c'
      - |
        npm install --legacy-peer-deps
        TEST_BASE_URL=https://<url-staging> npm test
```
Taruh sebagai langkah terakhir. Kalau guard hilang, build merah dan Anda tahu sebelum promote ke production.

**Cara yang lebih ketat** (memblokir sebelum deploy) perlu menjalankan server + DB di dalam build —
lebih rumit, dan untuk kebutuhan saat ini belum sepadan.

---

## 🟠 Histori git — belum berubah

```
f01b2d7  ← masih memuat 283 hash password + PII karyawan
```
Masih satu-satunya kebocoran yang terbuka. `git filter-repo ... --invert-paths`, force-push,
semua kolaborator re-clone, lalu paksa reset password seluruh user.

---

## Tahap 3 — belum dikerjakan

Indeks DB masih 4 (`employees.nik` belum terindeks) · Socket.IO `origin: "*"` tanpa `io.use()` ·
token 7 hari tanpa `tokenVersion` · peran dari teks bebas `jabatan` · Drive `type: 'anyone'` di
8 tempat · polling 10/30 detik tanpa `visibilitychange` · admin 5.000 baris tanpa pagination ·
`recharts` + `chart.js` berdampingan.

---

## Urutan berikutnya

1. **Pasang `JWT_SECRET` di Secret Manager + kedua cloudbuild** — tanpa ini deploy gagal.
2. Deploy staging, cek log startup, jalankan `TEST_BASE_URL=... npm test` secara manual sekali.
3. Tambahkan langkah tes ke `cloudbuild-staging.yaml`.
4. Purge histori git + paksa reset password.
5. Indeks `employees.nik`, lalu sisa Tahap 3.
