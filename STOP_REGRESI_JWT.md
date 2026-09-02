# 🔴 HENTIKAN: commit 8656d2a membuka kembali lubang P0

Prioritas tertinggi. Jangan deploy production sebelum ini dibereskan.

---

## Apa yang terjadi

Commit `8656d2a "make validateEnv non-fatal with safe fallbacks to guarantee cloud run port 8080 binding"`
mengubah `server/config/env.ts` menjadi:

```ts
JWT_SECRET: process.env.JWT_SECRET || 'preplab-portal-secure-jwt-secret-key-2026-v2-production-fallback',
...
export function validateEnv() {
  if (!process.env.JWT_SECRET) console.warn("[Config Warning] JWT_SECRET is using default fallback.");
}
```

Ini **persis lubang yang kita tutup di ronde 3**, dikembalikan lagi — dan kali ini fallback-nya
berlaku di production (dulu hanya di dev).

## Kenapa ini berbahaya

Nilai `'preplab-portal-secure-jwt-secret-key-2026-v2-production-fallback'` tertulis di source code
dan sudah masuk histori git. Siapa pun yang bisa membaca repo dapat menandatangani token sendiri:

```json
{ "nik": "02D25000055", "isAdmin": true, "isDeveloper": true }
```

Token itu akan lolos `requireAuth` dan `requireRole(['admin','developer'])` — **akses admin penuh
tanpa perlu password**. Guard terpusat, perbaikan `/setup`, penghapusan superadmin DEMO: semuanya
bisa dilewati lewat jalur ini. Dan karena `validateEnv()` sekarang hanya `console.warn`, server
akan berjalan normal tanpa tanda apa pun bahwa ia memakai secret publik.

Empat ronde perbaikan security efektif dibatalkan oleh satu baris ini.

## Dan perubahan ini tidak menyelesaikan masalahnya

Screenshot Cloud Run menunjukkan `us-central1` **"Last deployed 3 hours ago"** — revisi gagal itu
berasal dari sebelum semua perbaikan hari ini. Production belum pernah di-deploy ulang. Sementara
`asia-southeast2` (staging) deploy 4 menit lalu dan **hijau**.

Artinya: staging sudah jalan dengan konfigurasi yang benar, dan error di production yang Anda lihat
adalah sisa dari percobaan lama. Fallback JWT tidak membuktikan apa pun — ia hanya menukar celah
keamanan dengan sesuatu yang belum tentu jadi penyebab.

---

## ✅ PENYEBAB SUDAH DIPASTIKAN DARI LOG (bukan tebakan lagi)

Cloud Logging revisi `preplab-portal-00186-zl7`, 2026-09-02 10:40–10:42 JST:

```
Error: MISSING OR INVALID REQUIRED ENVIRONMENT VARIABLES:
       JWT_SECRET (must be >= 32 characters in production)
    at validateEnv (/app/dist/server.cjs:936:11)

Default STARTUP TCP probe failed 1 time consecutively for container
"preplab-portal-1" on port 8080. The instance was not started.
```

Urutannya jelas: `validateEnv()` melempar error → proses mati → tidak pernah listen di 8080 →
Cloud Run melapor "failed to start and listen on port". Pesan port itu hanya **akibat**, bukan sebab.

**Artinya: `JWT_SECRET` memang belum menempel di service production.** Kode-nya sudah benar sejak awal —
ia justru bekerja persis sebagaimana mestinya: menolak berjalan tanpa secret.

Dua kemungkinan lain sudah tersingkir dengan sendirinya:
- **Bukan masalah izin service account** — kalau Default Compute SA tidak boleh baca secret, lognya
  akan berbunyi `PERMISSION_DENIED`, bukan "MISSING OR INVALID". Jadi langkah IAM di bawah tidak perlu.
- **Bukan masalah port atau timeout** — aplikasi tidak pernah sampai ke tahap listen.

### Konsekuensinya untuk commit 8656d2a

Fallback JWT itu memang akan "menghijaukan" deploy — dengan cara membuat server berjalan memakai
secret yang tertulis di source code. Itu bukan perbaikan; itu mematikan alarm kebakaran supaya
suaranya berhenti.

Perbaikannya satu perintah:

```bash
gcloud run services update preplab-portal --region us-central1 \
  --update-secrets JWT_SECRET=JWT_SECRET:latest
```

(Pastikan dulu secret-nya ada: `gcloud secrets versions access latest --secret=JWT_SECRET | wc -c` → harus ≥ 32.)

Kembalikan `env.ts` seperti Perbaikan 1 di atas, jalankan perintah itu, lalu `npm run deploy:main`.
Log berikutnya harus bersih tanpa baris `MISSING OR INVALID`.


---

