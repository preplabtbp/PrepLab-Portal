# Security Audit — PrepLab-Portal
Tanggal: 2026-09-01 · Scope: `server.ts`, `server/routes/*`, `src/`, konfigurasi repo
Metode: review kode statis (bukan pentest runtime). Belum diverifikasi terhadap instance production yang berjalan.

---

## Ringkasan

Aplikasi ini **tidak memiliki lapisan otentikasi di sisi server sama sekali**. Login hanya
memvalidasi password lalu mengembalikan objek employee ke browser; setelah itu tidak ada
satu pun endpoint yang memeriksa siapa pemanggilnya. Semua kontrol akses (termasuk menu
Admin) berada di frontend, sehingga bisa dilewati sepenuhnya dengan `curl`.

Akibat langsung: siapa pun yang tahu URL aplikasi bisa membaca, mengubah, dan menghapus
seluruh isi database — termasuk menghapus seluruh tabel karyawan — tanpa login.

Prioritas perbaikan: **P0 (1–5) harus dikerjakan lebih dulu dan berurutan.** Sisanya menyusul.

---

## P0 — Kritis

### 1. Tidak ada otentikasi/otorisasi di seluruh API
**Bukti:** `grep` untuk `requireAuth|jwt|session|middleware auth` di `server/` tidak menghasilkan
apa pun. Satu-satunya jejak identitas adalah `server/routes/roster.ts:322` yang membaca header
`x-user-nik` — header yang bisa diisi bebas oleh klien, jadi bukan otentikasi.

**Dampak:** setiap endpoint `/api/*` terbuka untuk anonim.

**Perbaikan:**
- Terbitkan session token (JWT signed atau session cookie `httpOnly` + `secure` + `sameSite=lax`) saat login berhasil.
- Buat middleware `requireAuth` yang memverifikasi token dan mengisi `req.user` dari **database**, bukan dari payload klien.
- Buat middleware `requireRole('admin')` untuk seluruh router admin.
- Pasang `app.use('/api', requireAuth)` dengan allowlist eksplisit untuk endpoint publik (`/api/auth/login`, dsb).
- Hapus pola `x-user-nik` — ganti dengan `req.user.nik` hasil verifikasi token.

### 2. Router admin terbuka penuh — termasuk hapus seluruh tabel
**Bukti:** `server/routes/admin.ts`
- `GET /api/admin/tables/:name` — dump isi tabel apa pun (33 tabel via `getTableObj`), termasuk `employees` lengkap dengan `passwordHash`.
- `POST /api/admin/tables/:name` — insert baris apa pun.
- `DELETE /api/admin/tables/:name/:id` — hapus baris.
- `DELETE /api/admin/tables/:name` (baris 170) — **`db.delete(t)` tanpa `WHERE`: menghapus SELURUH isi tabel.**

Tidak satu pun dari endpoint ini memeriksa identitas pemanggil.

**Dampak:** destruksi data total dan pencurian seluruh basis data oleh anonim.

**Perbaikan:**
- Wajibkan `requireAuth` + `requireRole('admin')` di seluruh `adminRouter`.
- Hapus endpoint truncate-tabel, atau kunci di balik konfirmasi eksplisit + audit log + role developer.
- Terapkan allowlist tabel yang boleh diakses lewat generic CRUD (jangan seluruh 33 tabel).

### 3. Reset password siapa pun tanpa otentikasi
**Bukti:** `server/routes/auth.ts`, handler `POST /reset-password`:
```ts
const { nik, email, newPassword, adminReset } = req.body;
if (adminReset) {
   const hash = await bcrypt.hash(newPassword, 10);
   ...
   await db.update(employees).set({ passwordHash: hash })...
   return res.json({ status: "success", ... });
}
```
Flag `adminReset` datang dari **body request**. Siapa pun bisa mengirim
`{nik: "<nik korban>", newPassword: "x", adminReset: true}` dan mengambil alih akun mana pun,
termasuk akun admin.

