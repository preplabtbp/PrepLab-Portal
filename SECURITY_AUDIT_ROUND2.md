# Audit Ronde 2 — PrepLab-Portal
Tanggal: 2026-09-01 · Scope: verifikasi perbaikan ronde 1 + review performa/optimasi
Metode: review kode statis. Belum diverifikasi terhadap instance production yang berjalan.

---

## BAGIAN A — Verifikasi perbaikan security

### Sudah benar-benar diperbaiki

| # | Temuan ronde 1 | Bukti |
|---|---|---|
| 3 | `adminReset` bisa dipakai anonim | `auth.ts` kini verifikasi JWT + `checkIsAdminOrDeveloper` sebelum reset |
| 4 | `check-nik` bocorkan record utuh + hash | Kini hanya balikan `{found, firstLoginComplete, name, avatar, username}` |
| 7b | Fallback demo di blok `catch` | Sudah hilang dari `/check-nik` dan `/login` |
| 10 | Tidak ada hardening | `helmet()`, `express-rate-limit` (auth 50/15mnt, API 800/mnt) terpasang di `server.ts:301–328` |
| 13 | `passwordHash` dikirim ke klien | Helper `toPublicEmployee()` dipakai konsisten di `auth.ts` |
| 15 | Query "ambil semua lalu filter di memori" | `auth.ts` kini pakai `WHERE ... LIMIT 1` |
| — | Session management | JWT + cookie `httpOnly`/`secure`/`sameSite=lax` + `/api/auth/me` + `/logout` — arsitekturnya sudah benar |

Fondasinya sudah bagus. Tapi penerapannya belum menyeluruh, dan ada dua regresi baru.

---

### 🔴 P0 — Regresi baru: akun DEMO sekarang punya hak superadmin

**Bukti:** `server/middleware/auth.ts:56`
```ts
if (cleanNik === '02D25000055' || cleanNik === '02D24000043'
    || cleanNik === 'PREPLABADMIN' || cleanNik === 'DEMO123') {
  return { isAdmin: true, isDeveloper: true };
}
```
dan `server/routes/auth.ts:17–30` — `DEMO_USER` kini membawa `isAdmin: true, isDeveloper: true`,
dengan password `112233` yang masih hardcoded di `/login`.

**Dampak:** siapa pun yang tahu `DEMO123` / `112233` — dan kredensial itu ada di source code —
login sebagai **admin + developer penuh**, lolos `requireRole(['admin','developer'])`, dan mendapat
akses penuh ke seluruh CRUD `/api/admin/tables/*` termasuk truncate tabel. Di ronde 1 akun demo
hanya user biasa; sekarang justru jadi pintu masuk admin. **Ini lebih berbahaya daripada sebelum diperbaiki.**

**Perbaikan:** hapus `'DEMO123'` dari daftar superadmin, set `isAdmin/isDeveloper: false` pada
`DEMO_USER`, dan bungkus seluruh jalur demo dengan `if (process.env.ENABLE_DEMO_USER === 'true')`
yang tidak pernah aktif di production.

---

### 🔴 P0 — JWT_SECRET punya fallback hardcoded di repo

**Bukti:** `server/middleware/auth.ts:7` dan diulang di `server/routes/auth.ts:320`
```ts
const JWT_SECRET = process.env.JWT_SECRET || 'preplab-portal-secure-jwt-secret-key-2026-v2';
```

**Dampak:** jika `JWT_SECRET` tidak terpasang di environment Cloud Run, server **diam-diam** memakai
secret yang tertulis di source code. Siapa pun yang punya akses repo bisa menandatangani token
`{nik:"...", isAdmin:true, isDeveloper:true}` sendiri dan menjadi admin — tanpa perlu password sama sekali.
Tidak ada log, tidak ada error, aplikasi tampak normal.

**Perbaikan:**
- Hapus fallback. Tambahkan `JWT_SECRET` ke `validateEnv()` di `server/config/env.ts` sehingga server
  **menolak start** kalau secret tidak ada.
