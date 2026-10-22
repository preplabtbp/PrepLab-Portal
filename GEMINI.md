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

### 1b. SOP Mutlak: Wajib Pull & Merge dari Seluruh Branch Aktif Sebelum Push ke Main
- **Sebelum melakukan `git push` ke `main`**, asisten **WAJIB** menjalankan `git fetch --all` dan melakukan merge dari seluruh branch pengembang aktif (seperti `origin/PC-Alvin`, `origin/PC-Aldy`, dsb.) ke `main`.
- Pastikan tidak ada branch aktif rekan tim yang tertinggal sebelum perubahan dirilis ke remote `main`.
- Lakukan validasi `npm run lint` (`tsc --noEmit`) pada hasil gabungan merge untuk memastikan 0 konflik dan 0 error kompilasi.

### 1c. SOP Mutlak: Verifikasi Integritas Labnote & Database Sebelum Push ke Main
Setiap kali ada instruksi untuk melakukan push/merge ke `main`, asisten **WAJIB** melakukan pengecekan menyeluruh dan memastikan bahwa perubahan tidak menimbulkan error pada:
1. **Modul Labnote (Bulletin Board & Section Hub)**:
   - Pastikan render thread aman dari crash/loop re-render.
   - Pastikan penanganan key unik React, memoization, dan alur cache `localStorage` (`preplab_cached_bulletin_posts_*`) tidak korup atau melebihi batas kuota browser.
   - Pastikan navigasi & polling virtual section hub (seperti ID `section-*`) ditangani secara aman tanpa memicu request ID non-numerik yang menyebabkan error 400/500.
   - Pastikan format postingan, thread komentar, dan data lampiran tetap sinkron lintas-PT.
2. **Koneksi & Operasi Database (PostgreSQL Cloud SQL & Auth)**:
   - Pastikan semua query SQL, parameter, dan alur autentikasi tidak memicu runtime error atau syntax error pada database.
   - Pastikan timeout query DB diset dengan toleransi aman (3.5s - 4s) agar koneksi internet jarak jauh dari PC lokal ke Cloud SQL tidak memicu false fallback ke CSV yang mereset status `first_login_complete` karyawan yang sudah memiliki password hash.
   - Pastikan tidak ada skrip migrasi atau mutasi query yang berpotensi menimpa, menghapus, atau mengosongkan data karyawan (`employees` / `user_roles`).
3. **Verifikasi Mutlak Sebelum Push**:
   - Jalankan `npm run lint` (`tsc --noEmit`) hingga mendapatkan hasil **0 error**.
   - Laporkan hasil audit Labnote dan DB kepada user dan **TUNGGU instruksi eksplisit** sebelum menjalankan perintah `git push`.

### 2. Dilarang Menjalankan Cloud Build & Deploy Tanpa Instruksi Eksplisit
- **JANGAN PERNAH** menjalankan perintah deploy atau submit build ke cloud (seperti `gcloud run deploy`, `gcloud builds submit`, `docker build`, `npm run deploy:*`, dsb.) jika user tidak meminta secara eksplisit.
- Lakukan validasi kode secara lokal:
  - `npm run lint` (`tsc --noEmit`) untuk memastikan kebenaran tipe TypeScript.
  - Selesai pengujian lokal, laporkan hasil kepada user dan tunggu arahan lebih lanjut.

### 3. Lingkungan Server & Target Region
- **Default Region**: Wajib selalu menggunakan `asia-southeast2` (Jakarta). Dilarang keras mengganti ke region US (`us-central1`).
- **Target Project ID**: `project-054e3351-b8d1-42f7-9c8`
- **Domain Resmi**: `https://portal.preplabtbp.com`

## ☀️ ATURAN MUTLAK DESAIN UI: WAJIB TEMA TERANG (LIGHT MODE), DILARANG KERAS TEMA GELAP (DARK THEME)

### 1. Dilarang Keras Membuat Tampilan Gelap (Dark Mode / Black UI)
- **Larangan Mutlak**: DILARANG membuat modul, halaman, modal, widget, atau kartu dengan tampilan dasar gelap/hitam (seperti `bg-slate-900`, `bg-slate-950`, `bg-black`, `bg-neutral-900`, neon cyber/dark dashboard style).
- **Alasan**: Manajemen perusahaan (stakeholder & pimpinan) **SANGAT MENOLAK tampilan gelap** karena sulit dibaca saat presentasi di proyektor rapat, terkesan suram/tidak formal, dan tidak mencerminkan standar laporan resmi korporat.

### 2. Standar Desain Resmi: Clean Corporate Light Theme
- **Latar Belakang (Canvas & Layout)**:
  - Wajib putih bersih (`bg-white`) atau abu-abu terang yang sangat lembut (`bg-slate-50`).
- **Kartu & Kontainer**:
  - Wajib berlatar putih (`bg-white`) dengan garis tepi halus (`border border-slate-200` atau `border-slate-100`) dan bayangan lembut (`shadow-xs` atau `shadow-sm`).
- **Tipografi & Keterbacaan**:
  - Teks judul & isi wajib gelap dengan kontras tajam (`text-slate-900`, `text-slate-800`), teks sekunder/label menggunakan `text-slate-500` / `text-slate-600`.
  - Dilarang teks putih/terang di atas background hitam pekat.
- **Warna Aksen Korporat**:
  - Gunakan warna profesional bernuansa korporat laboratorium: Teal/Toska (`teal-600`, `teal-700`), Emerald/Hijau K3 (`emerald-600`), Indigo (`indigo-600`), atau Amber (`amber-500` untuk warning).
- **Default Styling**:
  - Semua styling default Tailwind WAJIB varian terang (`bg-white text-slate-900 border-slate-200`). Jangan pernah memaksakan tampilan hitam/gelap pada modul apapun.

