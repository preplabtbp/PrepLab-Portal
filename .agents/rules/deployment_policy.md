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
   - **Default Project Target Resmi**: **`project-1bcc4549-c8d6-4962-958`**.
   - **Skrip Deploy Default Terkunci**: Script `npm run deploy:main` dan `npm run deploy:staging` di `package.json` telah dikonfigurasi secara eksplisit dengan flag `--project project-1bcc4549-c8d6-4962-958` agar tidak ada lagi kesalahan sasaran project dari branch manapun.
   - **Project Lama Ditinggalkan**: Project Google Cloud lama dengan ID `project-054e3351-b8d1-42f7-9c8` (*"My First Project"*) sudah tidak lagi digunakan. Dilarang keras menargetkan project lama ini.
   - **Mengaktifkan Build Otomatis Saat Push Main**:
     - Jika ingin setiap push ke branch `main` otomatis memicu Cloud Build, hubungkan repository GitHub di Cloud Build Triggers project baru melalui:
       `https://console.cloud.google.com/cloud-build/triggers?project=project-1bcc4549-c8d6-4962-958`
   - **Aturan Verifikasi Akun Baru Sebelum Deploy**:
     - Sebelum menjalankan build atau deploy manual via gcloud CLI, selalu verifikasi project aktif dengan:
       `gcloud config set project project-1bcc4549-c8d6-4962-958`