- Jadikan satu sumber (`export const JWT_SECRET` dari middleware), jangan didefinisikan ulang di `auth.ts:320`.
- Generate secret acak ≥32 byte, simpan di Secret Manager, dan rotasi (semua user login ulang).

---

### 🔴 P0 — 16 dari 18 router masih tanpa otentikasi

**Bukti:** hanya `admin.ts` dan `auth.ts` yang mengimpor `requireAuth`.

```
admin.ts: 2      agenda.ts: 0     apd.ts: 0        bulletin.ts: 0
auth.ts: 2       cloud.ts: 0      employees.ts: 0  feedback.ts: 0
                 inspections.ts:0 misc.ts: 0       notifications.ts:0
                 p5m.ts: 0        quiz.ts: 0       roster.ts: 0
                 tickets.ts: 0    workOrders.ts: 0
```

**Dampak:** `/api/employees`, `/api/tickets`, `/api/roster`, `/api/inspections`, `/api/bulletin`,
`/api/notifications`, `/api/quiz`, dan seluruh `misc.ts` masih bisa dibaca **dan ditulis** oleh anonim.
Termasuk 12 endpoint `DELETE` yang saya catat di ronde 1 (`/api/agenda/:id`, `/api/bulletin/:id`,
`/api/notes/:id`, `/api/quiz-questions/:id`, dst). Data karyawan lengkap masih bisa di-dump tanpa login
lewat `/api/employees`.

**Perbaikan:** jangan pasang satu per satu di tiap file — pasang terpusat di `server.ts`, sebelum mounting:
```ts
const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/check-nik',
                      '/api/auth/setup', '/api/auth/reset-password', '/api/health'];
app.use('/api', (req, res, next) =>
  PUBLIC_PATHS.includes(req.path) ? next() : requireAuth(req, res, next));
```
Lalu tambahkan `requireRole` per endpoint yang memang khusus admin.

---

### 🟠 P1 — Blok mounting router kedua membatalkan proteksi `NODE_ENV`

**Bukti:** `server.ts:337–357` memasang router dengan benar, termasuk:
```ts
if (process.env.NODE_ENV !== 'production') {
  app.use("/api/debug", debugRouter);
}
```
Tapi di `server.ts:507–529` — masih di dalam `startServer()`, di antara blok komentar kosong sisa
refactor — **seluruh router dipasang ulang**, dan di baris 520:
```ts
app.use("/api/debug", debugRouter);   // tanpa guard NODE_ENV
```

**Dampak:** `GET /api/debug/db-info` tetap hidup di production dan membocorkan `SQL_HOST`,
`SQL_DB_NAME`, `SQL_USER`, `current_database()`, `current_user`. Perbaikan #8 ronde 1 efektif dibatalkan.
Bonus: setiap router terdaftar dua kali, jadi setiap request menelusuri rantai handler ganda.

**Perbaikan:** hapus seluruh blok baris 484–530 (itu residu refactor — perhatikan blok komentar
kosong di sekitarnya). Verifikasi dengan `curl /api/debug/db-info` di staging → harus 404.

---

### 🟠 P1 — Data + hash password masih ada di histori git

**Bukti:** file sudah di-untrack dari HEAD (`git ls-files` bersih ✓), **tapi masih ada di histori**:
```
$ git log --oneline --all -- database_backup.json db_backups cookies.txt
f01b2d7 Initial commit for CI/CD pipeline setup
```
`git checkout f01b2d7 -- database_backup.json` mengembalikan 283 hash password + PII karyawan.

**Perbaikan:** purge dengan `git filter-repo --path database_backup.json --path db_backups --path cookies.txt --invert-paths`,
force-push, minta semua kolaborator re-clone. Anggap seluruh hash bocor → paksa reset password
setelah P0 selesai.

---

### 🟠 P1 — Dump database 2 MB tersaji publik di `/public`