## Perbaikan 1 — kembalikan `server/config/env.ts` (WAJIB)

```ts
import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

export const env = {
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || (isProduction ? '' : 'dev-only-secret-not-for-production-use'),
  ENABLE_DEMO_USER: process.env.ENABLE_DEMO_USER === 'true'
};

export function validateEnv() {
  // Warning saja — tidak fatal
  if (!env.VAPID_PUBLIC_KEY) console.warn("[Config] VAPID_PUBLIC_KEY belum diset.");
  if (!env.VAPID_PRIVATE_KEY) console.warn("[Config] VAPID_PRIVATE_KEY belum diset.");
  if (!process.env.SQL_HOST && !env.DATABASE_URL) console.warn("[Config] SQL_HOST / DATABASE_URL belum diset.");

  // JWT_SECRET tetap fatal di production — tidak boleh ada fallback
  if (isProduction && (!env.JWT_SECRET || env.JWT_SECRET.length < 32)) {
    throw new Error(
      "JWT_SECRET tidak diset atau kurang dari 32 karakter. " +
      "Server tidak boleh berjalan tanpa ini — token bisa dipalsukan. " +
      "Pasang dengan: gcloud run services update <service> --region <region> " +
      "--update-secrets JWT_SECRET=JWT_SECRET:latest"
    );
  }
}
```

Yang berubah dari versi 8656d2a: warning untuk konfigurasi yang bisa ditoleransi tetap warning,
tapi **`JWT_SECRET` kembali fatal di production, tanpa fallback**. Server yang mati lebih baik
daripada server yang berjalan dengan secret yang diketahui publik.

Blok `try/catch` di `server.ts:11` sudah benar — biarkan apa adanya, ia akan mencetak pesan di atas
ke Cloud Logging.

## Perbaikan 2 — rotasi secret

Nilai fallback itu sudah ada di histori git, jadi harus dianggap bocor:

```bash
openssl rand -base64 48 | gcloud secrets versions add JWT_SECRET --data-file=-
```

Semua user akan perlu login ulang setelah ini — itu memang yang diinginkan.

---

## Cara menemukan penyebab sebenarnya (jangan menebak lagi)

Setelah Perbaikan 1, deploy ulang production lalu **baca log revisinya**, jangan menebak dari pesan
"failed to listen on port" — pesan itu selalu sama apa pun penyebabnya:

```bash
npm run deploy:main

gcloud run services logs read preplab-portal --region us-central1 --limit 100
```

Cocokkan dengan tabel ini:

| Yang muncul di log | Penyebab | Perbaikan |
|---|---|---|
| `JWT_SECRET tidak diset...` | Secret belum menempel di service | `gcloud run services update ... --update-secrets JWT_SECRET=JWT_SECRET:latest` |
| `Permission denied on secret` / `PERMISSION_DENIED` | Service account tidak boleh baca secret | Beri `roles/secretmanager.secretAccessor` ke Default Compute SA (lihat di bawah) |
| `Cannot find module` | Bundle build tidak lengkap | Periksa langkah `npm run build` |
| Tidak ada log sama sekali | Container mati sebelum sempat log | Cek `Revisions` → tab `Logs` pada revisi yang gagal |

Kandidat yang belum diperiksa: service ini berjalan sebagai **Default Compute SA** (terlihat di
kolom "Deployed by"). Kalau SA itu tidak punya izin baca secret `JWT_SECRET`, container gagal start.
Periksa dan beri izin:

```bash
PROJECT_NUMBER=$(gcloud projects describe project-1bcc4549-c8d6-4962-958 --format='value(projectNumber)')

gcloud secrets add-iam-policy-binding JWT_SECRET \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Catatan: staging (asia-southeast2) sudah hijau dengan SA yang sama, jadi kemungkinan izinnya sudah
ada. Tapi izin bisa diberikan per-secret, jadi tetap layak dicek.

---

## Urutan yang benar

1. Kembalikan `env.ts` seperti Perbaikan 1 — **sebelum deploy apa pun**.
2. Rotasi `JWT_SECRET` (Perbaikan 2).
3. Deploy staging dulu, pastikan tetap hijau.
4. Deploy production, lalu **baca log** dan cocokkan dengan tabel di atas.
5. Perbaiki sesuai penyebab yang terbaca — jangan menambah fallback baru.

## Prinsip untuk perbaikan berikutnya

Kalau server gagal start karena konfigurasi keamanan hilang, jawabannya adalah **melengkapi
konfigurasinya**, bukan melemahkan pemeriksaannya. Fallback membuat deploy hijau sambil
menyembunyikan bahwa aplikasi berjalan tanpa pengamanan — kegagalan yang keras dan berisik jauh
lebih baik daripada keberhasilan yang diam-diam tidak aman.
