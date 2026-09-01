# Audit Ronde 5 — PrepLab-Portal
Tanggal: 2026-09-01 · Scope: verifikasi perbaikan ronde 4

---

## Hasil

### ✅ Verifikasi tanggal lahir kini wajib

`server/routes/auth.ts` sudah persis seperti yang disarankan:
```ts
if (user.tanggalLahir) {
  if (!tanggalLahir) {
    return res.status(400).json({ status:"error",
      message:"Tanggal lahir wajib diisi untuk verifikasi aktivasi akun." });
  }
  // lalu bandingkan
}
```
Celah "lewati verifikasi dengan tidak mengirim field-nya" sudah tertutup.

`npx tsc --noEmit` → exit 0. Tidak ada regresi.

**Dengan ini seluruh temuan pada lapisan otentikasi sudah bersih.** Tidak ada lagi jalur masuk
tanpa kredensial sah yang saya temukan.

---

## ⚠️ Yang perlu diperhatikan sekarang: semua perbaikan belum di-commit

**Bukti:**
```
$ git log --oneline -1
db19f46 fix(sap): update Button variants to secondary     ← commit terakhir, sebelum audit dimulai

$ git ls-files server/middleware/auth.ts
                                                          ← kosong: file ini belum pernah masuk git

$ git status --short -- server/ src/ server.ts tsconfig.json package.json | wc -l
119
```

Seluruh hasil kerja empat ronde — `middleware/auth.ts`, guard terpusat, perbaikan `/setup`,
`compression()`, `tsconfig.json` — masih berupa perubahan di working tree, **belum ada satu pun
yang di-commit**.

Artinya: perbaikan ini belum ter-deploy, dan belum terlindungi. Satu `git checkout` yang tidak
sengaja, atau satu operasi yang salah, menghapus semuanya.

**Lakukan sekarang, sebelum apa pun:**
```bash
git add -A
git commit -m "fix(security): centralized auth guard, JWT hardening, setup account-takeover fix"
git push
```
Lalu deploy dan jalankan daftar verifikasi di bawah terhadap staging.

---

## Belum dikerjakan (tidak berubah sejak ronde 4)

**Prioritas tertinggi yang tersisa:**
- **Histori git masih memuat 283 hash password** — `git log --all -- database_backup.json` masih menunjuk `f01b2d7`. Sekarang ini satu-satunya risiko terbuka berkategori tinggi. Purge dengan `git filter-repo`, force-push, lalu paksa reset password seluruh user. *(Kerjakan setelah commit di atas, bukan sebelumnya.)*

**Tahap 3, sesuai rencana:**
- Indeks DB — masih 4. Yang ada: `idx_roster_nik_date`, `idx_roster_date`, `idx_notifications_user_id`, `idx_bulletin_comments_post_id`. **`employees.nik` masih belum terindeks** meski jadi kunci lookup setiap login.
- Socket.IO — `cors: { origin: "*" }`, `io.use()` masih nol.
- Token 7 hari, belum ada `tokenVersion`.
- Peran dari teks bebas `jabatan`/`section`.
- Drive `type: 'anyone'` di 8 tempat; `/api/drive/view` publik tanpa validasi `fileId`.
- Polling 10 detik & 30 detik tanpa `visibilitychange`.
- Admin 5.000 baris tanpa pagination.
- `recharts` + `chart.js` berdampingan; `xlsx` diimpor statis.

---

## Daftar verifikasi setelah deploy

- `POST /api/auth/setup` NIK akun aktif → 403 `ACCOUNT_ALREADY_ACTIVE`
- `POST /api/auth/setup` tanpa `tanggalLahir` → 400
- `POST /api/auth/setup` `tanggalLahir` salah → 400
- `curl /api/employees` tanpa token → 401
- `curl /api/debug/db-info` di production → 404
- Login `DEMO123` di production → ditolak
- Server production tanpa `JWT_SECRET` → gagal start
- Lighthouse mobile (Slow 4G) — ukur sekarang, kompresi & cache header sudah aktif
