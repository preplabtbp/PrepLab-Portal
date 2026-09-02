# Audit Ronde 7 — PrepLab-Portal
Tanggal: 2026-09-01 · Scope: verifikasi setelah commit normalisasi line-ending

---

# 🔴 REGRESI KRITIS: guard autentikasi terpusat HILANG dari `server.ts`

Ini temuan paling penting di seluruh audit. Harus diperbaiki sebelum deploy.

## Bukti

Pada ronde 3 dan 4 saya memverifikasi blok ini ada di `server.ts:341–361`:
```ts
const PUBLIC_API_PREFIXES = ['/api/auth/login', '/api/auth/check-nik', ...];
app.use('/api', (req, res, next) => {
  const isPublic = PUBLIC_API_PREFIXES.some(...);
  if (isPublic) return next();
  return requireAuth(req, res, next);
});
```

Sekarang blok itu **tidak ada**:
```
$ grep -n "PUBLIC_API\|requireAuth\|compression" server.ts
7:import compression from "compression";
13:import { requireAuth } from "./server/middleware/auth.js";     ← diimpor
303:  app.use(compression());
                                                     ← tidak pernah dipakai
```
`requireAuth` diimpor tapi tidak pernah dipanggil di `server.ts`. Di antara baris 333 (rate limiter)
dan 341 (mounting router) sekarang langsung kosong.

Dan blok itu **tidak pernah ikut ter-commit**:
```
$ git show 3f3323f:server.ts | grep PUBLIC_API_PREFIXES
                                            ← kosong
$ git log -S "PUBLIC_API_PREFIXES" -- server.ts
                                            ← tidak ada commit yang pernah memuatnya
```

Jadi guard itu ada di working tree saat saya periksa, lalu hilang sebelum commit `3f3323f` dibuat.
Kemungkinan besar tertimpa saat Antigravity menulis ulang `server.ts` untuk perbaikan lain.

## Dampak

Sisa proteksi yang masih berdiri hanya dua:
```
server/routes/admin.ts:23   router.use("/api/admin", requireAuth, requireRole([...]))   ✅
server/routes/auth.ts:186   /me         requireAuth                                     ✅
server/routes/auth.ts:214   /update-username  requireAuth                               ✅
```

**Semua router lain kembali terbuka untuk anonim**, persis seperti kondisi audit ronde 1:

`/api/employees` · `/api/tickets` · `/api/roster` · `/api/inspections` · `/api/bulletin` ·
`/api/notifications` · `/api/quiz` · `/api/p5m` · `/api/apd` · `/api/cloud` · `/api/agenda` ·
`/api/feedback` · `/api/workorders` · seluruh isi `misc.ts`

Termasuk 12 endpoint `DELETE` di dalamnya. Data karyawan lengkap bisa di-dump tanpa login lewat
`/api/employees`.

Perbaikan P0 lain (JWT, DEMO, `/setup`) tetap utuh dan tetap berharga — tapi lubang terbesarnya
terbuka lagi.

## Perbaikan

Kembalikan blok ini di `server.ts`, **setelah** `app.use("/api", apiGeneralLimiter)` (baris 333)
dan **sebelum** mounting router pertama (baris 341):

```ts
  // Centralized API Authentication Guard (P0)
  const PUBLIC_API_PREFIXES = [
    '/api/auth/login',
    '/api/auth/check-nik',
    '/api/auth/setup',
    '/api/auth/reset-password',
    '/api/health',
    '/api/drive/view'
  ];

  app.use('/api', (req, res, next) => {
    const url = req.originalUrl.split('?')[0];
    const isPublic = PUBLIC_API_PREFIXES.some(p => url === p || url.startsWith(p + '/'));
    if (isPublic) return next();
    return requireAuth(req, res, next);
  });
```

## Cara mencegah ini terulang

Regresi ini lolos karena tidak ada yang mengetesnya — hanya ketahuan lewat pembacaan kode. Guard
seperti ini gampang tertimpa saat file besar ditulis ulang oleh agent.

Tambahkan satu tes yang gagal kalau guard hilang:
```ts
// test/auth-guard.test.ts
const PROTECTED = ['/api/employees', '/api/tickets', '/api/roster',
                   '/api/inspections', '/api/notifications', '/api/admin/tables'];
for (const path of PROTECTED) {
  it(`${path} menolak akses tanpa token`, async () => {
    const res = await request(app).get(path);
    expect(res.status).toBe(401);
  });
}
```
Jalankan di CI. Ini jauh lebih murah daripada audit manual berulang.

---

## ✅ Yang sudah benar

- **Line-ending dinormalisasi.** `.gitattributes` dibuat dengan cakupan yang baik (teks + daftar biner lengkap), commit `ab96210`, dan `git status` kini **bersih** — 0 file modified. Ini membuat regresi berikutnya jauh lebih mudah terlihat.
- **`tsc --noEmit` → exit 0.** Tidak ada error tipe.
- **Perbaikan P0 lain utuh:** guard `ACCOUNT_ALREADY_ACTIVE` di `/setup` ada; `compression()` aktif; `JWT_SECRET` terpusat dengan `validateEnv()`; DEMO tidak lagi superadmin; `debugRouter` di balik `NODE_ENV`; `/api/admin` terlindungi `requireAuth` + `requireRole`.

---

## 🟠 Histori git — belum berubah

```
$ git log --oneline --all -- database_backup.json db_backups cookies.txt
3f3323f  ← penghapusan
f01b2d7  ← masih memuat 283 hash password + PII
```
`git filter-repo --path database_backup.json --path db_backups --path cookies.txt --invert-paths`,
force-push, semua kolaborator re-clone, lalu paksa reset password seluruh user.

---

## Urutan berikutnya

1. **Kembalikan guard autentikasi terpusat** — sebelum deploy apa pun.
2. Tambahkan tes CI untuk guard tersebut.
3. Purge histori git + paksa reset password.
4. Indeks `employees.nik`, lalu sisa Tahap 3 (Socket.IO, `tokenVersion`, polling, pagination, chunk).

## Verifikasi wajib sebelum deploy

```bash
curl -i https://<staging>/api/employees          # harus 401
curl -i https://<staging>/api/tickets            # harus 401
curl -i https://<staging>/api/roster             # harus 401
curl -i https://<staging>/api/admin/tables       # harus 401
curl -i https://<staging>/api/auth/check-nik -X POST ...   # harus 200 (allowlist)
```
Kalau `/api/employees` membalas 200 berisi data, guard belum kembali.
