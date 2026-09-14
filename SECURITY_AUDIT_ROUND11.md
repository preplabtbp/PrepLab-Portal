# Audit Ronde 11 — PrepLab Portal

Tanggal: 2026-09-12 · Scope: white-box review + threat modeling menyeluruh (6 area OWASP)
Basis kode: `server.ts`, `server/middleware/auth.ts`, `server/config/env.ts`, `server/routes/*` (19 file, 159 endpoint), `src/db/schema.ts`

---

## Ringkasan Eksekutif

Fondasi yang dibangun di ronde 1–10 masih berdiri: guard autentikasi terpusat di `/api`
(`server.ts:468`) benar-benar menutup default, `helmet` dan `express-rate-limit` terpasang,
`JWT_SECRET` fatal di production tanpa fallback, `toPublicEmployee()` konsisten membuang
`passwordHash`, dan tidak ada satu pun `sql.raw()` di seluruh basis kode.

Yang belum tertutup adalah **lapisan kedua**: setelah seseorang lolos autentikasi, hampir tidak ada
yang membatasi apa yang boleh ia sentuh. Dari 159 endpoint, hanya **2** yang memakai `requireRole`.
Ini pola klasik "authenticated = authorized" — dan ronde ini menemukan lima hal yang harus dibereskan
sebelum yang lain.

### Temuan prioritas

| # | Temuan | Lokasi | Severity |
|---|---|---|---|
| **P0-1** | API key LLM ter-hardcode di source sebagai fallback, pada endpoint publik | `labbot.ts:42`, `finance.ts:63` | 🔴 Kritis |
| **P0-2** | Demo account aktif paksa di production dengan password statis; SPVDEMO ber-`isAdmin: true` | `auth.ts:81,134` | 🔴 Kritis |
| **P0-3** | PII berat (No. KTP, alamat, tgl lahir, kontak darurat) terkirim ke semua user terautentikasi | `employees.ts:9`, `auth.ts:28` | 🔴 Kritis |
| **P1-1** | IDOR massal: 17 endpoint DELETE, ~0 cek kepemilikan; identitas aktor diambil dari query string | `misc.ts`, `bulletin.ts`, `finance.ts`, dll | 🟠 Tinggi |
| **P1-2** | SSRF penuh via image proxy (unauthenticated reachable) | `misc.ts:1649` | 🟠 Tinggi |

Selain itu ada 7 temuan menengah yang dirinci di matriks.

---

# 1. Matriks Skenario Uji

Konvensi kolom **Cara Uji**: `U` = akun user biasa (`DEMO123`), `S` = supervisor (`SPVDEMO`),
`A` = admin. Semua contoh memakai `curl` dengan cookie sesi `U` kecuali disebut lain.

## 1.1 Broken Access Control & IDOR

| Endpoint / Komponen | Potensi Celah | Cara Uji Manual | Indikator Rentan |
|---|---|---|---|
| `DELETE /api/notes/:id` (`misc.ts:2214`) | Catatan pribadi milik siapa pun bisa dihapus. Query-nya hanya `where(eq(privateNotes.id, req.params.id))` — tidak ada filter pemilik | Login `U`, buat note (catat id-nya = N). Login akun lain, `curl -X DELETE .../api/notes/N` | HTTP 200 `{"status":"success"}` dan note hilang dari akun korban |
| `DELETE /api/bulletin/comments/:commentId` (`bulletin.ts:325`) | Aktor penghapus dibaca dari `req.query.deleterNik` — **client-controlled**. Tidak ada perbandingan dengan `req.user.nik` | `curl -X DELETE ".../api/bulletin/comments/12?deleterNik=SIAPAPUN&deleterName=Admin"` sebagai `U` | Komentar orang lain terhapus; notifikasi terkirim atas nama NIK palsu |
| `PUT/DELETE /api/finance/transactions/:id` (`finance.ts:247,288`) | Data keuangan departemen bisa diubah/dihapus user mana pun. Tidak ada `requireRole`, tidak ada cek pembuat | Sebagai `U`: `curl -X PUT .../api/finance/transactions/1 -d '{"amount":1}'` | 200 + nominal transaksi berubah |
| `GET /api/finance/transactions` | Seluruh transaksi keuangan terbaca tanpa filter role | `curl .../api/finance/transactions` sebagai `U` | Array penuh transaksi + nominal |
| `DELETE /api/kta-reports/:id`, `/api/inspection-proofs/:id`, `/api/group-reports/:id` (`misc.ts:1192,1275,457`) | Bukti kepatuhan K3 orang lain bisa dihapus → status rekap korban turun jadi BELUM | Hapus id milik personil lain sebagai `U` | 200 + rekap `/api/rekap-inspeksi` korban berubah |
| `POST /api/rekap-inspeksi/override-status`, `/api/rekap-kta/override-status` | Fitur "Set Sudah" manual. Frontend menyembunyikannya di balik `isDevUser`, tapi backend tidak memverifikasi | Panggil langsung sebagai `U` dengan `nik` personil lain | 200 + status kepatuhan berubah tanpa hak |
| `POST /api/employees` (`employees.ts:135`) | Insert karyawan baru tanpa `requireRole` | `curl -X POST .../api/employees -d '{"nik":"X","name":"Y"}'` sebagai `U` | 201 + baris baru di master karyawan |
| `POST /api/employees/avatar` & `/cover` | Payload menentukan NIK target? Uji apakah bisa mengubah avatar orang lain | Kirim `nik` milik korban | Avatar korban berubah |
| `GET /api/employees/hierarchy/:nik` (`employees.ts:59`) | Enumerasi struktur organisasi lewat NIK orang lain; ada cabang yang mengembalikan **seluruh** tabel karyawan (`baris 77`) | Iterasi `:nik` | Data bawahan orang lain terbaca |
| `router.use("/api/admin", ...)` (`admin.ts:23`) | Guard-nya benar, tapi `requireRole` mencocokkan dengan `.includes()` pada `role/section/jabatan/department` | Buat/ubah user dengan `section` = `"Non-Administrasi"` atau jabatan mengandung "admin" | Lolos sebagai admin — substring match terlalu longgar |
| `checkIsAdminOrDeveloper()` (`auth.ts:74`) | Promosi otomatis berdasarkan substring `jabatan`: siapa pun ber-jabatan mengandung `manager`/`superintendent`/`admin` jadi admin | Ubah jabatan seorang staf di roster spreadsheet jadi mengandung "Admin" | Sync roster → user naik jadi admin tanpa persetujuan |
| Semua route non-admin | Klaim role dibawa **di dalam JWT** (`isAdmin`, `isDeveloper`) dan tidak pernah diverifikasi ulang ke DB | Cabut hak admin seseorang di DB, lalu pakai token lamanya | Masih admin sampai token kedaluwarsa (7 hari) |