**Bukti:** `public/database_backup.json` (1.999.780 byte) — `app.use(express.static('public'))`
menyajikannya di `https://<domain>/database_backup.json` tanpa otentikasi. Tidak direferensikan
kode mana pun (`grep` di `src/`, `index.html`, `sw.js` → nihil), jadi ini file nyasar.
Isinya agenda, nama personil, PIC, deskripsi kegiatan. Tidak memuat `passwordHash` (sudah dicek).

**Perbaikan:** hapus file. Tambahkan aturan CI yang menolak file `.json` > 1 MB di `public/`.

---

### 🟡 P2 — Peran admin ditentukan dari teks bebas yang bisa diedit lewat API

**Bukti:** `middleware/auth.ts:66–75` — siapa pun otomatis jadi admin kalau `section` atau `jabatan`
mengandung `admin`, `administrasi`, `superintendent`, atau `manager`.

Masalahnya berantai: kolom `jabatan` bisa diubah lewat `POST /api/admin/tables/employees`. Seorang
admin (atau siapa pun via akun DEMO di atas) bisa mengubah `jabatan` seseorang jadi "Asisten Manager"
dan orang itu naik jadi admin pada login berikutnya. Tidak ada tabel peran eksplisit.

**Perbaikan:** tambahkan kolom `role` enum (`user|admin|developer`) di tabel `employees` sebagai satu-satunya
sumber kebenaran. Jadikan kolom itu tidak bisa diubah lewat generic CRUD.

### 🟡 P2 — Peran dibekukan di token selama 7 hari, tanpa pencabutan

**Bukti:** `generateAuthToken` menanam `isAdmin`/`isDeveloper` di payload; `requireRole` membacanya
dari token tanpa cek ulang ke DB; `TOKEN_EXPIRY = '7d'`; `/logout` hanya `clearCookie` (token tetap sah).

**Dampak:** mencabut hak admin seseorang baru berlaku 7 hari kemudian. Token yang dicuri tetap
berlaku 7 hari meski user sudah logout atau password sudah direset.

**Perbaikan:** access token pendek (15–60 menit) + refresh token; atau `requireRole` cek ulang peran
ke DB (murah, sudah ada query); tambahkan kolom `tokenVersion` di `employees` yang di-increment saat
logout/reset password, dan cocokkan di `requireAuth`.

### 🟡 P2 — `/setup` dan `/update-username` masih tanpa verifikasi

**Bukti:** `auth.ts` — `POST /setup` hanya butuh `{nik, password}`; tidak ada kode aktivasi, tidak ada
pencocokan `tanggalLahir`. `POST /update-username` (komentarnya menulis "Require Auth" tapi tidak ada
`requireAuth`) — siapa pun bisa mengganti username orang lain hanya dengan tahu NIK-nya.

**Perbaikan:** `/setup` wajib faktor verifikasi (cocokkan `tanggalLahir` + NIK minimal, idealnya kode
sekali pakai ke email HR). `/update-username` pasang `requireAuth` dan pastikan `req.user.nik === nik`.

### 🟡 P2 — Sisa temuan ronde 1 yang belum tersentuh

- **Socket.IO CORS `origin: "*"`** (`server.ts:189`) — masih terbuka, dan handshake-nya tanpa auth. Chat bisa dibaca/ditulis dari origin mana pun. Tambahkan `io.use()` yang memverifikasi JWT dari cookie.
- **File Drive dibuat publik permanen** — `{role:'reader', type:'anyone'}` masih ada di 8 tempat (`cloud.ts` ×3, `p5m.ts` ×2, `misc.ts`, `utils.ts`, `google-services.ts`).
- **Proxy Drive terbuka** — `GET /api/drive/view/:fileId` masih menerima fileId apa pun tanpa auth.
- **Password minimal 4 karakter** pada `adminReset` — terlalu lemah, naikkan ke 8+.
- **`e.message` mentah** masih dikirim ke klien di `cloud.ts` (7×), `auth.ts` (3×), `admin.ts`, `misc.ts`, `debug.ts`.

---

## BAGIAN B — Performa & optimasi (PC + HP)

