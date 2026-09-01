# Audit Ronde 3 — PrepLab-Portal
Tanggal: 2026-09-01 · Scope: verifikasi perbaikan ronde 2
Metode: review kode statis + typecheck. Belum diverifikasi terhadap instance production yang berjalan.

---

## Ringkasan

Sebagian besar perbaikan ronde 2 sudah benar dan dikerjakan dengan rapi — tiga P0 tuntas, dan
perbaikan performa yang dampaknya paling besar (kompresi, cache header, pool) sudah masuk.

Tapi **masih ada satu lubang pengambilalihan akun (P0)** yang belum tersentuh, dan typecheck
proyek ini sekarang gagal total karena kehabisan memori.

---

## Sudah diperbaiki dengan benar

| Temuan | Bukti verifikasi |
|---|---|
| 🔴 Akun DEMO superadmin | `DEMO123` dihapus dari daftar superadmin (`middleware/auth.ts:57`); `DEMO_USER` kini `isAdmin: false, isDeveloper: false`; jabatan diganti "Operator Prep" agar tidak kena aturan substring; seluruh jalur demo digerbang `env.ENABLE_DEMO_USER` |
| 🔴 `JWT_SECRET` fallback hardcoded | Terpusat di `config/env.ts`; production wajib secret ≥32 karakter lewat `validateEnv()` — server menolak start kalau tidak ada. Definisi duplikat di `auth.ts:320` sudah diganti impor |
| 🔴 16 router tanpa auth | Guard terpusat di `server.ts:351` dengan `PUBLIC_API_PREFIXES`, memakai `originalUrl` dan pencocokan exact/prefix — implementasinya benar, tidak ada celah `startsWith` yang longgar |
| 🟠 Blok mounting router duplikat | Blok baris 484–530 sudah hilang; `debugRouter` kini hanya dipasang sekali, di dalam guard `NODE_ENV !== 'production'` |
| 🟠 Dump 2 MB di `/public` | `public/database_backup.json` sudah dihapus |
| 🟡 `/update-username` | Kini `requireAuth` + cek kepemilikan (`req.user.nik === nik`, kecuali admin) — diperbaiki lengkap |
| 🔵 B1 Kompresi HTTP | `compression()` terpasang di `server.ts:303`, paket terinstal |
| 🔵 B2 Cache header aset | `express.static(distPath, { maxAge: '1y', immutable: true })` + `no-cache` untuk `index.html` — persis pola yang benar |
| 🔵 B4 Pool koneksi | `max: 20`, `idleTimeoutMillis: 30000` |
| 🔵 B9 Batas body | `50mb` → `10mb` |
| 🔵 B11 Viewport | `user-scalable=no` dan `maximum-scale` dihapus; `viewport-fit=cover` ditambahkan |

---

## 🔴 P0 — `/setup` masih bisa mengambil alih akun aktif

Ini satu-satunya P0 yang tersisa, dan konsekuensinya lebih besar daripada perkiraan saya di ronde 2.

**Bukti:** `server/routes/auth.ts`, handler `POST /setup`:
```ts
const { nik, password, email, tanggalLahir } = req.body;
if (!nik || !password) return res.status(400)...
if (password.length < 8) return res.status(400)...      // ✅ ditambahkan
const user = ... where(eq(employees.nik, normalizedNik))
if (!user) return res.status(404)...
const hash = await bcrypt.hash(password, 10);           // ⛔ langsung menulis
await db.update(employees).set({ passwordHash: hash, firstLoginComplete: true })...
```

Tidak ada `if (user.firstLoginComplete) return res.status(403)`. Endpoint ini juga ada di
`PUBLIC_API_PREFIXES`, jadi tidak butuh token sama sekali.

**Dampak:** siapa pun yang tahu sebuah NIK bisa menimpa password akun itu — **termasuk akun yang
sudah aktif**, termasuk akun admin. Dan NIK admin tertulis di source code (`middleware/auth.ts:57`:
`02D25000055`, `02D24000043`, `PREPLABADMIN`). Satu request:
```
POST /api/auth/setup  {"nik":"02D25000055","password":"apa_saja_8_karakter"}
```
→ penyerang jadi admin + developer. Ini membatalkan sebagian besar kerja tiga P0 yang sudah selesai.