**Parameter yang wajib diuji di seluruh rute:** `:id`, `:nik`, `:commentId`, `:routineId`,
`:name` (nama tabel admin), dan setiap field body/query bernama `nik`, `userId`, `deleterNik`,
`inspectorNik`, `createdBy`, `targetNik`. Aturannya sederhana: **identitas aktor tidak boleh
pernah datang dari request** — hanya dari `req.user` hasil verifikasi JWT.

## 1.2 Authentication & Session Security

| Komponen | Potensi Celah | Cara Uji Manual | Indikator Rentan |
|---|---|---|---|
| Demo account (`auth.ts:81,134`) | `const isDemoAllowed = env.ENABLE_DEMO_USER \|\| process.env.ENABLE_DEMO_USER === 'true' \|\| true;` — literal `\|\| true` membuat flag env **tidak berfungsi**. Demo selalu aktif, termasuk di production | `curl -X POST https://<prod>/api/auth/login -d '{"nik":"SPVDEMO","password":"spvdemo123"}'` | 200 + cookie sesi valid dengan `isAdmin: true` |
| Password demo | Tiga password statis di source: `112233`, `spvdemo123`, `demo123`, berlaku untuk kedua akun | Coba `DEMO123` + `spvdemo123` | Lolos — password tidak terikat ke akunnya |
| Alias demo | `resolveDemoUser()` menerima `SPV`, `DEMOSPV`, `SPV_DEMO`, `USERDEMO`, `DEMO` | Login dengan NIK `SPV` | Lolos sebagai supervisor |
| `checkIsAdminOrDeveloper` (`auth.ts:64`) | `cleanNik.includes('SPVDEMO')` — substring. NIK `XSPVDEMOY` juga jadi admin | Buat akun dengan NIK mengandung `SPVDEMO` | `isAdmin: true` |
| Cookie JWT (`auth.ts:144,211`) | `httpOnly: true` ✅, `secure` mengikuti `NODE_ENV` ✅, tapi `sameSite: 'lax'` dan **tidak ada `path`/`domain` eksplisit** | Inspect `Set-Cookie` di response login production | `SameSite=Lax` — POST lintas-situs masih mungkin pada beberapa alur |
| Token juga dikirim di body | Response login mengembalikan `token` di JSON selain cookie httpOnly | Cek response `/api/auth/login` | Token bisa dibaca JS → nilai `httpOnly` hilang jika frontend menyimpannya di `localStorage` |
| Masa berlaku | `TOKEN_EXPIRY = '7d'`, tanpa refresh token, tanpa idle timeout | Decode JWT di jwt.io | `exp` = 7 hari |
| Pencabutan sesi | `POST /api/auth/logout` hanya `res.clearCookie('token')` (`auth.ts:254`). Tidak ada denylist/`tokenVersion` | Salin token sebelum logout, logout, lalu pakai token itu via header `Authorization: Bearer` | Masih 200 — token hidup 7 hari meski sudah logout |
| Ganti password | Setelah reset password, token lama tetap sah | Reset password korban, uji token lamanya | Masih valid |
| `POST /api/auth/reset-password` (self-reset) | Verifikasi hanya `email` cocok dengan record. Password sementara = 6 digit angka (`Math.random`), dikirim email | Kirim NIK + email korban (email internal mudah ditebak: pola nama perusahaan) | 200 → password korban langsung di-reset (DoS akun); brute-force 6 digit = 10⁶ ruang |
| `POST /api/auth/setup` | Guard `firstLoginComplete` sudah benar ✅ | Panggil untuk akun aktif | 403 `ACCOUNT_ALREADY_ACTIVE` — aman |
| `GET /api/debug/db-info` (`debug.ts`) | Membocorkan `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `current_user` | Verifikasi `NODE_ENV=production` benar-benar terpasang di Cloud Run | Jika env salah → kredensial infrastruktur terekspos |

## 1.3 Input Validation, Injection & File Upload

| Komponen | Potensi Celah | Cara Uji Manual | Indikator Rentan |
|---|---|---|---|
| Drizzle ORM | **Aman.** Tidak ada `sql.raw()` di seluruh repo; semua `sql\`\`` memakai template literal ter-parameterisasi (`auth.ts:167` dst) | `grep -rn "sql.raw(\|db.execute(\`" server/ src/` | Hasil kosong = aman. Regresi jika ada `sql.raw(\`...\${input}\`)` |
| `POST /api/admin/tables/:name` (`admin.ts:94`) | `getTableObj()` memetakan nama tabel; pastikan whitelist, bukan lookup dinamis | Kirim `:name` = `pg_catalog`, `../`, `developerUsers` | 404 = aman; 200 pada tabel di luar daftar = mass-assignment ke tabel sensitif |
| `sanitizePayload()` (`admin.ts:98`) | Uji apakah `passwordHash`, `id`, `firstLoginComplete` bisa di-set langsung | POST ke `/api/admin/tables/employees` dengan `passwordHash` hasil bcrypt milik penyerang | Jika tersimpan → account takeover oleh admin-level user |
| **Upload gambar** (`cloud.ts:23`, `p5m.ts:585`, `misc.ts:2822`) | Tidak ada validasi apa pun: `mimeType` diambil **mentah dari body**, `filename` dipakai apa adanya, tidak ada cek magic byte, tidak ada batas ukuran selain `express.json 10mb` | Kirim `{"base64Data":"<PHP/HTML>","mimeType":"image/png","filename":"../../evil.html"}` | File tersimpan di Drive dengan MIME palsu; nama file dengan `../` tidak dinormalisasi |
| MIME spoofing | `mimeType` client menentukan tipe file di Drive | Upload HTML ber-`mimeType: image/png` lalu buka via `/api/drive/view/:id` | Jika terender sebagai HTML → stored XSS |
| Batas ukuran | Batas efektif = 10 MB body JSON; base64 memuai ~33%, jadi ±7.5 MB file. Tidak ada kuota per user | Kirim 50 request 9 MB paralel | Memori/kuota Drive habis — DoS |
| `filename` (`cloud.ts:66`) | `name: filename \|\| 'uploaded_file'` tanpa sanitasi | Kirim filename berisi `../`, null byte, atau 500 karakter | Nama file aneh tersimpan; risiko path traversal jika suatu saat ditulis ke disk lokal |
| Eksekusi skrip | File di-upload ke Google Drive (bukan webroot) — risiko eksekusi rendah ✅. **Tapi** `misc.ts:2840` memberi permission `role:'reader', type:'anyone'` | Ambil URL hasil upload, buka via incognito | File internal dapat diakses publik siapa pun yang punya link |
| `POST /api/inspections/universal` | Sanitasi poin aktual sudah ada (ronde 2.8.22) ✅. Uji field lain: `temuan`, `lokasi`, `saran` | Kirim payload `<img src=x onerror=alert(1)>` lalu buka PDF/feed | XSS tersimpan jika dirender tanpa escape |
| `POST /api/labbot/chat` | Tidak ada batas panjang `message`; `history` diambil 8 terakhir tanpa batas ukuran per item | Kirim `message` 1 MB | Biaya token LLM membengkak; prompt injection ke system prompt |