Beberapa hal sudah bagus: lazy loading rute (`lazyWithRetry` di `App.tsx`), `manualChunks` di Vite,
React Query dengan `staleTime` 5 menit dan `refetchOnWindowFocus: false`, PWA + service worker.
Di bawah ini yang masih menahan performa.

### 🔴 B1 — Tidak ada kompresi HTTP (dampak terbesar untuk HP)

**Bukti:** tidak ada `compression` di `package.json` maupun `server.ts`.

Aset yang dikirim mentah setiap kali:

| Chunk | Ukuran |
|---|---|
| `index-*.js` | 619 KB |
| `charts-*.js` | 566 KB |
| `utils-*.js` | 517 KB |
| `bulletin-board-*.js` | 293 KB |
| `calendar-*.js` | 274 KB |
| `index-*.css` | 264 KB |
| `vendor-*.js` | 211 KB |

**≈ 2,7 MB tanpa kompresi.** Di jaringan site yang lambat, ini beda antara 3 detik dan 25 detik.
Gzip biasanya memangkas JS/CSS ~70%.

**Perbaikan:**
```ts
import compression from 'compression';
app.use(compression());
```
Lebih baik lagi: pre-compress saat build (`vite-plugin-compression` → `.br` + `.gz`) dan sajikan
statis, supaya CPU Cloud Run tidak dipakai kompresi tiap request.

### 🔴 B2 — Aset statis tanpa cache header

**Bukti:** `app.use(express.static(...))` tanpa opsi `maxAge`.

Nama file sudah punya hash konten (`index-SyXwDCKL.js`), jadi aman di-cache selamanya — tapi sekarang
browser memvalidasi ulang tiap kunjungan. Di HP dengan koneksi buruk, ini menambah round-trip di
jalur kritis setiap kali app dibuka.

**Perbaikan:**
```ts
app.use(express.static(distPath, {
  maxAge: '1y', immutable: true,
  setHeaders: (res, p) => { if (p.endsWith('index.html')) res.setHeader('Cache-Control','no-cache'); }
}));
```

### 🟠 B3 — Indeks database nyaris tidak ada

**Bukti:** hanya 4 `index()`/`uniqueIndex()` di `src/db/schema.ts` (556 baris, 33 tabel).
Tidak ada indeks pada `employees.nik` — padahal itu kunci lookup login dan dipakai di seluruh kode.

**Dampak:** setiap login melakukan sequential scan. Tabel `roster` dan `notifications` yang tumbuh
cepat akan makin lambat seiring waktu, terasa sebagai "aplikasi makin berat" tanpa sebab jelas.

**Perbaikan:** tambahkan lewat migrasi Drizzle:
`employees(nik)` unik, `employees(username)`, `roster(nik, tanggal)`, `notifications(user_id, created_at)`,
`inspections(created_at)`, `tickets(status, created_at)`, `chat_messages(created_at)`.
Ukur dulu dengan `EXPLAIN ANALYZE` pada query terlambat.

### 🟠 B4 — Pool koneksi terlalu kecil dan terlalu cepat menutup

**Bukti:** `src/db/index.ts` — `max: 5`, `idleTimeoutMillis: 5000`.

`max: 5` untuk Cloud Run dengan concurrency default 80 berarti request antre di pool saat ramai
(pagi hari saat semua crew login bersamaan). `idleTimeoutMillis: 5000` menutup koneksi tiap 5 detik
idle, jadi request berikutnya bayar ongkos handshake TCP+TLS ke Cloud SQL lagi.

**Perbaikan:** `max: 20` (sesuaikan dengan limit koneksi instance Cloud SQL ÷ jumlah maksimum instance
Cloud Run), `idleTimeoutMillis: 30000`. Kalau memakai Cloud SQL Connector, pakai unix socket agar
tidak ada overhead TLS per koneksi.

### 🟠 B5 — Pola "ambil seluruh tabel" masih ada di 27 tempat

