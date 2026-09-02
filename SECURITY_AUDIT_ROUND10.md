# Audit Ronde 10 — PrepLab-Portal
Tanggal: 2026-09-02 · Scope: verifikasi konfigurasi deploy

---

## ✅ `JWT_SECRET` sudah masuk kedua cloudbuild

```
dbd4758 fix(deploy): include JWT_SECRET in cloudbuild deployment secrets
```

Staging dan production dua-duanya sudah memuat `JWT_SECRET=JWT_SECRET:latest`. Production
(`cloudbuild.yaml`) yang sebelumnya tidak menyetel apa pun kini punya blok `--set-secrets`
eksplisit — konfigurasinya jadi terbaca dari repo, bukan tersembunyi di state service. Itu perbaikan
yang bagus.

Pastikan secret-nya benar-benar ada di Secret Manager sebelum deploy:
```bash
gcloud secrets versions access latest --secret=JWT_SECRET | wc -c    # harus ≥ 32
```

---

# 🔴 STOP SEBELUM DEPLOY: `--set-secrets` akan MENGHAPUS secret lain

`gcloud run deploy --set-secrets` bersifat **replace, bukan merge**. Semua secret yang saat ini
terpasang di service tapi tidak disebut di daftar itu akan **dihapus** dari revisi baru.

Daftar di `cloudbuild.yaml` memuat 6 secret:
`SQL_PASSWORD`, `DATABASE_URL`, `GEMINI_API_KEY`, `SMTP_PASS`, `VAPID_PRIVATE_KEY`, `JWT_SECRET`

Tapi kode ini juga membaca variabel rahasia lain yang **tidak ada di daftar itu**:

| Variabel | Dipakai untuk | Kalau hilang |
|---|---|---|
| `GOOGLE_CLIENT_SECRET` | OAuth Google Drive | Upload lampiran & materi briefing gagal |
| `GOOGLE_REFRESH_TOKEN` | OAuth Google Drive | idem |
| `GOOGLE_CLIENT_ID` | OAuth Google Drive | idem |
| `NOTION_API_KEY` | Integrasi Notion | Fitur Notion mati |
| `FONNTE_TOKEN` | Notifikasi WhatsApp | Notifikasi WA tidak terkirim |
| `SQL_ADMIN_PASSWORD` | Koneksi DB admin | Fitur admin DB gagal |

Semuanya ada di `.env` lokal Anda, jadi jalan di development — dan **kegagalannya baru terlihat
setelah deploy**, saat orang mencoba upload lampiran atau menunggu notifikasi WA yang tidak datang.
Bukan error saat startup, jadi deploy akan terlihat "berhasil".

## Cek dulu, jangan langsung deploy

Lihat apa yang sekarang terpasang di service production:
```bash
gcloud run services describe preplab-portal --region us-central1 \
  --format='value(spec.template.spec.containers[0].env)'
```

- **Kalau muncul `GOOGLE_CLIENT_SECRET`, `NOTION_API_KEY`, `FONNTE_TOKEN`, dll** → daftar
  `--set-secrets` harus dilengkapi dengan semuanya sebelum deploy, kalau tidak fitur-fitur itu mati.
- **Kalau tidak muncul** (mungkin disimpan sebagai env var biasa, bukan secret) → aman; `--set-secrets`
  tidak menyentuh env var biasa. Tetap catat variabelnya supaya tidak hilang di kemudian hari.

Lakukan hal yang sama untuk `preplab-portal-staging`.

**Saran:** uji di staging dulu, lalu buka aplikasinya dan coba satu upload lampiran + picu satu
notifikasi WhatsApp. Kalau dua itu jalan, production aman.

Sekalian rapikan: `cloudbuild.yaml` punya `--set-secrets` tapi tidak punya `--set-env-vars`, sedangkan
staging punya keduanya. Menyamakan pola keduanya membuat konfigurasi production sepenuhnya terbaca
dari repo — dan mencegah kejutan seperti ini terulang.

---

## 🟡 Langkah tes masih belum ada di pipeline

```
$ grep -n "npm test\|test:auth\|TEST_BASE_URL" cloudbuild*.yaml
                                                   ← kosong
```

Tesnya sudah ada dan benar, tapi belum ada yang menjalankannya otomatis. Tambahkan sebagai langkah
terakhir di `cloudbuild-staging.yaml`:
```yaml
  - name: 'node:20-slim'
    entrypoint: bash
    args:
      - '-c'
      - |
        npm install --legacy-peer-deps
        TEST_BASE_URL=https://<url-staging> npm test
```

---

## 🟠 Histori git — belum berubah

`f01b2d7` masih memuat 283 hash password + PII karyawan. Masih satu-satunya kebocoran yang terbuka.

---

## Tahap 3 — belum dikerjakan

Indeks DB masih 4 (`employees.nik` belum terindeks) · Socket.IO `origin: "*"` tanpa `io.use()` ·
token 7 hari tanpa `tokenVersion` · peran dari teks bebas `jabatan` · Drive `type: 'anyone'` di
8 tempat · polling 10/30 detik · admin 5.000 baris tanpa pagination · `recharts` + `chart.js`.

---

## Urutan berikutnya

1. **Cek `gcloud run services describe`** untuk kedua service — pastikan `--set-secrets` tidak menghapus apa pun.
2. Lengkapi daftar secret bila perlu, lalu deploy staging.
3. Verifikasi di staging: log startup bersih, upload lampiran jalan, notifikasi WA jalan, `npm test` hijau.
4. Promote ke production.
5. Purge histori git + paksa reset password.
6. Indeks `employees.nik`, lalu sisa Tahap 3.