**Perbaikan:** jalur `adminReset` harus di balik `requireRole('admin')`; hapus flag dari body dan
tentukan dari `req.user.role`.

### 4. `POST /check-nik` membocorkan seluruh record karyawan tanpa login
**Bukti:** `server/routes/auth.ts` — mengembalikan `employee: employee` (objek utuh dari DB) hanya
dengan bermodal NIK/username. Objek itu memuat `passwordHash`, `email`, `tanggalLahir`, dan seluruh
data kepegawaian.

**Dampak:** enumerasi akun + kebocoran hash password (bisa di-crack offline) + PII.

**Perbaikan:**
- Kembalikan hanya `{ found: true, firstLoginComplete }` — tanpa objek employee.
- Buat helper `toPublicEmployee()` yang membuang `passwordHash`, dan pakai di **semua** response.
- Beri rate limit pada endpoint ini.

### 5. `POST /setup` — perebutan akun yang belum pernah login
**Bukti:** `server/routes/auth.ts` — menerima `{nik, password, email}` dan langsung menulis
`passwordHash` + `firstLoginComplete: true` tanpa verifikasi apa pun (tidak ada cek tanggal lahir,
tidak ada kode aktivasi). Daftar NIK sendiri bisa dienumerasi lewat masalah #4.

**Perbaikan:** wajibkan faktor verifikasi (kode aktivasi sekali pakai yang dikirim ke email HR,
atau cocokkan `tanggalLahir` + NIK), plus rate limit.

---

## P1 — Tinggi

### 6. Data karyawan asli + 283 hash password ter-commit ke git
**Bukti:** `git ls-files` menampilkan `database_backup.json` (22 MB) dan `db_backups/backup_employees_1.json`;
keduanya memuat 283 kemunculan `passwordHash`, plus NIK, nama, email, tanggal lahir karyawan asli.
`cookies.txt` (session curl) juga ter-commit.

**Perbaikan:**
- Hapus dari working tree dan tambahkan ke `.gitignore`.
- **Purge dari histori git** (`git filter-repo` / BFG) lalu force-push — menghapus file saja tidak cukup, data masih ada di histori.
- Anggap seluruh hash tersebut bocor: paksa reset password semua user setelah #1–#5 selesai.
- Rotasi kredensial apa pun yang ada di `cookies.txt`.

### 7. Kredensial demo hardcoded dengan fallback di blok `catch`
**Bukti:** `server/routes/auth.ts` — `DEMO123` / `112233`. Yang lebih berbahaya: pengecekan demo
**diulang di dalam blok `catch`** pada `/check-nik` dan `/login`. Artinya saat database down atau
error, login demo tetap berhasil — jalur bypass yang aktif justru ketika sistem sedang tidak sehat.

**Perbaikan:** pindahkan akun demo ke seed database di balik env flag (`ENABLE_DEMO_USER`), matikan
di production, dan hapus seluruh fallback di blok `catch`.

### 8. `GET /debug/db-info` membocorkan konfigurasi database
**Bukti:** `server/routes/debug.ts` — mengembalikan `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`,
`current_database()`, `current_user`.

**Perbaikan:** hapus `debugRouter` dari production, atau kunci di balik role developer + env flag.

### 9. Socket.io CORS `origin: "*"`
**Bukti:** `server.ts:186` — `cors: { origin: "*" }`. Digabung dengan tidak adanya otentikasi socket,
`chatMessages` bisa dibaca/ditulis dari origin mana pun.

**Perbaikan:** batasi origin ke domain aplikasi, dan tambahkan handshake auth di Socket.io
(`io.use()` yang memverifikasi token).

### 10. Tidak ada rate limiting, helmet, atau proteksi CSRF
**Bukti:** tidak ada `express-rate-limit`, `helmet`, maupun proteksi CSRF di seluruh kode.

**Perbaikan:**
- `helmet()` global + Content-Security-Policy.
- `express-rate-limit` ketat pada `/api/auth/*` (mis. 5 percobaan / 15 menit / IP).
- Jika memakai cookie session: token CSRF atau `sameSite=strict` pada endpoint yang mengubah state.