## 1.4 API Security & Rate Limiting

| Komponen | Potensi Celah | Cara Uji Manual | Indikator Rentan |
|---|---|---|---|
| `authRateLimiter` (`server.ts:431`) | **50 percobaan / 15 menit / IP** untuk seluruh `/api/auth/*` — terlalu longgar untuk login. 4.800 percobaan/hari/IP; dengan 10 IP → 48.000 | `for i in $(seq 1 60); do curl -s -o /dev/null -w "%{http_code}\n" -X POST .../api/auth/login -d '{"nik":"TARGET","password":"'$i'"}'; done` | 50 respons pertama bukan 429 → password 6 digit hasil reset bisa ditebak |
| Kunci rate limit | Default `express-rate-limit` memakai IP. Di belakang Cloud Run/proxy, **wajib** `app.set('trust proxy', 1)` — grep tidak menemukannya | `curl -H "X-Forwarded-For: 1.2.3.4"` diulang dengan IP berbeda-beda | Jika counter tidak naik → semua user berbagi satu bucket (atau limiter mudah di-bypass) |
| Penyimpanan counter | In-memory. Cloud Run multi-instance → tiap instance punya counter sendiri | Kirim burst dari banyak koneksi | Limit efektif = 50 × jumlah instance |
| `/api/auth/reset-password` | Tidak ada limiter khusus; ikut bucket 50/15menit bersama login | 50 request reset ke NIK berbeda | Reset massal → DoS akun seluruh departemen |
| `apiGeneralLimiter` | 800 req/menit/IP — praktis tidak membatasi apa pun untuk endpoint mahal | Spam `/api/finance/scan-receipt` (panggil LLM) | Biaya API pihak ketiga membengkak |
| Endpoint publik (`server.ts:452`) | `/api/labbot/chat`, `/api/p5m/flyer`, `/api/inspection-schedule`, `/api/drive/view` terbuka **tanpa login** | Akses dari incognito tanpa cookie | 200 → uji apa yang bocor di `/api/inspection-schedule` (nama, NIK, jadwal seluruh personil?) |
| Tidak ada CSRF token | Cookie `SameSite=Lax` + endpoint state-changing berbasis POST | Buat halaman eksternal dengan form auto-submit POST ke `/api/notes` | Jika request lolos → CSRF |
| CORS | `helmet` terpasang tapi tidak ada middleware `cors` untuk HTTP; Socket.IO memakai `origin: "*"` (`server.ts:291`) | Koneksi Socket.IO dari origin asing | Event realtime terbaca origin mana pun |

