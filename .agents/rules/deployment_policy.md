# Deployment & Git Push Policy

## 🚨 ATURAN MUTLAK GIT PUSH KE MAIN (STRICT MANDATORY RULE)
1. **DILARANG KERAS PUSH KE MAIN OTOMATIS:**
   - **JANGAN PERNAH** menjalankan `git push origin main` atau melakukan push ke branch `main` secara otomatis atau berinisiatif sendiri.
   - Meskipun tugas coding selesai, build sukses, atau tes lulus di local, **SELALU TUNGGU INSTRUKSI EKSPLISIT DARI USER** sebelum melakukan push ke `main`.
   - Push ke `main` **HANYA BOLEH DILAKUKAN** jika user secara tegas dan spesifik memerintahkan dalam sesi pesan, misalnya: *"push ke main"*, *"silakan push sekarang"*, dsb.

2. **Pengujian & Verifikasi Lokal (Local-First):**
   - Selalu buat, uji, dan pastikan seluruh perubahan berjalan dengan sempurna di environment local terlebih dahulu.
   - Informasikan hasil implementasi dan status local server kepada user untuk dicek terlebih dahulu.

3. **Cloud & Production Deployment Restriction:**
   - Dilarang menjalankan deployment cloud (seperti `gcloud run deploy`, `cloudbuild`, atau pipeline rilis produksi) tanpa konfirmasi dan instruksi langsung dari user.
   - Ini memastikan stabilitas sistem produksi dan mencegah regresi yang tidak terverifikasi.

