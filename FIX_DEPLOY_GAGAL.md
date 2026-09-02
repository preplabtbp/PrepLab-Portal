# Instruksi Perbaikan: Deploy Cloud Run Gagal Start

Konteks untuk Antigravity. Deploy `preplab-portal` (us-central1) gagal dengan:

> The user-provided container failed to start and listen on the port defined by the PORT=8080
> environment variable within the allocated timeout.

Revisi lama masih melayani traffic, jadi aplikasi tidak down. Tapi seluruh perbaikan security
belum aktif di production.

---

## Akar masalah

`server.ts:12` memanggil `validateEnv()` di level modul — sebelum express dibuat, sebelum
`listen()`. Fungsi itu di `server/config/env.ts` melempar error kalau `JWT_SECRET` tidak ada atau
kurang dari 32 karakter di production:

```ts
if (!env.JWT_SECRET || (NODE_ENV === 'production' && env.JWT_SECRET.length < 32)) {
  missing.push("JWT_SECRET (must be >= 32 characters in production)");
}
if (missing.length > 0) throw new Error(...);   // ← proses mati di sini
```

Proses keluar sebelum sempat listen → Cloud Run melaporkan "failed to start and listen on port".

**Kenapa `JWT_SECRET` tidak sampai ke container**, padahal sudah ditambahkan ke `cloudbuild.yaml`:

```json
"deploy:main": "... gcloud run deploy preplab-portal --source . --region us-central1"
```

`gcloud run deploy --source .` **tidak membaca `cloudbuild.yaml`** — ia memakai buildpack otomatis.
Blok `--set-secrets` yang ditambahkan di ronde sebelumnya tidak pernah diterapkan. Di repo ini juga
tidak ada `.github/workflows` maupun Cloud Build trigger yang memakai file itu.

### Yang sudah disingkirkan sebagai penyebab
- **PORT** — sudah benar: `Number(process.env.PORT) || 3000` dan `listen(PORT, "0.0.0.0")`.
- **Cloud SQL sempat stopped** — `initDbSchema()` dipanggil dengan `.catch()` non-blocking, jadi DB mati tidak menahan `listen()`.
- **Startup blocking** — tidak ada `await` yang menggantung sebelum `listen()`; `initRosterCron()` hanya mendaftarkan jadwal cron.

---

## Langkah 1 — dijalankan manual oleh user (bukan Antigravity)

Perlu akses gcloud. Jalankan berurutan:

```bash
# a. Pastikan secret ada dan panjangnya cukup
gcloud secrets versions access latest --secret=JWT_SECRET | wc -c     # harus >= 32

# b. Kalau belum ada, buat:
openssl rand -base64 48 | gcloud secrets create JWT_SECRET --data-file=-

# c. Pasang ke service production
gcloud run services update preplab-portal --region us-central1 \
  --update-secrets JWT_SECRET=JWT_SECRET:latest

# d. Sama untuk staging
gcloud run services update preplab-portal-staging --region asia-southeast2 \
  --update-secrets JWT_SECRET=JWT_SECRET:latest
```

**PENTING — pakai `--update-secrets`, JANGAN `--set-secrets`.**
`--set-secrets` mengganti seluruh daftar secret dan akan **menghapus** yang tidak disebut.
Kode ini membaca `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `NOTION_API_KEY`, `FONNTE_TOKEN`,
`SQL_ADMIN_PASSWORD` — kalau terhapus, upload Drive / Notion / notifikasi WhatsApp mati diam-diam
(tanpa error saat startup).

Cek isi konfigurasi service saat ini sebelum mengubah apa pun:
```bash
gcloud run services describe preplab-portal --region us-central1 \
  --format='value(spec.template.spec.containers[0].env)'
