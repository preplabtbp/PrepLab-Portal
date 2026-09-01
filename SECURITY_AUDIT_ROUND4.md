# Audit Ronde 4 — PrepLab-Portal
Tanggal: 2026-09-01 · Scope: verifikasi perbaikan ronde 3
Metode: review kode statis + `tsc --noEmit`. Belum diverifikasi terhadap instance production yang berjalan.

---

## Ringkasan

**Semua P0 sudah tertutup.** Tidak ada lagi jalur yang saya temukan untuk mendapatkan akses admin
atau mengambil alih akun tanpa kredensial yang sah.

Dua P1 dari ronde 3 juga selesai. Sisanya adalah item Tahap 3 yang memang belum dijadwalkan.

---

## Terverifikasi selesai

### 🔴→✅ `/setup` tidak bisa lagi mengambil alih akun aktif

`server/routes/auth.ts` sekarang memuat:
```ts
if (user.firstLoginComplete) {
  return res.status(403).json({ status:"error", code:"ACCOUNT_ALREADY_ACTIVE", ... });
}
```
Ditambah verifikasi tanggal lahir sebagai faktor kedua. Jalur `POST /api/auth/setup` dengan NIK admin
yang tertulis di source code kini ditolak. Endpoint ini juga sudah berada di bawah `authRateLimiter`.

### 🟠→✅ Typecheck pulih sepenuhnya

`tsconfig.json` kini punya `include` (`src`, `server`, `server.ts`, `vite.config.ts`, `google-services.ts`)
dan `exclude` (`node_modules`, `dist`, `scripts`, `**/*.backup.ts`, `archive`, `public`).

Hasilnya:
```
$ npx tsc --noEmit
$ echo $?
0
```
Selesai dengan heap default — tidak lagi OOM. Dan **10 error tipe di kode live sudah nol**: prop `size`
pada `Button`, `.vibe`/`.tag` di `CommunityQuoteItem`, prop modal, dan `weekly-inspection-screen.tsx`
semuanya beres. Jaring pengaman tipe sudah aktif kembali — ini yang akan mencegah kelas bug seperti
prop yang diam-diam diabaikan.

### 🔵 `.gcloudignore` diperluas

Dari 3 baris jadi mengecualikan `*.xlsx`, `*.csv`, `sheet.html`, `scratch_prompt.txt`, `db_backups/`,
`scratch/`, dsb. Build context untuk `gcloud run deploy` turun beberapa MB.

---

## Sisa temuan

### 🟡 Verifikasi tanggal lahir bisa dilewati dengan tidak mengirimkannya

**Bukti:** `auth.ts`
```ts
if (user.tanggalLahir && tanggalLahir) {   // ⬅ hanya jalan kalau klien mengirim field-nya
  ... bandingkan ...
}
```
Kalau penyerang cukup **tidak menyertakan** `tanggalLahir` di body, seluruh blok dilewati dan aktivasi
tetap lolos.

Dampaknya sekarang terbatas — hanya berlaku untuk akun yang **belum pernah** diaktivasi, karena guard
`firstLoginComplete` sudah menutup akun aktif. Jadi ini bukan lagi pengambilalihan akun, melainkan
"aktivasi akun orang lain sebelum mereka sempat". Tetap layak ditutup.

**Perbaikan:** jadikan `tanggalLahir` wajib ketika database memilikinya:
```ts
if (user.tanggalLahir) {
  if (!tanggalLahir) return res.status(400).json({ status:"error",
    message:"Tanggal lahir wajib diisi untuk aktivasi akun" });
  // lalu bandingkan seperti sekarang
}
```

### 🟠 Histori git masih memuat 283 hash password

Belum berubah — `git log --all -- database_backup.json` masih menunjuk commit `f01b2d7`.
Ini sekarang menjadi risiko terbuka terbesar yang tersisa, karena semua jalur masuk lewat aplikasi
sudah ditutup: yang tersisa justru data yang bocor lewat repo.

`git filter-repo --path database_backup.json --path db_backups --path cookies.txt --invert-paths`,
force-push, semua kolaborator re-clone, lalu paksa reset password seluruh user.

### 🟡 Belum dikerjakan (Tahap 3 — sesuai rencana)

Status faktual, bukan temuan baru:

- **Socket.IO** — `cors: { origin: "*" }`, `io.use()` masih nol.
- **Indeks DB** — masih 4 untuk 33 tabel; `employees.nik` belum terindeks.
- **Token 7 hari** — `TOKEN_EXPIRY = '7d'`, belum ada `tokenVersion`; logout/reset password tidak membatalkan token lama.
- **Peran dari teks bebas** — `jabatan` yang mengandung `admin`/`manager`/`superintendent` masih otomatis admin.
- **Drive `type: 'anyone'`** — masih 8 tempat; `/api/drive/view` masih di allowlist publik tanpa validasi `fileId`.
- **Polling** — 10 detik dan 30 detik, masih tanpa `visibilitychange`.
- **Admin 5.000 baris** — belum ada pagination.
- **`recharts` + `chart.js`** masih berdampingan; `xlsx` masih diimpor statis di 2 komponen.
- **302 skrip di root** — sudah tidak mengganggu typecheck (tertutup `exclude`), tapi masih menyulitkan navigasi kode.

---

## Catatan verifikasi

`npm run build` tidak bisa saya jalankan dari sini: `node_modules` di folder ini terpasang dari Windows
(hanya ada `@rollup/rollup-win32-*`), sedangkan saya menjalankannya dari Linux. **Ini bukan masalah pada
kode Anda** — build di mesin Anda dan di Cloud Build tidak terpengaruh. Yang bisa saya verifikasi penuh
adalah typecheck, dan itu lolos bersih.

---

## Saran urutan berikutnya

1. **Purge histori git + paksa reset password** — sekarang ini risiko terbuka nomor satu.
2. Wajibkan `tanggalLahir` di `/setup` (beberapa baris).
3. Indeks DB, `employees.nik` duluan — ini yang akan paling terasa saat data bertambah.
4. Auth Socket.IO + batasi CORS.
5. `tokenVersion` + masa berlaku token lebih pendek.
6. Polling, pagination, chunk, avatar.

## Verifikasi setelah deploy

- `POST /api/auth/setup` dengan NIK akun aktif → 403 `ACCOUNT_ALREADY_ACTIVE`.
- `POST /api/auth/setup` tanpa field `tanggalLahir` → harus 400 setelah perbaikan #2.
- `curl` `/api/*` tanpa token → 401 (kecuali 6 path allowlist).
- Server production tanpa `JWT_SECRET` → gagal start.
- Lighthouse mobile (Slow 4G) — ukur sekarang; kompresi + cache header sudah aktif sejak ronde 3.
