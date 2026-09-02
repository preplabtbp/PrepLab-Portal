# Audit Ronde 8 — PrepLab-Portal
Tanggal: 2026-09-02 · Scope: verifikasi pemulihan guard autentikasi

---

## ✅ Regresi sudah dipulihkan dan ter-commit

```
c28aba0 fix(security): restore centralized API requireAuth guard and update changelog v2.8.6
```

Guard kembali ada di `server.ts:341–358`, dengan penempatan yang benar:

| Baris | Isi |
|---|---|
| 333 | `app.use("/api", apiGeneralLimiter)` |
| **351** | **guard `requireAuth` terpusat** |
| 361 | mounting router pertama (`/api/auth`) |

Implementasinya tepat — pakai `originalUrl`, buang query string, pencocokan exact atau prefix + `/`
(bukan `startsWith` longgar yang bisa ditembus lewat path seperti `/api/healthXYZ`).

Kali ini juga **sudah ter-commit** — `git status` bersih, jadi tidak bisa hilang lagi seperti kemarin.

Verifikasi lain: `tsc --noEmit` exit 0; `ACCOUNT_ALREADY_ACTIVE` di `/setup` utuh; `compression()`
aktif; `requireRole` di `admin.ts` utuh; `debugRouter` masih di balik guard `NODE_ENV !== 'production'`.

**Seluruh temuan P0 sekarang tertutup dan tersimpan di git.**

---

## ⚠️ Tes CI untuk guard belum ada

```
$ ls test/ tests/ __tests__/
                    ← tidak ada
```

Regresi kemarin terjadi karena `server.ts` ditulis ulang oleh agent dan guard-nya ikut terhapus —
tidak ada yang menangkapnya kecuali pembacaan kode manual. Selama belum ada tes, hal yang sama bisa
terulang pada perubahan `server.ts` berikutnya, dan mungkin tidak ketahuan sampai audit berikutnya.

Ini satu file, dan menurut saya nilainya lebih besar daripada sisa item Tahap 3 mana pun:

```ts
// test/auth-guard.test.ts
import request from 'supertest';

const PROTECTED = ['/api/employees', '/api/tickets', '/api/roster',
                   '/api/inspections', '/api/notifications', '/api/admin/tables'];

describe('guard autentikasi terpusat', () => {
  for (const path of PROTECTED) {
    it(`${path} menolak akses tanpa token`, async () => {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
    });
  }
  it('/api/auth/check-nik tetap publik', async () => {
    const res = await request(app).post('/api/auth/check-nik').send({ nik: 'X' });
    expect(res.status).not.toBe(401);
  });
});
```

Jalankan di CI sebelum deploy.

---

## 🟠 Sisa risiko tertinggi: histori git

Tidak berubah:
```
$ git log --oneline --all -- database_backup.json
3f3323f  ← penghapusan
f01b2d7  ← masih memuat 283 hash password + PII karyawan
```

Sekarang seluruh jalur masuk lewat aplikasi sudah tertutup, jadi **ini satu-satunya kebocoran yang
masih terbuka** — dan bentuknya bukan celah yang bisa ditambal dengan kode, melainkan data yang
sudah terlanjur ada di repo.

```bash
git filter-repo --path database_backup.json --path db_backups --path cookies.txt --invert-paths
git push --force
```
Semua kolaborator re-clone. Lalu paksa reset password seluruh user.

Waktunya tepat sekarang: semua pekerjaan sudah ter-commit dan ter-push, jadi menulis ulang histori
tidak berisiko menghilangkan apa pun.

---

## Tahap 3 — belum dikerjakan (tidak berubah)

- **Indeks DB** — masih 4; `employees.nik` belum terindeks meski jadi kunci lookup setiap login. Paling cepat terasa saat data bertambah.
- **Socket.IO** — `cors: { origin: "*" }`, `io.use()` masih nol.
- **Token 7 hari**, belum ada `tokenVersion` — logout & reset password tidak membatalkan token lama.
- **Peran dari teks bebas** `jabatan`/`section`.
- **Drive `type: 'anyone'`** di 8 tempat; `/api/drive/view` publik tanpa validasi `fileId`.
- **Polling** 10 dtk & 30 dtk tanpa `visibilitychange`.
- **Admin 5.000 baris** tanpa pagination.
- **`recharts` + `chart.js`** berdampingan; `xlsx` diimpor statis.

---

## Urutan berikutnya

1. Tes CI untuk guard autentikasi.
2. Purge histori git + paksa reset password.
3. Indeks `employees.nik`.
4. Sisa Tahap 3.

## Verifikasi setelah deploy

```bash
curl -i https://<staging>/api/employees     # 401
curl -i https://<staging>/api/tickets       # 401
curl -i https://<staging>/api/admin/tables  # 401
curl -i https://<staging>/api/debug/db-info # 404
curl -i -X POST https://<staging>/api/auth/check-nik -d '{"nik":"X"}' -H 'Content-Type: application/json'   # bukan 401
```