## 1.5 Sensitive Data Exposure & API Leakage

| Komponen | Potensi Celah | Cara Uji Manual | Indikator Rentan |
|---|---|---|---|
| `GET /api/employees` (`employees.ts:9`) | `toPublicEmployee()` **hanya** membuang `passwordHash`. Semua kolom lain ikut terkirim | `curl .../api/employees \| jq '.[0]'` sebagai `DEMO123` | Field `ktp`, `alamatKtp`, `alamatDomisili`, `tanggalLahir`, `tempatLahir`, `phone`, `phoneDarurat`, `phoneKeluarga`, `keluargaKandung`, `email`, `sisaCt` muncul → **kebocoran PII berat, termasuk nomor identitas nasional** |
| Payload JWT (`auth.ts:31`) | Berisi `nik`, `name`, `department`, `section`, `jabatan`, `pt`. JWT hanya base64 — bukan enkripsi | Paste cookie ke jwt.io | Semua field terbaca; jika token pernah bocor di log/URL, PII ikut bocor |
| `labbot.ts:42` | `const apiKey = process.env.OPENAI_API_KEY \|\| 'sk-ngw_AB…'` — **kunci API asli ter-hardcode** sebagai fallback | `grep -rn "sk-" server/` | Kunci ada di git history → siapa pun dengan akses repo bisa memakai kuota Anda. Sama di `finance.ts:63` |
| Google Drive folder ID | ID folder Shared Drive ter-hardcode (`cloud.ts:26,31`) | Baca source | Bukan rahasia kuat, tapi mempermudah enumerasi jika folder salah izin |
| `misc.ts:2840` | `permissions.create({ role:'reader', type:'anyone' })` pada file temporer | Ambil URL, buka tanpa login | Dokumen internal jadi publik permanen (tidak ada cleanup) |
| Pesan error | `res.status(500).json({ error: err.message })` di `finance.ts:243,297` dan banyak tempat lain | Kirim payload yang memicu error DB | Struktur tabel/constraint bocor ke klien |
| `GET /api/debug/db-info` | Host, nama DB, user DB | Pastikan `NODE_ENV=production` | Kredensial infrastruktur |
| Response login | Mengembalikan objek `employee` lengkap (semua kolom kecuali hash) | Cek response body | PII lengkap masuk ke state frontend & devtools |

## 1.6 SSRF & Server-Side Request

| Komponen | Potensi Celah | Cara Uji Manual | Indikator Rentan |
|---|---|---|---|
| `GET /api/gallery/image-proxy?url=` (`misc.ts:1649`) | `fetch(targetUrl)` **tanpa validasi skema/host sama sekali** | `curl ".../api/gallery/image-proxy?url=http://169.254.169.254/computeMetadata/v1/"` | Respons berisi metadata GCP → **pencurian service account token**. Uji juga `file://`, `http://localhost:8080/api/debug/db-info`, dan IP internal VPC |

---

# 2. Contoh Perbaikan Kode (Defensive Snippets)

## P0-1 — Cabut API key dari source

Kunci di `labbot.ts:42` dan `finance.ts:63` harus dianggap **sudah bocor**. Urutan tindakan:
rotasi kunci di dashboard provider dulu, baru ubah kode, baru bersihkan git history.

```ts
// server/config/env.ts — jadikan wajib, tanpa fallback
export const env = {
  // ...
  JWT_SECRET: process.env.JWT_SECRET || (isProduction ? '' : 'dev-only-secret-not-for-production-use'),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || 'https://api.routr.cloud/v1',
  ENABLE_DEMO_USER: process.env.ENABLE_DEMO_USER === 'true',
};

export function validateEnv() {
  // ...
  if (isProduction && !env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY tidak diset. Fitur LabBot & scan struk tidak boleh jalan dengan kunci fallback.');
  }
}
```

```ts
// server/routes/labbot.ts
import { env } from '../config/env.js';

labbotRouter.post('/api/labbot/chat', async (req, res) => {
  if (!env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'Layanan LabBot sedang tidak tersedia.' });
  }
  const apiKey = env.OPENAI_API_KEY;   // tidak ada lagi literal di source
  // ...
});
```

Bersihkan history (koordinasikan — ini me-rewrite commit):
```bash
git log -S 'sk-ngw_' --oneline          # cari commit mana saja yang memuat
# lalu: git filter-repo --replace-text <(echo 'sk-ngw_...==>REDACTED')
```

## P0-2 — Matikan demo account di production