**Perbaikan (dua lapis, keduanya perlu):**
1. Tolak kalau akun sudah aktif:
   ```ts
   if (user.firstLoginComplete) {
     return res.status(403).json({ status:"error",
       message:"Akun sudah aktif. Gunakan menu Lupa Password." });
   }
   ```
2. Tambahkan faktor verifikasi untuk aktivasi pertama — minimal cocokkan `tanggalLahir` yang dikirim
   dengan yang ada di database (jangan hanya menyimpannya seperti sekarang), idealnya kode aktivasi
   sekali pakai dari HR.

Selama #1 belum ada, tiga perbaikan P0 sebelumnya belum benar-benar menutup jalur masuk.

---

## 🟠 P1 — `npm run lint` gagal: heap habis

**Bukti:** `npx tsc --noEmit` → `FATAL ERROR: Reached heap limit — JavaScript heap out of memory`
setelah 63 detik di batas 2 GB. Baru selesai dengan `--max-old-space-size=6144`.

**Sebabnya:** `tsconfig.json` tidak punya `include` maupun `exclude`. TypeScript jadi mengompilasi
**302 file `.ts`/`.js`/`.cjs` di root** — termasuk file mati seperti `server_recovered.ts` (88 KB),
`server_refactored_preview.ts`, dan ratusan skrip `fix-*.cjs` / `patch_*.cjs` sekali pakai.

Dari 21 error yang muncul, **11 di antaranya berada di file mati** — bukan di kode yang jalan.

**Dampak:** tidak ada yang bisa menjalankan typecheck, jadi tidak ada jaring pengaman tipe. Di CI ini
akan gagal atau butuh runner besar. Ini juga membuat rekomendasi bersih-bersih repo (B12) punya
konsekuensi terukur, bukan sekadar soal kerapian.

**Perbaikan:**
```json
"include": ["src/**/*", "server/**/*", "server.ts", "vite.config.ts", "google-services.ts"],
"exclude": ["node_modules", "dist", "scripts", "**/*.backup.ts"]
```
Lalu pindahkan ~300 skrip root ke `scripts/archive/` atau hapus (semuanya aman — ada di histori git).
Hapus juga `server_recovered.ts`, `server_refactored_preview.ts`, `server/routes/inspections.backup.ts`.

### 10 error tipe di kode yang benar-benar jalan

Setelah file mati disaring, sisa 10 error nyata. Tidak memblokir build (esbuild/vite membuang tipe
tanpa memeriksa), tapi menandakan bug yang menunggu:

- `employee-database-screen.tsx:172,188`, `p5m-notification-modal.tsx:186,193` — prop `size` dioper ke `Button` yang tidak punya prop `size`. Prop itu diam-diam diabaikan; tombol tidak berukuran seperti yang diniatkan.
- `DailyGreetingHero.tsx:605,608,610` — `.vibe` dan `.tag` tidak ada di tipe `CommunityQuoteItem` → `undefined` saat runtime.
- `NotionDatabaseTable.tsx:2190`, `WorkOrderDetailModal.tsx:778` — prop tidak cocok dengan tipe modal.
- `weekly-inspection-screen.tsx:285` — `Element` dioper ke tempat yang mengharapkan `string`.

---

## 🟠 P1 — Histori git masih memuat 283 hash password

**Bukti:**
```
$ git log --oneline --all -- database_backup.json db_backups cookies.txt
f01b2d7 Initial commit for CI/CD pipeline setup
```
File sudah tidak ada di HEAD ✓, tapi `git checkout f01b2d7 -- database_backup.json` mengembalikannya utuh.

**Perbaikan:** `git filter-repo --path database_backup.json --path db_backups --path cookies.txt --invert-paths`,
force-push, semua kolaborator re-clone. Lalu paksa reset password seluruh user.

