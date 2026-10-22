# Deployment & Git Push Policy (STRICT INVIOLABLE RULES)

## 🚨 1. ATURAN MUTLAK: DILARANG GIT PUSH KE BRANCH MANAPUN TANPA PERINTAH EKSPLISIT
* **BERLAKU UNTUK SEMUA BRANCH (`main`, `staging`, `PC-Alvin`, dsb.)**:
  * **JANGAN PERNAH** menjalankan perintah `git push` ke branch manapun (baik `origin main`, `origin staging`, `origin PC-Alvin`, dsb.) KECUALI user secara tegas dan eksplisit meminta perintah push (contoh: *"push"*, *"push ke main"*, *"push ke PC-Alvin"*).
  * Menyelesaikan suatu fitur, memperbaiki bug, atau menyelesaikan coding task **BUKAN** alasan untuk otomatis melakukan `git push`. Pekerjaan cukup diselesaikan dan divalidasi secara lokal.
  * Jika user belum memberikan perintah eksplisit untuk push, simpan perubahan secara lokal saja dan jangan pernah kirim ke remote repository.

## 🚨 2. ATURAN MUTLAK: DILARANG CLOUD BUILD & DEPLOY TANPA PERINTAH EKSPLISIT
* **DILARANG OTOMATIS RUN BUILD & DEPLOYMENT**:
  * **JANGAN PERNAH** menjalankan perintah deployment atau trigger build ke Google Cloud / server produksi (seperti `gcloud run deploy`, `gcloud builds submit`, `npm run deploy:main`, `npm run deploy:staging`, `docker build`, dsb.) KECUALI user secara eksplisit meminta: *"deploy"*, *"build dan deploy"*, atau perintah rilis sejenis.
  * Validasi pekerjaan cukup menggunakan verifikasi lokal:
    * `npm run lint` (`tsc --noEmit`) untuk validasi type safety.
    * Pemeriksaan file lokal / pengujian lokal.
  * Setelah validasi lokal berhasil, segera laporkan hasil kepada user dan tanyakan apakah ingin di-push atau di-deploy. Jangan pernah mendahului instruksi user.

## 📌 3. Prosedur Kerja Standar (Local-First Workflow)
1. **Implementasi & Perbaikan**: Selesaikan perubahan kode di file yang dituju.
2. **Uji Validitas Lokal & Verifikasi Integritas Labnote & Database**:
   - Jalankan `npm run lint` (`tsc --noEmit`) dan pastikan 0 error.
   - **Verifikasi Labnote (Bulletin Board & Section Hub)**: Pastikan render aman dari re-render loop/crash, cache `localStorage` aman, dan navigasi virtual hub tidak memicu error ID numerik/400/500.
   - **Verifikasi Database (PostgreSQL Cloud SQL & Auth)**: Pastikan query aman, timeout DB toleran (3.5s - 4s), dan alur autentikasi tidak mereset data akun/password karyawan.
3. **Lapor ke User**: Informasikan kepada user apa saja yang telah diperbaiki/dibuat.
4. **Tunggu Instruksi**: Tunggu user menguji atau memberi arahan eksplisit sebelum melakukan push atau deploy.

## 🏢 4. Konfigurasi Lingkungan GCP (Saat User Meminta Deploy)
* **Default Project Target Resmi**: `project-054e3351-b8d1-42f7-9c8`
* **Default Region Resmi**: `asia-southeast2` (Jakarta - STRICT)
* **Custom Domain**: `https://portal.preplabtbp.com` (via Firebase Hosting rewrite)