```ts
// server/routes/auth.ts
import { env } from '../config/env.js';

// HAPUS pola ini — `|| true` membuat flag env tidak ada artinya:
//   const isDemoAllowed = env.ENABLE_DEMO_USER || process.env.ENABLE_DEMO_USER === 'true' || true;

const isProduction = process.env.NODE_ENV === 'production';
const isDemoAllowed = env.ENABLE_DEMO_USER && !isProduction;   // ← dua syarat, keduanya wajib

// Password demo dari env, satu password per akun, dibandingkan konstan-waktu
import crypto from 'node:crypto';

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a); const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

const demoUser = isDemoAllowed ? resolveDemoUser(normalized) : null;
if (demoUser) {
  const expected = demoUser.nik === 'SPVDEMO'
    ? (process.env.DEMO_SPV_PASSWORD || '')
    : (process.env.DEMO_USER_PASSWORD || '');
  if (!expected || !safeEqual(password, expected)) {
    return res.status(401).json({ status: 'error', message: 'Password salah' });
  }
  // ...
}
```

Perbaiki juga substring match yang terlalu longgar di `middleware/auth.ts`:

```ts
// SEBELUM: cleanNik.includes('SPVDEMO')  → NIK "XSPVDEMOY" ikut lolos
// SESUDAH: perbandingan eksak, dan hanya di luar production
const DEMO_ADMIN_NIKS = new Set(['SPVDEMO', 'DEMOSPV']);
if (!isProduction && DEMO_ADMIN_NIKS.has(cleanNik)) {
  return { isAdmin: true, isDeveloper: false };
}

// Promosi admin: jangan pakai substring pada jabatan bebas.
// Pakai daftar eksplisit, atau lebih baik kolom `role` di tabel employees.
const ADMIN_JABATAN = new Set([
  'preparation & laboratory manager',
  'laboratory superintendent',
  'preparation superintendent',
  'admin, preparation & laboratory',
]);
if (ADMIN_JABATAN.has((jabatan || '').trim().toLowerCase())) {
  return { isAdmin: true, isDeveloper: false };
}
```

## P0-3 — Batasi PII yang keluar dari server

`toPublicEmployee()` sekarang blacklist (buang `passwordHash`). Ubah jadi **whitelist** —
field baru di skema otomatis tertutup, bukan otomatis terbuka.

```ts
// server/middleware/auth.ts

/** Field yang boleh dilihat semua rekan kerja (direktori internal) */
const EMPLOYEE_PUBLIC_FIELDS = [
  'id', 'nik', 'name', 'jabatan', 'section', 'department',
  'pt', 'shift', 'gol', 'jobGrade', 'avatar', 'cover', 'username',
] as const;

/** Tambahan yang boleh dilihat HR/Admin */
const EMPLOYEE_ADMIN_FIELDS = [
  'email', 'phone', 'statusKaryawan', 'statusKontrak',
  'tanggalAwalBergabung', 'tanggalBergabungTerbaru', 'masaKerja',
  'rotation', 'poh', 'statusMess', 'sisaCt', 'jatuhTempoCt', 'firstLoginComplete',
] as const;

// Field berikut TIDAK PERNAH dikirim ke klien lewat helper ini:
//   passwordHash, ktp, alamatKtp, alamatDomisili, tanggalLahir, tempatLahir,
//   phoneDarurat, phoneKeluarga, keluargaKandung, orangTerdekat, sponsor

function pick<T extends object>(obj: T, keys: readonly string[]) {
  const out: Record<string, any> = {};
  for (const k of keys) if (k in obj) out[k] = (obj as any)[k];
  return out;
}

export function toPublicEmployee(emp: any, viewer?: AuthUser): any {
  if (!emp) return null;
  const isSelf  = viewer?.nik && String(viewer.nik).toUpperCase() === String(emp.nik).toUpperCase();
  const isAdmin = !!(viewer?.isAdmin || viewer?.isDeveloper);

  if (isSelf) {
    const { passwordHash, ...ownData } = emp;   // pemilik data boleh lihat datanya sendiri
    return ownData;
  }
  const fields = isAdmin
    ? [...EMPLOYEE_PUBLIC_FIELDS, ...EMPLOYEE_ADMIN_FIELDS]
    : EMPLOYEE_PUBLIC_FIELDS;
  return pick(emp, fields);
}
```

```ts
// server/routes/employees.ts — teruskan viewer-nya
employeesRouter.get('/', async (req, res) => {
  const viewer = (req as any).user as AuthUser;
  const data = await db.select().from(employees);
  res.json(data.map(e => toPublicEmployee(e, viewer)));
});
```

> Catatan kepatuhan: kolom `ktp`, `alamatKtp`, `tanggalLahir`, dan kontak keluarga adalah data
> pribadi yang dilindungi UU PDP No. 27/2022. Selain dibatasi di API, akses ke kolom-kolom ini
> sebaiknya dicatat (audit log) dan dibatasi ke HR saja.

## P1-1 — Hentikan IDOR: helper kepemilikan + role di setiap mutasi

Akar masalahnya satu: identitas aktor diambil dari request. Perbaikannya juga satu.

