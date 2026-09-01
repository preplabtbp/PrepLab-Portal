# Audit Ronde 6 — PrepLab-Portal
Tanggal: 2026-09-01 · Scope: verifikasi commit perbaikan security

---

## ✅ Perbaikan sudah ter-commit

```
3f3323f fix(security): enterprise JWT hardening, centralized RBAC,
        setup takeover fix, typecheck & performance optimization
```

- `server/middleware/auth.ts` kini terlacak git (sebelumnya belum pernah masuk).
- Commit yang sama juga **menghapus** `database_backup.json`, `cookies.txt`, dan seluruh `db_backups/`
  dari working tree.

Empat ronde perbaikan sudah aman dari kehilangan. Langkah berikutnya: deploy ke staging dan jalankan
daftar verifikasi di bawah.

---

## 📋 111 file "modified" itu bukan perubahan kode

`git status` menampilkan 111 file `M` setelah commit. Ini **bukan** pekerjaan yang tertinggal:

```
$ git diff --numstat -- server/routes/
151  151  server/routes/agenda.ts      ← insertion = deletion, persis sama
474  474  server/routes/bulletin.ts
 60   60  server/routes/apd.ts

$ git diff --ignore-cr-at-eol --stat -- server/ src/
                                         ← kosong: isi kode identik
```

Seluruhnya perbedaan line-ending CRLF ↔ LF. Isi kodenya identik.

**Kenapa perlu diperbaiki:** selama ini terjadi, `git status` jadi tidak berguna (selalu penuh),
setiap diff dan code review menampilkan seluruh file sebagai berubah, dan konflik merge akan muncul
di tempat yang tidak ada perubahan nyata.

**Perbaikan:** buat `.gitattributes` di root:
```
* text=auto eol=lf
*.png binary
*.jpg binary
*.xlsx binary
*.pdf binary
```
lalu normalisasi sekali:
```bash
git add --renormalize .
git commit -m "chore: normalize line endings to LF"
```
Setelah itu `git status` akan bersih. (`.gitattributes` belum ada, dan `core.autocrlf` belum diset —
itu sebabnya ini terjadi.)

---

## 🟠 Sisa risiko tertinggi: histori git

Commit `3f3323f` menghapus file backup dari working tree, **tapi isinya masih ada di histori**:

```
$ git log --oneline --all -- database_backup.json db_backups cookies.txt
3f3323f  ← penghapusan
f01b2d7  ← Initial commit, masih memuat 283 hash password + PII karyawan
```

`git checkout f01b2d7 -- database_backup.json` masih mengembalikannya utuh.

**Perbaikan:**
```bash
git filter-repo --path database_backup.json --path db_backups \
                --path cookies.txt --invert-paths
git push --force
```
Semua kolaborator wajib re-clone setelahnya. Lalu paksa reset password seluruh user — anggap
283 hash itu sudah bocor.

*Catatan urutan:* kerjakan ini **setelah** commit di atas ter-push dan ter-deploy dengan aman.
Menulis ulang histori saat masih ada pekerjaan yang belum tersimpan berisiko kehilangan.

---

## Belum dikerjakan (Tahap 3, tidak berubah)

- Indeks DB — masih 4; **`employees.nik` belum terindeks** meski jadi kunci lookup setiap login. Ini yang paling cepat terasa saat data bertambah.
- Socket.IO — `cors: { origin: "*" }`, `io.use()` nol.
- Token 7 hari, belum ada `tokenVersion`.
- Peran dari teks bebas `jabatan`/`section`.
- Drive `type: 'anyone'` di 8 tempat; `/api/drive/view` publik tanpa validasi `fileId`.
- Polling 10 dtk & 30 dtk tanpa `visibilitychange`.
- Admin 5.000 baris tanpa pagination.
- `recharts` + `chart.js` berdampingan; `xlsx` diimpor statis.

---

## Daftar verifikasi setelah deploy

- `POST /api/auth/setup` NIK akun aktif → 403 `ACCOUNT_ALREADY_ACTIVE`
- `POST /api/auth/setup` tanpa `tanggalLahir` → 400
- `curl /api/employees` tanpa token → 401
- `curl /api/debug/db-info` di production → 404
- Login `DEMO123` di production → ditolak
- Server production tanpa `JWT_SECRET` → gagal start
- Lighthouse mobile (Slow 4G) — ukur sekarang
