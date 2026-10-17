# Panduan & Aturan Mutlak Antigravity / Gemini IDE (PrepLab Portal)

## 🛑 ATURAN PROTOKOL: WAJIB DISKUSI & PERSETUJUAN EKSPLISIT SEBELUM UBAH KODE

Setiap kali menerima permintaan baru, bug report, fitur, atau perbaikan:
1. **DILARANG LANGSUNG MENGUBAH / MENULIS KODE**:
   - Jangan memanggil tool edit file (`replace_file_content`, `multi_replace_file_content`, `write_to_file`) sebelum mendapatkan izin eksplisit dari user.
2. **DISKUSIKAN TERLEBIH DAHULU**:
   - Jelaskan pemahaman Anda terhadap maksud/kebutuhan user secara rinci.
   - Uraikan akar penyebab masalah (jika bug) atau desain alur logika yang direncanakan.
   - Berikan kesempatan user untuk memeriksa pemahaman Anda dan melakukan adjustment logic yang kurang sesuai.
3. **TUNGGU PERINTAH EKSPLISIT**:
   - Hanya lakukan perubahan kode setelah user memberikan konfirmasi eksplisit (misal: *"oke proceed"*, *"lanjut ubah kode"*, *"lanjutkan"*, *"terapkan"*).
4. **EKSEKUSI PENUH HINGGA SELESAI TANPA BERTANYA LAGI**:
   - Begitu user sudah memberikan persetujuan eksplisit, asisten **wajib melanjutkan dan menyelesaikan seluruh implementasi, perubahan file, hingga verifikasi/typecheck sampai tuntas tanpa berhenti di tengah jalan untuk bertanya lagi**.

## 🚨 ATURAN UTAMA: DILARANG GIT PUSH & CLOUD BUILD TANPA PERMINTAAN EKSPLISIT

### 1. Dilarang Melakukan `git push` ke Branch Manapun
- **Berlaku untuk SEMUA branch** (`main`, `staging`, `PC-Alvin`, atau branch fitur apapun).
- **JANGAN PERNAH** menjalankan `git push` ke remote manapun jika tidak ada instruksi langsung dan eksplisit dari user (contoh instruksi eksplisit: *"push"*, *"push ke main"*, *"push branch PC-Alvin"*).
- Menyelesaikan coding task, fix bug, atau penambahan fitur **TIDAK BOLEH** langsung diikuti dengan `git push`. Pekerjaan cukup diselesaikan di branch lokal.

### 2. Dilarang Menjalankan Cloud Build & Deploy Tanpa Instruksi Eksplisit
- **JANGAN PERNAH** menjalankan perintah deploy atau submit build ke cloud (seperti `gcloud run deploy`, `gcloud builds submit`, `docker build`, `npm run deploy:*`, dsb.) jika user tidak meminta secara eksplisit.
- Lakukan validasi kode secara lokal:
  - `npm run lint` (`tsc --noEmit`) untuk memastikan kebenaran tipe TypeScript.
  - Selesai pengujian lokal, laporkan hasil kepada user dan tunggu arahan lebih lanjut.

### 3. Lingkungan Server & Target Region
- **Default Region**: Wajib selalu menggunakan `asia-southeast2` (Jakarta). Dilarang keras mengganti ke region US (`us-central1`).
- **Target Project ID**: `project-054e3351-b8d1-42f7-9c8`
- **Domain Resmi**: `https://portal.preplabtbp.com`
