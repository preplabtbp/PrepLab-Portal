# Prep & Lab All in One Portal

> [!WARNING]
> **PEMBERITAHUAN MIGRASI AKUN HOSTING GCP:**
> Akun hosting Google Cloud telah berganti ke project resmi: **`project-1bcc4549-c8d6-4962-958`**.
> - **Project lama (`project-054e3351-b8d1-42f7-9c8` / "My First Project") sudah tidak aktif/ditinggalkan.**
> - Skrip `npm run deploy:main` dan `npm run deploy:staging` di `package.json` sudah dikunci secara default ke `project-1bcc4549-c8d6-4962-958`.
> - Untuk mengaktifkan build otomatis saat push `main`, hubungkan trigger di Google Cloud Console:
>   `https://console.cloud.google.com/cloud-build/triggers?project=project-1bcc4549-c8d6-4962-958`

## Migrasi ke Google Cloud Run

Aplikasi ini menggunakan database PostgreSQL (Cloud SQL) yang dikelola oleh AI Studio selama tahap pengembangan. Ketika Anda mengekspor (Download ZIP) aplikasi ini untuk di-deploy ke project Google Cloud Run Anda sendiri, **database tidak ikut diekspor**.

Agar aplikasi dapat berjalan lancar di Cloud Run Anda tanpa error `500 (Internal Server Error)`, Anda harus:

1. **Menyiapkan Database PostgreSQL**
   Anda bisa menggunakan Google Cloud SQL, Supabase, Neon, atau database PostgreSQL lainnya.
   
2. **Mengatur Environment Variables**
   Pada pengaturan Cloud Run Anda (bagian *Variables & Secrets*), tambahkan variabel berikut:
   - `SQL_HOST`: Host dari database PostgreSQL Anda
   - `SQL_USER`: Username database
   - `SQL_PASSWORD`: Password database
   - `SQL_DB_NAME`: Nama database
   
3. **Migrasi Schema Database**
   Setelah database siap dan terhubung, Anda perlu menjalankan migrasi schema untuk membuat tabel-tabel yang diperlukan:
   Jalankan command ini di lokal Anda dengan koneksi ke database baru:
   ```bash
   npm run build
   npx drizzle-kit push
   ```
   Atau jika Anda menggunakan database kosong, aplikasi secara otomatis tidak akan error di frontend (akan menampilkan data kosong berkat patch perbaikan), tetapi Anda tetap harus membuat tabelnya agar bisa menyimpan data.

## Catatan Tentang File-File Sampah
File-file `.cjs`, `.js`, `.py`, dan `.ts` yang tidak perlu (seperti patch, test, debug script) yang membuat berantakan pada hasil ekspor ZIP sebelumnya telah dibersihkan agar hasil ekspor lebih rapi dan seamless.

## Backup dan Restore Database
Karena besarnya data, backup database Anda telah dipecah menjadi beberapa file JSON dan disimpan di dalam folder **`db_backups/`** agar tidak corrupt atau terpotong saat didownload (Unterminated string in JSON).

Untuk melakukan restore data ke database PostgreSQL Anda yang baru:

1. Pastikan Anda sudah menyiapkan database baru dan mengisi konfigurasi `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DB_NAME` di environment (atau file `.env`).
2. Jalankan migrasi schema agar tabel-tabel terbuat:
   ```bash
   npx drizzle-kit push
   ```
3. Jalankan script restore untuk membaca seluruh file dari folder `db_backups/` dan memasukkan data lama (termasuk jadwal Roster, WO, tiket, dll):
   ```bash
   npx tsx restore_db.ts
   ```
   *Script ini akan memproses file-file pecahan JSON secara berurutan dan memasukkan data secara bertahap untuk mencegah error batas parameter pada PostgreSQL.*

Dengan cara ini, Anda tidak kehilangan data saat berpindah dari database AI Studio ke database Cloud Run Anda sendiri!