Catatan: `.gcloudignore` hanya berisi `.git`, `node_modules`, `dist` — jadi 302 skrip root, `db.xlsx`
(3,5 MB), `temp.xlsx` (976 KB), `sheet.html` (1,2 MB), dan `scratch_prompt.txt` semuanya ikut terkirim
sebagai build context tiap `gcloud run deploy`. Menambahkannya ke `.gcloudignore` mempercepat deploy
secara langsung.

---

## Belum dikerjakan (sesuai rencana bertahap — bukan kritik)

Ini semua ada di Tahap 3 rencana ronde 2, jadi wajar belum tersentuh. Saya catat status faktualnya saja.

**Security:**
- **Socket.IO** — `cors: { origin: "*" }` (`server.ts:191`), belum ada `io.use()` untuk verifikasi JWT. Chat masih bisa dibaca/ditulis dari origin mana pun.
- **Peran dari teks bebas** — `jabatan`/`section` yang mengandung `admin`/`manager`/`superintendent` masih otomatis jadi admin, dan kolom itu bisa diedit lewat CRUD admin.
- **Token 7 hari tanpa pencabutan** — `TOKEN_EXPIRY = '7d'`, belum ada `tokenVersion`. Logout dan reset password tidak membatalkan token lama.
- **File Drive publik permanen** — `{role:'reader', type:'anyone'}` masih di 8 tempat (`cloud.ts` ×3, `p5m.ts` ×2, `misc.ts`, `utils.ts`, `google-services.ts`).
- **Proxy Drive** — `/api/drive/view` sengaja dimasukkan ke allowlist publik untuk rendering gambar. Itu keputusan yang bisa diterima, tapi berarti `fileId` **wajib** divalidasi terhadap tabel `uploadedFiles`, kalau tidak ia jadi proxy terbuka ke seluruh file yang bisa diakses service account.

**Performa:**
- **Indeks DB** — masih 4 untuk 33 tabel; `employees.nik` masih belum terindeks meski jadi kunci lookup login. Ini yang akan terasa duluan saat data bertambah.
- **Polling** — `ReminderNotificationModal` tiap 10 detik, `notification-bell` tiap 30 detik, keduanya masih jalan saat tab di background (tidak ada listener `visibilitychange` di mana pun).
- **Admin 5.000 baris** — `admin.ts:61` masih mengirim seluruh tabel sekaligus, belum ada pagination.
- **Dua library chart** — `recharts` **dan** `chart.js` masih sama-sama di `manualChunks.charts` (566 KB).
- **`xlsx` diimpor statis** di `admin-dashboard.tsx` dan `wo-maintenance-dashboard.tsx` — masih ikut chunk `utils` (517 KB) meski hanya dipakai saat ekspor.
- **Avatar base64 di DB** — kolom `avatar` masih `text`.

Kabar baiknya: kompresi sudah aktif, jadi ~2,7 MB aset itu sekarang terkirim jauh lebih kecil.
Memecah chunk chart/xlsx tetap berguna, tapi urgensinya sudah turun banyak.

---

## Saran urutan berikutnya

1. **Guard `firstLoginComplete` di `/setup`** — beberapa baris, menutup satu-satunya P0 tersisa. Kerjakan lebih dulu.
2. **Perbaiki `tsconfig.json` + bersihkan skrip root** — memulihkan typecheck sekaligus mempercepat deploy.
3. **Purge histori git + paksa reset password.**
4. Indeks DB (`employees.nik` duluan).
5. Auth Socket.IO + batasi CORS.
6. Kolom `role` eksplisit; token pendek + `tokenVersion`.
7. Sisanya: polling, pagination, chunk, avatar.

## Verifikasi setelah perbaikan

- `POST /api/auth/setup` dengan NIK akun aktif → harus 403.
- `POST /api/auth/setup` dengan NIK admin di source code → harus 403.
- `curl` endpoint `/api/*` tanpa token → 401 (kecuali 6 path allowlist).
- Server tanpa `JWT_SECRET` di production → gagal start.
- `npm run lint` → selesai tanpa `--max-old-space-size`.
- Lighthouse mobile (Slow 4G) — ukur ulang sekarang setelah kompresi + cache header aktif; harusnya ada lompatan besar dibanding sebelumnya.