```ts
// server/middleware/ownership.ts  (file baru)
import { Request, Response, NextFunction } from 'express';
import type { AuthUser } from './auth.js';

/** Satu-satunya sumber identitas yang sah. JANGAN pernah baca nik dari body/query. */
export function actor(req: Request): AuthUser {
  const u = (req as any).user as AuthUser | undefined;
  if (!u?.nik) throw Object.assign(new Error('UNAUTHENTICATED'), { status: 401 });
  return u;
}

/**
 * Pastikan baris milik pemanggil, atau pemanggil admin/developer.
 * @param loader  fungsi pengambil baris berdasarkan id
 * @param ownerOf fungsi pengekstrak NIK pemilik dari baris
 */
export function requireOwnershipOrAdmin<T>(
  loader: (id: string) => Promise<T | undefined>,
  ownerOf: (row: T) => string | null | undefined,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const me = actor(req);
      const row = await loader(req.params.id);
      if (!row) return res.status(404).json({ status: 'error', message: 'Data tidak ditemukan' });

      const owner = (ownerOf(row) || '').toUpperCase();
      const isOwner = owner && owner === String(me.nik).toUpperCase();
      if (!isOwner && !me.isAdmin && !me.isDeveloper) {
        // 404, bukan 403 — jangan konfirmasi bahwa id-nya ada
        return res.status(404).json({ status: 'error', message: 'Data tidak ditemukan' });
      }
      (req as any).row = row;
      next();
    } catch (e: any) {
      res.status(e.status || 500).json({ status: 'error', message: 'Gagal memeriksa otorisasi' });
    }
  };
}
```

Penerapan pada tiga contoh dari matriks:

```ts
// misc.ts — catatan pribadi
router.delete('/api/notes/:id',
  requireOwnershipOrAdmin(
    id => db.select().from(privateNotes).where(eq(privateNotes.id, id)).limit(1).then(r => r[0]),
    row => row.userId,          // sesuaikan dengan nama kolom pemilik
  ),
  async (req, res) => {
    await db.delete(privateNotes).where(eq(privateNotes.id, req.params.id));
    res.json({ status: 'success' });
  });

// bulletin.ts — aktor dari token, BUKAN dari query
router.delete('/api/bulletin/comments/:commentId', async (req, res) => {
  const me = actor(req);                        // ← ganti req.query.deleterNik
  const commentId = parseInt(req.params.commentId, 10);
  if (Number.isNaN(commentId)) return res.status(400).json({ status: 'error', message: 'ID tidak valid' });

  const [comment] = await db.select().from(bulletinComments).where(eq(bulletinComments.id, commentId)).limit(1);
  if (!comment) return res.status(404).json({ status: 'error', message: 'Komentar tidak ditemukan' });

  const isOwner = (comment.authorNik || '').toUpperCase() === String(me.nik).toUpperCase();
  if (!isOwner && !me.isAdmin && !me.isDeveloper) {
    return res.status(403).json({ status: 'error', message: 'Hanya penulis atau admin yang dapat menghapus' });
  }
  // notifikasi memakai me.name / me.nik, bukan nilai dari klien
  // ...
});

// finance.ts — data keuangan hanya untuk role tertentu
financeRouter.use('/api/finance', requireAuth, requireRole(['finance', 'admin', 'developer']));
```

Sekalian perketat `requireRole` supaya tidak lagi memakai substring:

```ts
// server/middleware/auth.ts
export function requireRole(allowedRoles: string[]) {
  const allowed = new Set(allowedRoles.map(r => r.toLowerCase().trim()));
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthUser | undefined;
    if (!user) return res.status(401).json({ status: 'error', code: 'UNAUTHORIZED', message: 'Autentikasi diperlukan.' });
    if (user.isDeveloper) return next();
    if (user.isAdmin && (allowed.has('admin') || allowed.has('developer'))) return next();

    // perbandingan eksak — "Non-Administrasi" tidak lagi cocok dengan "admin"
    const claims = [user.role, user.section, user.jabatan, user.department]
      .map(v => (v || '').toLowerCase().trim());
    if (claims.some(c => allowed.has(c))) return next();

    return res.status(403).json({ status: 'error', code: 'FORBIDDEN', message: 'Akses ditolak.' });
  };
}
```

## P1-2 — Tutup SSRF di image proxy

```ts
// server/routes/misc.ts
import dns from 'node:dns/promises';
import net from 'node:net';

const IMAGE_HOST_ALLOWLIST = new Set([
  'drive.google.com',
  'lh3.googleusercontent.com',
  'docs.google.com',
]);

function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 ||
           (a === 172 && b >= 16 && b <= 31) ||
           (a === 192 && b === 168) ||
           (a === 169 && b === 254) ||          // metadata GCP/AWS
           (a === 100 && b >= 64 && b <= 127);
  }
  const low = ip.toLowerCase();
  return low === '::1' || low.startsWith('fc') || low.startsWith('fd') || low.startsWith('fe80');
}

router.get('/api/gallery/image-proxy', async (req, res) => {
  try {
    const raw = String(req.query.url || '');
    if (!raw) return res.status(400).send('URL parameter required');

    let target: URL;
    try { target = new URL(raw); } catch { return res.status(400).send('URL tidak valid'); }

    // 1. hanya http/https — tolak file:, gopher:, data:
    if (target.protocol !== 'https:' && target.protocol !== 'http:') {
      return res.status(400).send('Skema URL tidak diizinkan');
    }
    // 2. hanya host yang kita percayai
    if (!IMAGE_HOST_ALLOWLIST.has(target.hostname.toLowerCase())) {
      return res.status(403).send('Host tidak diizinkan');
    }
    // 3. resolusi DNS harus publik (cegah DNS rebinding ke IP internal)
    const resolved = await dns.lookup(target.hostname, { all: true });
    if (resolved.some(r => isPrivateAddress(r.address))) {
      return res.status(403).send('Target internal tidak diizinkan');
    }

    const driveMatch = raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (driveMatch) return res.redirect(`/api/drive/view/${driveMatch[1]}`);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const response = await fetch(target, { redirect: 'error', signal: ctrl.signal }); // 4. jangan ikuti redirect
    clearTimeout(timer);
    if (!response.ok) return res.status(response.status).send('Failed to fetch image');

    // 5. hanya lewatkan gambar, dan paksa content-type yang aman
    const ct = (response.headers.get('content-type') || '').toLowerCase();
    if (!ct.startsWith('image/')) return res.status(415).send('Bukan gambar');

    res.setHeader('Content-Type', ct);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(Buffer.from(await response.arrayBuffer()));
  } catch {
    return res.status(502).send('Proxy error');     // jangan bocorkan err.message
  }
});
```

