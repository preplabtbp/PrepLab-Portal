# Deployment & Git Push Policy

## 🚨 ATURAN MUTLAK GIT PUSH KE MAIN (STRICT MANDATORY RULE)
1. **DILARANG KERAS PUSH KE MAIN / STAGING TANPA PERMINTAAN EKSPLISIT:**
   - **JANGAN PERNAH** menjalankan `git push origin main` atau melakukan push ke branch `main` secara inisiatif sendiri dalam kondisi apapun.
   - Meskipun tugas coding selesai, build sukses, atau verifikasi lulus, **SELALU TUNGGU INSTRUKSI EKSPLISIT DAN TEGAS DARI USER** (contoh perintah: *"push ke main"*).

2. **Branch Khusus Device Ini: `PC-Alvin`**
   - Seluruh pekerjaan, pembaruan, dan push rutin harian dilakukan pada branch **`PC-Alvin`** (`git push origin PC-Alvin`).
   - Setiap update lokal di device ini hanya di-push ke branch **`PC-Alvin`**.

3. **Pengujian & Verifikasi Lokal (Local-First):**
   - Selalu buat, uji (`tsc --noEmit`), dan pastikan seluruh perubahan berjalan sempurna di environment lokal terlebih dahulu.
   - Informasikan hasil implementasi dan status local server kepada user untuk dicek terlebih dahulu.

4. **Cloud & Production Deployment Restriction:**
   - Dilarang menjalankan deployment cloud (seperti `gcloud run deploy`, `cloudbuild`, atau pipeline rilis produksi) tanpa konfirmasi dan instruksi langsung dari user.
