# Deployment & Git Push Policy

## 🚨 ATURAN MUTLAK GIT PUSH KE MAIN (STRICT INVIOLABLE RULE)
1. **DILARANG KERAS PUSH KE `main` ATAU `staging` TANPA PERMINTAAN EKSPLISIT:**
   - **JANGAN PERNAH** menjalankan `git push origin main` atau melakukan push ke branch `main` dalam kondisi apapun, KECUALI user secara eksplisit dan tegas meminta kata demi kata: *"push ke main"*.
   - Jika user hanya mengatakan *"push"*, *"sinkronkan"*, atau tugas selesai, tujuan push **HANYA** ke branch **`PC-Aldy`** (`git push origin PC-Aldy`).

2. **Branch Khusus Device Ini: `PC-Aldy`**
   - Seluruh pekerjaan, pembaruan, dan push rutin harian dilakukan pada branch **`PC-Aldy`** (`git push origin PC-Aldy`).
   - Setiap update lokal di device ini hanya di-push ke branch **`PC-Aldy`**.

3. **Pengujian & Verifikasi Lokal (Local-First):**
   - Selalu buat, uji (`tsc --noEmit`), dan pastikan seluruh perubahan berjalan sempurna di environment lokal terlebih dahulu.
   - Informasikan hasil implementasi dan status local server kepada user untuk dicek terlebih dahulu.

4. **Cloud & Production Deployment Restriction:**
   - Dilarang menjalankan deployment cloud (seperti `gcloud run deploy`, `cloudbuild`, atau pipeline rilis produksi) tanpa konfirmasi dan instruksi langsung dari user.