## P2 — Validasi upload gambar

```ts
// server/utils/upload-guard.ts  (file baru)
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;   // 5 MB setelah decode

/** Deteksi tipe dari magic byte — bukan dari mimeType yang dikirim klien */
const SIGNATURES: Array<{ mime: string; test: (b: Buffer) => boolean }> = [
  { mime: 'image/jpeg', test: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png',  test: b => b.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])) },
  { mime: 'image/webp', test: b => b.subarray(0,4).toString('ascii') === 'RIFF' && b.subarray(8,12).toString('ascii') === 'WEBP' },
];

export function safeDecodeImage(base64Data: unknown): { buffer: Buffer; mime: string } {
  if (typeof base64Data !== 'string' || !base64Data) {
    throw Object.assign(new Error('Data gambar tidak valid'), { status: 400 });
  }
  const clean = base64Data.replace(/^data:.*?;base64,/, '');
  const buffer = Buffer.from(clean, 'base64');

  if (buffer.length === 0)                throw Object.assign(new Error('Gambar kosong'), { status: 400 });
  if (buffer.length > MAX_UPLOAD_BYTES)   throw Object.assign(new Error('Ukuran gambar melebihi 5 MB'), { status: 413 });

  const hit = SIGNATURES.find(s => s.test(buffer));
  if (!hit) throw Object.assign(new Error('Hanya file JPG, PNG, atau WebP yang diperbolehkan'), { status: 415 });

  return { buffer, mime: hit.mime };      // ← mime hasil deteksi, bukan kiriman klien
}

/** Buang path traversal, null byte, dan karakter aneh dari nama file */
export function safeFilename(name: unknown, fallback: string): string {
  const base = String(name || fallback)
    .replace(/\0/g, '')
    .replace(/[\/\\]/g, '_')          // hilangkan pemisah path
    .replace(/\.{2,}/g, '.')          // hilangkan ../
    .replace(/[^\w\s.\-()]/g, '')
    .trim()
    .slice(0, 120);
  return base || fallback;
}
```

```ts
// cloud.ts, p5m.ts, misc.ts — pakai di semua titik upload
import { safeDecodeImage, safeFilename } from '../utils/upload-guard.js';

const { buffer, mime } = safeDecodeImage(req.body.base64Data);
const fileMetadata = { name: safeFilename(req.body.filename, 'upload.jpg'), parents: [finalFolderId] };
const media = { mimeType: mime, body: Readable.from(buffer) };   // mime terverifikasi
```

Dan hentikan pembagian publik otomatis di `misc.ts:2840`:
```ts
// HAPUS — ini membuat dokumen internal dapat diakses siapa pun yang punya link:
// await drive.permissions.create({ fileId, requestBody: { role: 'reader', type: 'anyone' } });
// Ganti dengan berbagi ke service account / domain organisasi, atau sajikan lewat /api/drive/view
// yang sudah melewati requireAuth.
```

## P2 — Rate limiting yang benar di belakang proxy

```ts
// server.ts — WAJIB, kalau tidak semua request terlihat berasal dari IP proxy
app.set('trust proxy', 1);              // Cloud Run = 1 hop

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,                                // 50 → 8 untuk login
  skipSuccessfulRequests: true,          // hanya hitung yang gagal
  keyGenerator: (req) => {
    const id = String(req.body?.identifier || req.body?.nik || '').toUpperCase().trim();
    return `${req.ip}:${id}`;            // per IP + per akun target
  },
  message: { status: 'error', code: 'TOO_MANY_REQUESTS', message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,                                // reset password jauh lebih ketat
  message: { status: 'error', code: 'TOO_MANY_REQUESTS', message: 'Terlalu banyak permintaan reset password.' },
});

const llmLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });   // endpoint berbiaya

app.use('/api/auth/login',          loginLimiter);
app.use('/api/auth/reset-password', resetLimiter);
app.use('/api/labbot/chat',         llmLimiter);
app.use('/api/finance/scan-receipt', llmLimiter);
app.use('/api/auth', authRateLimiter, authRouter);
```

> Catatan multi-instance: counter `express-rate-limit` disimpan di memori tiap instance.
> Di Cloud Run dengan `min-instances > 1`, pakai store bersama (`rate-limit-postgresql` di atas
> PostgreSQL yang sudah ada) supaya limit-nya benar-benar global.

## P2 — Pencabutan sesi (logout & ganti password benar-benar mematikan token)

```sql
ALTER TABLE employees ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;
```