**Bukti:** `db.select().from(employees)` tanpa `WHERE` muncul 27 kali di `server/routes/*.ts`.
`auth.ts` sudah diperbaiki, sisanya belum. `getNotificationTargets()` di `utils.ts` menarik seluruh
tabel karyawan lalu memfilter di JavaScript — dan itu dipanggil setiap kali ada notifikasi.

**Perbaikan:** pindahkan filter ke `WHERE` di database. Untuk daftar, tambahkan pagination
(`limit`/`offset`) dan `select({...})` kolom yang dipakai saja — bukan `select()` semua kolom.

### 🟠 B6 — Endpoint admin mengirim sampai 5.000 baris sekaligus

**Bukti:** `admin.ts:49` — `const limit = tableName === 'roster' ? 1000 : 5000;` lalu seluruh hasil
dikirim sebagai satu JSON, dan di-cache di memori proses (`tableCache`).

**Dampak:** payload puluhan MB. Di HP, ini bisa membuat tab crash saat parsing JSON. Cache di memori
juga tidak aman untuk multi-instance Cloud Run — tiap instance punya cache sendiri, jadi user melihat
data yang tidak konsisten setelah edit.

**Perbaikan:** pagination server-side (`?page=&pageSize=50`) + virtualisasi tabel di frontend
(`@tanstack/react-virtual`). Ganti cache memori dengan cache ber-TTL yang dibagi (atau hapus saja
dan andalkan React Query di klien).

### 🟡 B7 — Polling agresif menguras baterai HP

**Bukti:**
- `ReminderNotificationModal.tsx:39` — `setInterval(checkReminders, 10000)` → **setiap 10 detik**
- `notification-bell.tsx:75` — `setInterval(fetchNotifications, 30000)` → setiap 30 detik
- `TbpDashboard.tsx:158` — `setInterval(..., 1000)` → re-render tiap detik

Polling terus berjalan meski tab di background. 10 detik × 8 jam = 2.880 request per user per hari,
hanya untuk pengingat. Di HP itu berarti radio seluler tidak pernah tidur.

**Perbaikan:**
- Socket.IO sudah terpasang — kirim notifikasi lewat push event, bukan polling.
- Kalau polling tetap perlu: naikkan ke 60 detik, dan hentikan saat `document.hidden`
  (`visibilitychange` listener).
- Untuk jam di `TbpDashboard`, `setInterval` 1 detik hanya boleh hidup saat komponen terlihat.

### 🟡 B8 — Avatar disimpan sebagai base64 di database

**Bukti:** `schema.ts:51` — `avatar: text('avatar')`. Di data yang ada, 1 dari 283 karyawan sudah
punya avatar berukuran **17 KB base64** di dalam kolom.

**Dampak:** ini akan meledak. Kalau 283 karyawan mengunggah foto, setiap `SELECT * FROM employees`
(yang terjadi di 27 tempat) menarik ~5 MB. Base64 juga 33% lebih besar daripada biner aslinya, dan
tidak bisa di-cache browser secara terpisah.

**Perbaikan:** simpan foto di Cloud Storage / Drive, simpan URL-nya saja di DB. Resize ke ~256px
saat upload. Sajikan lewat CDN dengan cache header panjang.

### 🟡 B9 — Batas body 50 MB membuka pintu DoS

**Bukti:** `server.ts:307` — `express.json({ limit: '50mb' })`.

Beberapa request 50 MB bersamaan bisa menghabiskan memori instance Cloud Run. Ini konsekuensi dari
upload base64 (B8).

**Perbaikan:** turunkan ke `2mb` untuk `/api` umum; untuk endpoint upload, pakai signed URL langsung
ke Cloud Storage sehingga file tidak melewati server sama sekali.

### 🟡 B10 — Chunk `charts` dan `utils` terlalu besar

**Bukti:** `vite.config.ts` menggabungkan `chart.js` + `react-chartjs-2` + `recharts` (566 KB) —
**dua library charting sekaligus**. `utils` (517 KB) berisi `xlsx` + `papaparse`, yang hanya dipakai
di fitur ekspor.

