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

5. **⚠️ PEMBERITAHUAN AKUN HOSTING GCP (PENTING UNTUK SEMUA BRANCH & TIM):**
   - **Default Project Target Resmi**: **`project-054e3351-b8d1-42f7-9c8`** (*"My First Project"* - Akun Trial Aktif Rp 5.3jt).
   - **Skrip Deploy Default Terkunci**: Script `npm run deploy:main` dan `npm run deploy:staging` di `package.json` telah dikonfigurasi secara eksplisit dengan flag `--project project-054e3351-b8d1-42f7-9c8`.
   - **Project Lama Ditinggalkan**: Project `project-1bcc4549-c8d6-4962-958` sudah tidak lagi digunakan.
   - **Mengaktifkan Cloud Run Deploy di Cloud Build**:
     - Pada akun baru, berikan role **Cloud Run Admin** dan **Service Account User** ke Cloud Build Service Account di menu *Cloud Build > Permissions*.
   - **Aturan Verifikasi Akun Baru Sebelum Deploy**:
     - Sebelum menjalankan build atau deploy manual via gcloud CLI, selalu verifikasi project aktif dengan:
       `gcloud config set project project-054e3351-b8d1-42f7-9c8`