```ts
// generateAuthToken: sertakan versi
const payload = { /* ... */, tv: user.tokenVersion ?? 0 };

// requireAuth: bandingkan dengan DB (cache 60 detik agar tidak query tiap request)
const decoded = jwt.verify(token, JWT_SECRET) as AuthUser & { tv?: number };
const current = await getTokenVersionCached(decoded.nik);
if ((decoded.tv ?? 0) !== current) {
  return res.status(401).json({ status: 'error', code: 'SESSION_REVOKED', message: 'Sesi telah dicabut. Silakan login kembali.' });
}

// logout / reset password / ganti role:
await db.update(employees)
  .set({ tokenVersion: sql`${employees.tokenVersion} + 1` })
  .where(eq(employees.id, user.id));
```

Sekalian perketat cookie dan persingkat masa berlaku:

```ts
const TOKEN_EXPIRY = '12h';             // 7d → 12h (satu shift kerja)

res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',                   // lax → strict; portal internal tidak perlu lintas-situs
  path: '/',
  maxAge: 12 * 60 * 60 * 1000,
});
// dan JANGAN kembalikan `token` di body response — cukup cookie httpOnly.
```

## P2 — Security headers & CORS

```ts
// server.ts
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],                                  // hapus 'unsafe-inline' di production
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:', 'blob:', 'https://drive.google.com', 'https://lh3.googleusercontent.com'],
      connectSrc: ["'self'"],
      frameSrc:   ['https://drive.google.com'],                // viewer PDF
      objectSrc:  ["'none'"],
      frameAncestors: ["'none'"],                              // anti clickjacking
      upgradeInsecureRequests: [],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false,
}));

// Socket.IO: origin "*" → daftar eksplisit
const io = new Server(httpServer, {
  cors: {
    origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
    credentials: true,
  },
});
```

## P2 — Jangan bocorkan pesan error internal

```ts
// server.ts — pasang PALING AKHIR, setelah semua route
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  console.error(`[${req.method} ${req.originalUrl}]`, err);   // detail hanya ke log server
  res.status(status).json({
    status: 'error',
    message: status < 500 ? err.message : 'Terjadi kesalahan pada server. Silakan coba lagi.',
  });
});
```

Lalu ganti pola `res.status(500).json({ error: err.message })` di seluruh route dengan `next(err)`.

---

# 3. Urutan Pengerjaan yang Disarankan

| Tahap | Isi | Kenapa dulu |
|---|---|---|
| **Hari ini** | Rotasi API key (P0-1) · Matikan demo di production (P0-2) | Keduanya bisa dieksploitasi dari internet tanpa akun |
| **Minggu ini** | Whitelist PII (P0-3) · `trust proxy` + limiter login (P2) · Tutup SSRF (P1-2) | Perubahan kecil, dampak besar, risiko regresi rendah |
| **Sprint berikutnya** | Helper kepemilikan di 17 endpoint DELETE + mutasi (P1-1) · Validasi upload (P2) | Butuh sentuhan banyak file — kerjakan bertahap per router dengan test |
| **Backlog** | `tokenVersion` (P2) · CSP ketat · error handler terpusat · audit log akses PII | Perlu perubahan skema dan koordinasi frontend |

## Verifikasi cepat sebelum deploy

```bash
# 1. Tidak ada kunci rahasia di source
grep -rnE "(sk-|AIza|ghp_)[A-Za-z0-9_-]{12,}" server/ src/ *.ts && echo "GAGAL" || echo "OK"

# 2. Tidak ada raw SQL
grep -rn "sql.raw(" server/ src/ && echo "GAGAL" || echo "OK"

# 3. Demo mati di production
curl -s -X POST https://<prod>/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"nik":"SPVDEMO","password":"spvdemo123"}' | jq .     # harus 401/404

# 4. SSRF tertutup
curl -s "https://<prod>/api/gallery/image-proxy?url=http://169.254.169.254/" -o /dev/null -w '%{http_code}\n'   # harus 403

# 5. Debug router mati
curl -s -o /dev/null -w '%{http_code}\n' https://<prod>/api/debug/db-info    # harus 404

# 6. PII tidak keluar
curl -s https://<prod>/api/employees -b "token=<cookie_user_biasa>" | jq '.[0] | keys' | grep -E 'ktp|alamat|tanggal_lahir' && echo "GAGAL" || echo "OK"

# 7. Rate limit login aktif
for i in $(seq 1 12); do curl -s -o /dev/null -w "%{http_code} " -X POST https://<prod>/api/auth/login -d '{"nik":"X","password":"'$i'"}'; done; echo   # harus muncul 429
```

---

## Catatan Metodologi & Batasan

Audit ini **statis** — pembacaan kode, bukan eksekusi terhadap server berjalan. Semua temuan di
matriks adalah *hipotesis terverifikasi di tingkat kode* yang masih perlu dikonfirmasi dengan
pengujian dinamis di lingkungan staging (jangan di production).

Yang belum tercakup dan sebaiknya masuk ronde berikutnya:

- Audit 42 endpoint di `misc.ts` satu per satu — file ini 111 KB dan menampung terlalu banyak
  tanggung jawab; memecahnya per domain akan membuat audit berikutnya jauh lebih murah.
- Alur sinkronisasi Google Sheets (`syncRoster.ts`): apa yang terjadi jika spreadsheet dimodifikasi
  pihak yang tidak berwenang — itu jalur injeksi data yang melewati semua validasi API.
- Postur keamanan Google Drive: izin folder, service account scope, dan retensi file `temp_*`.
- Dependency audit (`npm audit`) dan pinning versi.
- Threat model untuk Socket.IO: event apa saja yang bisa di-emit klien dan siapa yang menerimanya.
