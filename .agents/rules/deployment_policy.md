# Deployment & Git Push Policy

## 🚨 ATURAN MUTLAK GIT PUSH KE MAIN (STRICT INVIOLABLE RULE)
1. **DILARANG KERAS PUSH KE `main` ATAU `staging` TANPA PERMINTAAN EKSPLISIT:**
   - **JANGAN PERNAH** menjalankan `git push origin main` atau melakukan push ke branch `main` dalam kondisi apapun, KECUALI user secara eksplisit dan tegas meminta kata demi kata: *"push ke main"*.
   - Jika user hanya mengatakan *"push"*, *"sinkronkan"*, atau tugas selesai, tujuan push **HANYA** ke branch **`PC-Alvin`** (`git push origin PC-Alvin`).

2. **Branch Khusus Device Ini: `PC-Alvin`**
   - Seluruh pekerjaan, pembaruan, dan push rutin harian dilakukan pada branch **`PC-Alvin`** (`git push origin PC-Alvin`).
   - Setiap update lokal di device ini hanya di-push ke branch **`PC-Alvin`**.
   - Selalu pastikan branch lokal aktif adalah `PC-Alvin` dan tersinkronisasi dengan remote `origin/PC-Alvin`.

3. **Pengujian & Verifikasi Lokal (Local-First):**
   - Selalu buat, uji (`tsc --noEmit`), dan pastikan seluruh perubahan berjalan sempurna di environment lokal terlebih dahulu.
   - Informasikan hasil implementasi dan status local server kepada user untuk dicek terlebih dahulu.

4. **Cloud & Production Deployment Restriction:**
   - Dilarang menjalankan deployment cloud (seperti `gcloud run deploy`, `cloudbuild`, atau pipeline rilis produksi) tanpa konfirmasi dan instruksi langsung dari user.

5. **⚠️ PEMBERITAHUAN MIGRASI AKUN HOSTING GCP (PENTING UNTUK SEMUA BRANCH & TIM):**
   - **Project Lama Ditinggalkan**: Project Google Cloud lama dengan ID `project-054e3351-b8d1-42f7-9c8` (*"My First Project"*) sudah tidak lagi digunakan karena akun hosting telah berganti.
   - **Penyebab Tidak Ada di Cloud Build History**:
     1. Push ke branch GitHub (`main`, dll) **tidak otomatis memicu build** di project lama karena tidak ada GitHub trigger webhook yang terhubung (seluruh build historis sebelumnya dipicu manual via CLI / `--`).
     2. Akun hosting aktif telah berpindah ke akun Google Cloud yang baru.
   - **Larangan Keras**:
     - **JANGAN PERNAH** menjalankan command build atau deploy (`gcloud run deploy`, `gcloud builds submit`, dsb.) yang menargetkan project lama `project-054e3351-b8d1-42f7-9c8`.
   - **Aturan Verifikasi Akun Baru Sebelum Deploy**:
     - Sebelum menjalankan build atau deploy apapun, selalu verifikasi project aktif dengan menjalankan `gcloud config get-value project` dan pastikan mengarah ke akun / project Google Cloud yang baru.
     - Pastikan trigger Cloud Build (jika ingin otomatis saat push `main`) sudah dihubungkan ke repository GitHub di console project baru.