---

## P2 — Sedang

### 11. File yang di-upload ke Drive dibuat publik permanen
**Bukti:** `server/utils.ts` → `uploadFileToDrive()` selalu memanggil permissions API dengan
`{ role: 'reader', type: 'anyone' }`. Setiap lampiran bulletin/inspeksi jadi bisa diakses siapa pun
yang punya link, selamanya.

**Perbaikan:** jangan berikan permission `anyone`; layani file lewat proxy `/api/drive/view` yang
sudah ada, di balik `requireAuth`.

### 12. `GET /api/drive/view/:fileId` sebagai proxy terbuka
**Bukti:** `server/routes/bulletin.ts:385` — menerima `fileId` apa pun dan mem-fetch-nya memakai
kredensial OAuth service milik aplikasi, tanpa cek apakah file itu memang milik aplikasi dan tanpa
cek pemanggil.

**Dampak:** siapa pun bisa membaca file Drive mana pun yang bisa diakses service account tersebut.

**Perbaikan:** validasi `fileId` terhadap tabel `uploadedFiles` (harus file yang memang milik aplikasi),
dan wajibkan `requireAuth`.

### 13. Data sensitif disimpan di `localStorage`
**Bukti:** `src/App.tsx:406,547` — `localStorage.setItem('p2h_inspector_profile', JSON.stringify(data.employee))`,
menyimpan objek employee utuh (termasuk `passwordHash` yang dikirim server) dan bisa dibaca skrip XSS mana pun.

**Perbaikan:** server jangan pernah mengirim `passwordHash`; simpan session di cookie `httpOnly`;
di `localStorage` cukup data tampilan yang tidak sensitif.

### 14. Pesan error mentah dikirim ke klien
**Bukti:** pola `res.status(500).json({ error: e.message })` tersebar di seluruh route — membocorkan
struktur tabel, nama kolom, dan detail driver Postgres.

**Perbaikan:** kirim pesan generik + `requestId`; log detailnya di server saja.

### 15. Query "ambil semua lalu filter di memori"
**Bukti:** `auth.ts` dan `utils.ts` berulang kali memanggil `db.select().from(employees)` lalu
`.find()` di JavaScript, pada setiap login dan setiap notifikasi.

**Dampak:** ini masalah performa yang berubah jadi masalah ketersediaan — endpoint login tanpa rate
limit yang menarik seluruh tabel karyawan per request adalah amplifier DoS yang murah.

**Perbaikan:** ganti dengan `WHERE` di database dan indeks pada `nik` / `username` (case-insensitive).

---

## Catatan positif

- Password di-hash dengan bcrypt (`cost 10`) — bukan plaintext atau MD5.
- Drizzle ORM dipakai konsisten dengan query berparameter; **tidak ditemukan SQL injection** (tidak ada `sql.raw` dengan input user).
- `.env` **tidak** ter-commit (`.gitignore` memuat `.env*`, `git ls-files` mengonfirmasi).
- Validasi input pada `update-username` sudah baik (whitelist regex, cek panjang, cek duplikat).

---

## Urutan pengerjaan yang disarankan

1. **Matikan akses publik ke aplikasi** (IAM Cloud Run / firewall) sampai #1–#5 selesai.
2. Bangun `requireAuth` + `requireRole`, pasang ke semua router (#1, #2).
3. Perbaiki `auth.ts`: `adminReset`, `check-nik`, `setup`, hapus fallback demo di `catch` (#3, #4, #5, #7).
4. Purge git history, rotasi kredensial, paksa reset password seluruh user (#6).
5. Hapus debug router, perbaiki CORS, tambah helmet + rate limit (#8, #9, #10).
6. Sisanya (#11–#15).

**Untuk diverifikasi ulang setelah perbaikan:** jalankan tes bahwa setiap endpoint `/api/*` mengembalikan 401 tanpa token, dan 403 untuk role yang tidak berwenang.