```

---

## Langkah 2 — untuk Antigravity: samakan jalur deploy dengan konfigurasi

Masalah utamanya: ada dua jalur deploy yang tidak sinkron. `cloudbuild.yaml` berisi konfigurasi
lengkap tapi tidak pernah dieksekusi; `npm run deploy:main` yang benar-benar dipakai tidak membawa
konfigurasi apa pun.

**Pilih salah satu — jangan biarkan keduanya berbeda.**

### Opsi A (disarankan, perubahan paling kecil): perbaiki script deploy

Ubah `package.json` agar script deploy membawa secret secara eksplisit:

```json
"deploy:staging": "npm run build && gcloud run deploy preplab-portal-staging --source . --region asia-southeast2 --update-secrets JWT_SECRET=JWT_SECRET:latest",
"deploy:main": "npm run build && gcloud run deploy preplab-portal --source . --region us-central1 --update-secrets JWT_SECRET=JWT_SECRET:latest"
```

Tetap `--update-secrets` (menambah), bukan `--set-secrets` (mengganti).

Lalu beri catatan di `cloudbuild.yaml` dan `cloudbuild-staging.yaml` bahwa file itu hanya dipakai
bila Cloud Build trigger diaktifkan — supaya tidak menyesatkan orang berikutnya.

### Opsi B: aktifkan Cloud Build trigger dan hentikan script deploy manual

Kalau memilih ini, hapus `deploy:main` / `deploy:staging` dari `package.json` agar tidak ada yang
tanpa sengaja deploy melewati pipeline. Perlu setup trigger di Console — di luar jangkauan perubahan kode.

---

## Langkah 3 — untuk Antigravity: perjelas pesan gagal start

Saat ini kalau env kurang, log hanya berisi stack trace `Error:` mentah, dan gejalanya di Cloud Run
tampak seperti masalah port — menyesatkan. Buat penyebabnya terbaca jelas di log.

Di `server.ts`, ganti pemanggilan `validateEnv()` (baris 12) menjadi:

```ts
try {
  validateEnv();
} catch (e: any) {
  console.error('❌ STARTUP GAGAL — konfigurasi environment tidak lengkap:');
  console.error(`   ${e.message}`);
  console.error('   Container akan berhenti. Periksa --set-secrets / --update-secrets di Cloud Run.');
  process.exit(1);
}
```

Ini tidak mengubah perilaku (tetap berhenti), hanya membuat penyebabnya langsung terlihat di
Cloud Logging tanpa perlu membaca stack trace.

---

## Langkah 4 — untuk Antigravity: pasang tes ke pipeline

Belum dikerjakan dari ronde sebelumnya. Tambahkan langkah terakhir di `cloudbuild-staging.yaml`:

```yaml
  - name: 'node:20-slim'
    entrypoint: bash
    args:
      - '-c'
      - |
        npm install --legacy-peer-deps
        TEST_BASE_URL=https://<url-staging> npm test
```

Hanya relevan kalau memilih Opsi B. Kalau Opsi A, jalankan `TEST_BASE_URL=... npm test` manual
setelah tiap deploy staging.

---

## Verifikasi setelah deploy berhasil

```bash
# Startup bersih — tidak ada MISSING OR INVALID REQUIRED ENVIRONMENT VARIABLES
gcloud run services logs read preplab-portal --region us-central1 --limit 50

# Guard autentikasi aktif
curl -i https://preplab-portal-1034501170626.us-central1.run.app/api/employees    # harus 401
curl -i https://preplab-portal-1034501170626.us-central1.run.app/api/tickets      # harus 401
curl -i https://preplab-portal-1034501170626.us-central1.run.app/api/debug/db-info # harus 404

# Endpoint publik tetap jalan
curl -i https://preplab-portal-1034501170626.us-central1.run.app/api/health        # harus 200
```

Lalu buka aplikasinya dan uji dua hal yang paling rentan putus kalau secret hilang:
1. **Upload lampiran** di bulletin (butuh `GOOGLE_CLIENT_SECRET` + `GOOGLE_REFRESH_TOKEN`)
2. **Notifikasi WhatsApp** (butuh `FONNTE_TOKEN`)

Kalau dua itu jalan dan curl di atas sesuai, deploy sehat.

---

## Sisa pekerjaan (belum tersentuh)

- **Purge histori git** — `f01b2d7` masih memuat 283 hash password + PII karyawan. Risiko terbuka tertinggi yang tersisa.
- Indeks `employees.nik` (kunci lookup setiap login, belum terindeks).
- Socket.IO `cors: origin "*"` tanpa `io.use()`.
- Token 7 hari tanpa `tokenVersion`.
- Peran admin dari teks bebas `jabatan`/`section`.
- Drive `type: 'anyone'` di 8 tempat.
- Polling 10 dtk & 30 dtk tanpa `visibilitychange`.
- Admin 5.000 baris tanpa pagination.