**Perbaikan:** pilih satu library chart saja (kemungkinan besar `recharts` bisa dihapus — cek
pemakaiannya). Impor `xlsx` secara dinamis (`await import('xlsx')`) tepat saat tombol ekspor ditekan.
Perkiraan hemat: 300–600 KB dari jalur muat awal.

### 🟡 B11 — `user-scalable=no` menghalangi aksesibilitas

**Bukti:** `index.html` — `<meta name="viewport" content="... maximum-scale=1.0, user-scalable=no" />`

Ini memblokir pinch-zoom. Untuk aplikasi lapangan yang dipakai di HP — sering dengan sarung tangan,
di bawah sinar matahari, oleh pengguna yang butuh memperbesar teks — ini masalah nyata, dan melanggar
WCAG 1.4.4.

**Perbaikan:** `content="width=device-width, initial-scale=1.0, viewport-fit=cover"`. Kalau kekhawatirannya
adalah zoom tak sengaja saat input, perbaiki dengan `font-size: 16px` pada input (iOS auto-zoom kalau < 16px),
bukan dengan mematikan zoom.

### 🟡 B12 — Sampah repo memperlambat build & deploy

**Bukti:** root direktori berisi ~200 skrip sekali pakai (`fix-*.cjs`, `patch_*.cjs`, `test-*.ts`,
`debug-*.ts`), plus `db.xlsx` (3,6 MB), `temp.xlsx` (997 KB), `sheet.html` (1,2 MB),
`scratch_prompt.txt` (192 KB), `server_recovered.ts` (86 KB), `apps_script_updated.js` (59 KB).

**Dampak:** semuanya ikut terkirim ke Cloud Build sebagai build context tiap deploy → build lambat,
image besar. Juga membuat navigasi kode jadi sulit.

**Perbaikan:** pindahkan ke `scripts/archive/` atau hapus (semuanya ada di histori git). Rapikan
`.gcloudignore` dan `.dockerignore` agar mengecualikan file-file itu. Hapus juga
`inspections.backup.ts` dan `server_recovered.ts` dari `server/`.

---

## Urutan pengerjaan yang disarankan

**Tahap 1 — sebelum apa pun (P0):**
1. Cabut hak admin dari akun DEMO, matikan jalur demo di production.
2. Hapus fallback `JWT_SECRET`, tambahkan ke `validateEnv()`, pasang secret acak di Secret Manager.
3. Pasang `requireAuth` terpusat di `app.use('/api', ...)` dengan allowlist.
4. Hapus blok mounting router duplikat (`server.ts:484–530`).

**Tahap 2 — P1:**
5. Purge histori git, hapus `public/database_backup.json`, rotasi kredensial, paksa reset password semua user.
6. `compression()` + cache header aset statis. *(Dua baris kode, dampaknya paling terasa di HP.)*

**Tahap 3 — P2 & performa:**
7. Kolom `role` eksplisit; token pendek + `tokenVersion`.
8. Amankan `/setup`, `/update-username`, Socket.IO, proxy Drive.
9. Indeks DB, pool `max: 20`, hilangkan pola select-all.
10. Pagination admin, kurangi polling, pindahkan avatar ke storage, pecah chunk chart/xlsx.
11. Bersihkan repo.

---

## Yang perlu diverifikasi setelah perbaikan

Buat tes yang menjalankan hal-hal ini terhadap staging — jangan hanya percaya pada review kode:

- `curl` setiap endpoint `/api/*` **tanpa token** → semua harus 401 (kecuali allowlist).
- `curl` endpoint admin dengan token user biasa → harus 403.
- `curl /api/debug/db-info` di production → harus 404.
- `curl /database_backup.json` → harus 404.
- Login `DEMO123` di production → harus ditolak.
- Jalankan server **tanpa** `JWT_SECRET` → harus gagal start, bukan jalan diam-diam.
- Lighthouse mobile (throttle Slow 4G) sebelum vs sesudah kompresi — targetkan First Contentful Paint < 3 detik.
