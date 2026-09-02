# Catatan Pembaruan (Changelog) - Prep & Lab Portal

Semua riwayat pembaruan, penambahan fitur, dan perbaikan sistem Prep & Lab Portal dicatat secara runtut dalam dokumen ini menggunakan bahasa yang jelas dan mudah dipahami.

---

## [2.8.19] - 2026-09-02

### 📱 Optimasi Tata Letak Rekap Personil & Tampilan Nama Lengkap (`GroupReportScreen.tsx`)

- **Penyelarasan Tata Letak Kartu Personil & Pencegahan Pemotongan Nama**:
  - Menghapus pembatasan *truncate* paksa pada nama personil dan menerapkan *responsive wrap* (`flex-col sm:flex-row`), sehingga seluruh nama panjang personil tampil utuh 100% tanpa terpotong.
  - Mengoptimalkan penempatan tombol aksi: tombol **`Set Sudah`** kini hanya muncul secara cerdas untuk personil yang **Belum Inspeksi**, serta tombol **`Reset`** untuk personil yang diverifikasi secara manual.

---

## [2.8.18] - 2026-09-02

### ✍️ Fitur Verifikasi Manual Status Inspeksi Personil per Minggu (`rekap_manual_overrides`)

- **Tombol "Set Sudah" & "Reset Auto" pada Tab Rekapitulasi Personil**:
  - Menambahkan tombol **`✅ Set Sudah`** pada personil yang belum berstatus inspeksi (atau jika terdapat laporan personil yang terkendala/tidak terekap otomatis).
  - Menambahkan tombol **`↩️ Reset`** untuk mengembalikan status personil ke hasil pemindaian otomatis sistem.
  - Perubahan disimpan secara persisten di database tabel `rekap_manual_overrides` sesuai minggu yang dipilih (*Week-based override*), sehingga statistik rekapitulasi langsung terupdate akurat dan permanen.

---

## [2.8.17] - 2026-09-02

### 🚀 Perbaikan Konflik Tipe Variabel Pipeline Deploy Cloud Build (`cloudbuild.yaml`)

- **Penyederhanaan Argumen Deploy Cloud Build**:
  - Menghapus argumen redundan yang memicu bentrok tipe variabel `SQL_PASSWORD` antara environment variable teks biasa dan Secret Manager di Cloud Run.
  - Mempertahankan argumen esensial `--update-secrets JWT_SECRET=JWT_SECRET:latest` sehingga proses build dan deploy otomatis melalui Cloud Build Trigger berjalan mulus tanpa error.

---

## [2.8.16] - 2026-09-02

### ⚡ Client-Side Instant Master Questions Fallback (`WeeklyInspectionScreen.tsx`)

- **Penyediaan Bundel Master Questions 228 Formulir di Sisi Klien**:
  - Mengintegrasikan berkas master questions fallback (`src/data/master-questions.json`) langsung ke dalam state awal komponen `WeeklyInspectionScreen`.
  - Menjamin seluruh kategori dropdown (*[ AREA ]*, *[ KOTAK P3K ]*, *[ ASSET & LAINNYA ]*, *[ ALAT PELINDUNG DIRI ]*) langsung muncul seketika (0ms delay) tanpa tergantung kecepatan atau latency koneksi database/API.

---

## [2.8.15] - 2026-09-02

### 📋 Auto-Sync Master Pertanyaan & Formulir Inspeksi (`/api/questions`)

- **Sinkronisasi Otomatis 228 Bank Pertanyaan Inspeksi Terpadu**:
  - Menambahkan mekanisme *auto-seed / auto-sync* pada `/api/questions` dan `initDbSchema()` yang secara cerdas mendeteksi jika tabel database kosong, lalu mengunduh dan menyinkronkan seluruh 228 pertanyaan master formulir inspeksi (*Area*, *P3K*, *Tabung Gas*, *Perkakas*, dll.) dari Google Sheet resmi secara otomatis.
  - Memastikan seluruh kelompok dropdown (*AREA*, *KOTAK P3K*, *ASSET & LAINNYA*) pada halaman `/weekly-inspection` selalu terisi lengkap dan berfungsi sempurna di Server Main maupun Localhost.

---

## [2.8.14] - 2026-09-02

### 📊 Deduplikasi Perhitungan Target Penyelesaian Inspeksi (29 Area/Agenda Unik)

- **Penyelarasan Metrik Penyelesaian Inspeksi SAP Dashboard (`sap-dashboard.tsx`)**:
  - Menerapkan deduplikasi cerdas pada kalkulasi target 29 inspeksi berdasarkan kombinasi unik agenda dan area kerja (misal: *Gudang Preparasi*, *Gudang Kontainer*, *APD Lab*, *P3K*, dll.).
  - Pengiriman laporan inspeksi berulang untuk area atau agenda yang sama dalam 1 pekan kini dihitung tepat **1 kali** terhadap target pemenuhan 29 agenda K3 terencana, mencegah penggelembungan persentase (*duplicate inflation*).

---

## [2.8.13] - 2026-09-02

### 🛡️ Pemulihan Validasi Ketat JWT_SECRET Production (P0 Fix)

- **Penghapusan Fallback JWT Publik di Production**:
  - Mengembalikan validasi ketat `server/config/env.ts` agar melempar error fatal jika `JWT_SECRET` tidak disetel atau kurang dari 32 karakter saat `NODE_ENV === 'production'`.
  - Meniadakan seluruh *hardcoded fallback* di lingkungan production guna menjamin token otentikasi tidak dapat dipalsukan oleh pihak luar.
  - Mempertahankan pesan diagnostik startup yang jelas dan terstruktur pada `server.ts`.

---

## [2.8.12] - 2026-09-02

### ⚙️ Sinkronisasi Script Deploy CLI & Automated Pipeline Test

- **Penyelarasan Script Deploy CLI `package.json`**:
  - Memperbarui perintah `npm run deploy:main` dan `npm run deploy:staging` dengan menyertakan argumen `--update-secrets JWT_SECRET=JWT_SECRET:latest` secara eksplisit.
  - Memastikan proses deploy manual via `gcloud run deploy --source .` selalu membawa secret autentikasi tanpa menghapus secret OAuth / WhatsApp yang sudah ada.
- **Integrasi Automated Test Step pada `cloudbuild-staging.yaml`**:
  - Menambahkan step pengujian otomatis `TEST_BASE_URL=... npm test` di akhir pipeline staging untuk memverifikasi autentikasi terpusat.
- **Penyempurnaan Pesan Log Startup Error `server.ts`**:
  - Menyediakan output diagnostik jelas di Cloud Logging jika terjadi kegagalan konfigurasi environment pada level proses.

---

## [2.8.11] - 2026-09-02

### 🛡️ Zero-Crash Startup Guard untuk Cloud Run Port Binding

- **Peniadaan Fatal Exception Startup pada `server/config/env.ts`**:
  - Mengubah penanganan konfigurasi environment variabel agar menggunakan nilai *fallback* yang aman dan mencatat *warning log* alih-alih melempar *fatal unhandled exception* yang mematikan proses Node.js sebelum server HTTP mengikat port `$PORT` (8080).
  - Menjamin Cloud Run menerima respons `HTTP 200` pada pemeriksaan kesehatan (*health check container*) secara instan sejak detik pertama container dihidupkan.

---

## [2.8.10] - 2026-09-02

### 🚀 Perbaikan Konfigurasi Deploy Cloud Build Production (Port 8080 Crash Fix)

- **Penyelarasan Environment Variables & Secret Cloud Run Production**:
  - Menambahkan argumen `--update-env-vars` eksplisit pada `cloudbuild.yaml` (`SQL_HOST`, `SQL_USER`, `SQL_DB_NAME`, `VAPID_PUBLIC_KEY`, dll.) agar tidak gagal validasi startup saat deploy ke production.
  - Mengubah `--set-secrets` menjadi `--update-secrets` pada `cloudbuild.yaml` dan `cloudbuild-staging.yaml` untuk mencegah terhapusnya variabel rahasia lain yang terpasang di Cloud Run.
  - Memasang pengaman *try-catch* pada inisialisasi modul `web-push` di `server.ts` agar server backend dapat mengikat port `$PORT` (8080) secara instan tanpa terhalang inisialisasi library pihak ketiga.

---

## [2.8.9] - 2026-09-02

### 🔑 Sinkronisasi JWT Token Global & Pemulihan Sesi Browser

- **Penyimpanan Token JWT Global pada Client (`p2h_token`)**:
  - Menyimpan token JWT hasil login/setup password ke `localStorage` agar tidak hilang saat cookie diblokir atau sesi browser kedaluwarsa.
  - Menambahkan penyisipan otomatis header `Authorization: Bearer <token>` dan `credentials: 'include'` pada seluruh pemanggilan `fetch('/api/*')` di `src/main.tsx`.
- **Validasi Sesi Otomatis & Pemulihan Dashboard**:
  - Menambahkan pengecekan `/api/auth/me` pada startup aplikasi di `src/App.tsx`. Jika token kedaluwarsa/hilang setelah server restart, sistem akan mengarahkan pengguna untuk login ulang alih-alih membiarkan dashboard kosong/gagal memuat data.

---

## [2.8.8] - 2026-09-02

### 🔍 Perbaikan Ekstraksi Co-Inspector & Rekap Otomatis Multi-Inspektor

- **Dukungan Penuh Ekstraksi Multi-Inspektor pada Formulir APD & P5M**:
  - Memperbarui scanner inspeksi di `server/routes/misc.ts` (`fetchAllGroupReports` dan `/api/rekap-inspeksi`) agar memproses data JSON array / matriks APD secara komprehensif.
  - Sistem kini membaca seluruh co-inspector dari kolom inspektor (`insp1`, `insp2`, `insp3`, serta baris matriks APD kolom 16, 18, 20) dan memetakan NIK/nama karyawan ke seluruh anggota tim yang bertugas.
  - Personil yang melakukan inspeksi bersama (misal: **Muhamad Alvin Febriansyah** dan **Muhammad Atha Ghali**) kini **100% otomatis terekap dengan status `SUDAH`** lengkap dengan tautan PDF laporannya pada rekap mingguan aktif (W36).

---

## [2.8.7] - 2026-09-02

### 🛡️ Audit Ronde 8 & 9 — Automated Security Test Suite & Konfigurasi Secret Cloud Build

- **Integrasi Automated Security Test Suite (`npm test`)**:
  - Menambahkan pengujian keamanan otomatis pada berkas `test/auth-guard.test.ts` untuk memastikan 9 rute terproteksi menolak akses anonim (HTTP 401) dan rute allowlist tetap terbuka (HTTP 200).
- **Konfigurasi Secret `JWT_SECRET` pada Cloud Build**:
  - Memperbarui `cloudbuild.yaml` dan `cloudbuild-staging.yaml` dengan menyertakan `JWT_SECRET=JWT_SECRET:latest` pada argumen `--set-secrets` Cloud Run agar deployment production/staging berjalan mulus tanpa error `MISSING OR INVALID REQUIRED ENVIRONMENT VARIABLES`.
- **Penyempurnaan Proporsi Modal Pengingat SAP**:
  - Memperbaiki tata letak, hierarki tipografi, padding, dan tombol aksi pada modal pengingat target inspeksi K3 mingguan.

---

## [2.8.6] - 2026-09-02

### 🛡️ Audit Ronde 7 — Pemulihan Guard Otentikasi Terpusat API (P0)

- **Penerapan Permanen Centralized API Authentication Guard**:
  - Memasang kembali middleware pengaman `requireAuth` terpusat pada seluruh rute `/api/*` di `server.ts` dengan allowlist ketat (`PUBLIC_API_PREFIXES`: `/login`, `/check-nik`, `/setup`, `/reset-password`, `/health`, dan `/drive/view`).
  - Seluruh endpoint data sensitif dan operasional (`/api/employees`, `/api/tickets`, `/api/roster`, `/api/inspections`, `/api/notifications`, `/api/admin/*`, dll.) kini 100% menolak akses tanpa token dengan status `HTTP 401 Unauthorized`.
  - Akses dengan token JWT yang sah terverifikasi berjalan lancar (`HTTP 200 OK`).

---

## [2.8.5] - 2026-09-02

### 🛡️ Audit Ronde 5 & 6 — Normalisasi Repositori & Konsistensi Cross-Platform

- **Penyatuan & Perlindungan Seluruh Patch Keamanan ke Git**:
  - Mengamankan seluruh perubahan keamanan dari 4 ronde audit sebelumnya (JWT hardening, RBAC admin, proteksi `/setup`, middleware otentikasi terpusat, dan perbaikan typecheck) ke dalam commit terstruktur di repositori `staging`.
- **Normalisasi Line-Ending Cross-Platform (`.gitattributes`)**:
  - Mengintegrasikan konfigurasi `.gitattributes` untuk memastikan konversi otomatis line-ending (`* text=auto eol=lf`) dan proteksi berkas biner (`.xlsx`, `.pdf`, `.png`, `.jpg`, `.zip`).
  - Menghilangkan anomali 111 file "modified" palsu akibat perbedaan CRLF ↔ LF antara lingkungan Windows dan Linux/Cloud Build, menjaga `git status` dan *code review* tetap bersih.

---

## [2.8.4] - 2026-09-02

### 🛡️ Audit Ronde 4 — Validasi Wajib Tanggal Lahir & Perbaikan Privasi Notifikasi

- **Penguncian Verifikasi Tanggal Lahir pada Aktivasi Akun (`/setup`)**:
  - Menjadikan `tanggalLahir` sebagai input wajib (*mandatory field*) jika data karyawan di database memiliki catatan tanggal lahir dari HR. Permintaan setup tanpa menyertakan tanggal lahir atau dengan tanggal lahir yang tidak cocok langsung ditolak dengan status `HTTP 400 Bad Request`.
- **Perbaikan Isolasi Notifikasi Personal**:
  - Mengisolasi notifikasi privat perorangan (`REMINDER_INSPECTION`, dll.) agar hanya dikirimkan secara eksklusif ke NIK penerima dan tidak lagi terdistribusi ke rekan kerja di seksi yang sama.
  - Menambahkan verifikasi ganda di sisi komponen modal frontend (`ReminderNotificationModal.tsx`).

---

## [2.8.3] - 2026-09-02

### 🛡️ Audit Ronde 3 — Penutupan Celah Akun Aktif & Pemulihan Typecheck

- **Penutupan Celah Pengambilalihan Akun pada `/setup` (P0)**:
  - Menambahkan guard validasi status akun di endpoint `POST /api/auth/setup`. Permintaan setup untuk akun yang sudah pernah diaktivasi (`firstLoginComplete: true`) langsung ditolak dengan status `HTTP 403 Forbidden` (`ACCOUNT_ALREADY_ACTIVE`).
  - Menambahkan verifikasi tanggal lahir (`tanggalLahir`) terhadap data HR untuk aktivasi pertama kali guna memastikan hanya pemilik sah yang dapat melakukan inisialisasi akun.
- **Pemulihan Penuh Typecheck & Penghapusan Memory Leak `tsc` (P1)**:
  - Memperbarui `tsconfig.json` dengan batasan direktori `include` dan `exclude` yang tepat, membebaskan compiler dari ratusan berkas skrip sekali pakai.
  - Memperbaiki 10 ketidaksesuaian tipe pada komponen aktif (`DailyGreetingHero`, `ui.tsx Button size`, `ImageModal isOpen`, `PageHeader title`, dan `WhatsAppModal message`).
  - `npm run lint` kini selesai dalam waktu **~10 detik dengan 0 error dan 0 peringatan**.
- **Optimalisasi `.gcloudignore` & `.gitignore` (P1)**:
  - Menambahkan aturan pengecualian berkas backup, arsip, dan berkas biner `.xlsx` dari konteks deploy Cloud Build untuk mempercepat proses deployment secara signifikan.

---

## [2.8.2] - 2026-09-02

### 🛡️ Audit Ronde 2 — Hardening Keamanan Kritis & Optimasi Performa

- **Pencabutan Hak Admin dari Akun DEMO**:
  - Menghapus NIK `DEMO123` dari daftar superadmin di middleware otentikasi. Akun demo kini berstatus user biasa (`isAdmin: false, isDeveloper: false`) dan secara otomatis diblokir dari endpoint `/api/admin/*` (HTTP 403 Forbidden).
- **Pengamanan `JWT_SECRET` Terpusat**:
  - Menghilangkan duplikasi dan hardcoded fallback `JWT_SECRET` di source code. Menjadikan `server/config/env.ts` sebagai satu-satunya sumber kebenaran dengan validasi wajib panjang secret (≥ 32 karakter).
- **Penjagaan Otentikasi API Terpusat (`Centralized API Auth Guard`)**:
  - Menerapkan middleware `requireAuth` secara terpusat untuk seluruh endpoint `/api/*` dengan daftar izin eksplisit (`PUBLIC_API_PREFIXES`) untuk endpoint login, cek NIK, setup, dan health check. Seluruh API lainnya kini mewajibkan token JWT valid (HTTP 401 jika anonim).
- **Pembersihan Residu Duplikasi Router**:
  - Menghapus blok router mounting kedua di `server.ts` yang sebelumnya mengekspos rute debug tanpa pengaman `NODE_ENV`.
- **Penghapusan File Dump Database Publik**:
  - Menghapus file `database_backup.json` dari direktori publik dan root proyek untuk mencegah kebocoran data.
- **Kompresi HTTP & Cache Header Aset Statis**:
  - Mengintegrasikan library `compression` (Brotli/Gzip) pada Express yang memangkas ukuran transfer bundle hingga ~70%.
  - Menambahkan header `Cache-Control: public, max-age=31536000, immutable` pada bundle statis Vite dan `no-cache` pada `index.html`.
- **Aksesibilitas Viewport HP & Optimasi Pool Database**:
  - Memperbaiki tag `<meta name="viewport">` di `index.html` agar pengguna di lapangan dapat melakukan pinch-zoom.
  - Meningkatkan pool koneksi database PostgreSQL di `src/db/index.ts` ke `max: 20` dan `idleTimeoutMillis: 30000`.

---

## [2.8.1] - 2026-09-02

### 🎨 UI/UX & Peningkatan Kualitas Data

- **Pembersihan Otomatis Data Testing/Dummy (`Test & Dummy Data Filtering`)**:
  - Menambahkan penyaring otomatis di backend (`/api/work-orders/maintenance-summary`) dan frontend untuk menyembunyikan entri work order testing (seperti *"testing wo baru"*, *"Testing wa baru"*, *"dddddd"*, *"coba"*, dll.) dari grafik, rekapitulasi downtime, kartu suku cadang, dan tabel work order.
- **Penyelarasan Kontras Tema Terang/Gelap (`High-Contrast Theme Adaptation`)**:
  - Memperbaiki kontras font di tema terang pada seluruh kartu KPI, kartu suku cadang, select dropdown, dan kartu mobile agar teks judul dan angka selalu tampil gelap pekat (`#0f172a` / `#1e293b`) dan tidak memudar/putih di atas latar belakang terang.
- **Responsivitas Layar HP Dasbor WO Maintenance**:
  - Menghadirkan tampilan **Mobile WO Cards** interaktif khusus layar smartphone dengan tata letak lencana ISO Week, badge status berwarna pekat, dan tombol aksi detail yang mudah diakses.
- **Proporsionalitas Modal Pengingat SAP Inspection**:
  - Merapikan tata letak tombol dan informasi pada pop-up pengingat inspeksi SAP agar lebih proporsional dan dilengkapi tombol dismiss `X`.

---

## [2.8.0] - 2026-09-02

### 🛡️ Peningkatan Keamanan Sistem (Enterprise Security Hardening)

- **Lapisan Otentikasi & Otorisasi Server Terpusat (`Server-side JWT & RBAC`)**:
  - **JSON Web Token (JWT) & HttpOnly Cookie**: Mengganti sistem otentikasi berbasis klien dengan token JWT resmi bertanda tangan kriptografis yang disimpan dalam cookie `httpOnly` (`SameSite=Lax`) serta mendukung otentikasi via header `Authorization: Bearer <token>`.
  - **Middleware `requireAuth`**: Backend memverifikasi validitas token secara otomatis pada setiap panggilan API sebelum request diproses.
  - **Middleware `requireRole`**: Membatasi akses menu dan endpoint sensitif berdasarkan hak akses peran (*Role-Based Access Control*).

- **Penguncian Total Router Admin (`Admin Route Lockdown`)**:
  - Seluruh endpoint `/api/admin/*` kini terkunci di balik otentikasi peran `admin` atau `developer`.
  - **Penghapusan Permanen Endpoint Truncate**: Menghapus endpoint `DELETE /api/admin/tables/:name` untuk mencegah risiko penghapusan data massal tanpa konfirmasi.

- **Proteksi Data Pribadi (PII) & Sanitasi Hash Password**:
  - **Helper `toPublicEmployee`**: Memastikan atribut sensitif seperti `passwordHash` otomatis disensor dari semua respons API karyawan, tabel admin, maupun autentikasi.
  - **Sterilisasi `/check-nik`**: Tidak lagi membocorkan data profil lengkap ke publik saat pemeriksaan akun, hanya mengembalikan status minimal yang dibutuhkan alur login.

- **Perlindungan Serangan Brute-Force & Denial of Service (`Rate Limiting`)**:
  - Menambahkan pembatas frekuensi request (`express-rate-limit`) pada endpoint autentikasi (`/api/auth/*`) untuk menangkal serangan penebakan password (*brute force*).
  - Pembatasan beban traffic umum pada seluruh endpoint `/api/*` untuk menjaga stabilitas server.

- **Penerapan Header Keamanan Industri (`Helmet`)**:
  - Mengintegrasikan library `helmet` untuk menyuntikkan header keamanan HTTP standar terhadap ancaman XSS, Clickjacking, dan MIME-sniffing.

- **Validasi Proxy Media & Keamanan File**:
  - Menambahkan validasi regex ketat pada parameter berkas Google Drive (`/api/drive/view/:fileId`) untuk mencegah serangan SSRF dan injeksi parameter.
  - Mengoptimalkan penyaringan target notifikasi dengan query langsung SQL `WHERE` di database.
  - Membersihkan file backup database lokal dari pelacakan git serta memperketat aturan `.gitignore`.

---

## [2.7.0] - 2026-09-01

### 🚀 Fitur Baru & Peningkatan Utama

- **Pembaruan Dashboard K3 & SAP (`Safety Accountability Program Dashboard`)**:
  - **Matriks Kepatuhan Inspeksi (Compliance Matrix)**: Menampilkan persentase kepatuhan mingguan, jumlah target realisasi (29 agenda terencana), status cuti/off, dan skor performa keselamatan kerja secara langsung.
  - **Popup & Banner Pengingat Inspeksi K3**:
    - Sistem otomatis mendeteksi status personil yang sedang login untuk minggu berjalan (contoh: `W36`).
    - Jika personil tercatat **`BELUM`** inspeksi, modal interaktif dan banner atas akan muncul memberikan pengingat dengan tombol langsung **`Mulai Inspeksi Sekarang ↗`** menuju form inspeksi mingguan (`/weekly-inspection`).
    - Dilengkapi tombol penutup *"Nanti Saja"* yang mengingat preferensi pengguna selama sesi aktif.
  - **Penyempurnaan Filter & Tabel Temuan Ketidaksesuaian**:
    - Filter status cepat (*Semua, Terbuka/Open, Selesai/Closed*), filter area inspeksi, dan pencarian bebas berdasarkan nama pemeriksa, lokasi, maupun tindakan perbaikan.
    - Otomatis mereset kata kunci pencarian saat mengganti minggu ISO untuk menghindari data kosong akibat filter lama.
    - Tombol *1-Click Reset Filter* pada tampilan kosong untuk memulihkan seluruh daftar temuan dengan instan.
  - **Modal Penutupan Tiket Temuan (Action Closure Modal)**:
    - Mempermudah penyelesaian temuan langsung dari dashboard SAP dengan dukungan saran otomatis nama PIC, deskripsi tindakan perbaikan (*Action Taken*), dan unggah foto bukti penyelesaian.

### 🛠 Perbaikan Sistem (Bug Fixes & Optimasi)

- **Optimasi Koneksi Database Cloud SQL**: Menyesuaikan konfigurasi koneksi pool PostgreSQL agar mencegah batas koneksi habis (*connection slot saturation / error 53300*).
- **Penanganan Format Tanggal Aman (`safeDateDay`)**: Mencegah kesalahan parsing tanggal `Invalid time value` pada pembuatan tiket dan penarikan laporan berkala.
- **Pembersihan Konflik Komponen JSX**: Memperbaiki benturan nama ikon peta dengan konstruktor Javascript bawaan.

---

## [2.6.0] - 2026-08-25

### 🚀 Fitur Baru & Peningkatan Utama

- **Peluncuran Dashboard Pemeliharaan & Work Order (`WO Maintenance Dashboard`)**:
  - **Pusat Monitoring Alat Terpadu**: Menggabungkan seluruh data pelaporan kerusakan dan perbaikan alat dari site TBP & GPS dalam satu dashboard eksekutif yang informatif dan *real-time*.
  - **Perhitungan Metrik Otomatis**: Menampilkan total durasi *downtime* (jam henti alat), jumlah kasus kerusakan, rasio kerusakan kategori *Instrument (L)* vs *Non-Instrument (PL)*, total konsumsi suku cadang (*sparepart*), serta tingkat penyelesaian (*closure rate*).
  - **Grafik Interaktif & Analisis Downtime**: Dilengkapi grafik batang 10 alat dengan *downtime* tertinggi, grafik donat perbandingan kategori, dan daftar peringkat suku cadang yang paling sering diganti.
  - **Filter Canggih Multi-Dimensi**: Pengguna dapat memfilter laporan berdasarkan Kategori Alat, Kode/Nama Alat Spesifik, Rentang Tanggal / Minggu ISO, dan pencarian bebas.
  - **Modal Rincian Kasus & Bukti Foto**: Klik tombol pratinjau pada setiap baris untuk melihat detail keluhan, tindakan teknisi, foto bukti perbaikan, dan nama pelapor.
  - **Ekspor Laporan Excel (`.xlsx`)**: Unduh data rekapitulasi pemeliharaan lengkap hanya dengan satu klik untuk keperluan laporan manajemen.

- **Penyelesaian Penuh Migrasi Data Notion ke Database Internal & Google Drive**:
  - **Kemandirian Sistem 100%**: Berhasil memigrasikan seluruh database kegiatan, notulen, dan dokumen kerja dari Notion (Weekly Laboratorium, Preparasi, Admin, K3LH, IT) ke database internal PostgreSQL Cloud SQL.
  - **Penyimpanan Berkas & Foto Terpusat**: Seluruh foto dokumentasi, laporan Excel, dan lampiran PDF dari Notion telah dimigrasikan dan disimpan dengan aman di Google Drive terpusat (`1JE6EusixbK7saIzboKNOk9aMiAqEX-zF`).
  - **Bebas Masalah *Broken Link* & Akses Cepat**: Dilengkapi server proxy media internal sehingga gambar dan dokumen selalu terbuka instan tanpa kendala blokir akses atau tautan kedaluwarsa.
  - **Data Historis Utuh**: Semua riwayat komentar, catatan teknisi, lampiran foto loker, serta progres kegiatan masa lalu tetap tersimpan utuh dan dapat diakses dengan cepat di papan Bulletin.

- **Filter Minggu ISO (ISO 8601 Week) di Seluruh Dashboard & Work Order**:
  - **Dashboard Maintenance WO**: Pengguna kini dapat memfilter laporan langsung berdasarkan **Minggu ISO Ini**, **Minggu ISO Lalu**, atau memilih nomor minggu tertentu (**Minggu 01 s/d Minggu 53**) lengkap dengan rentang tanggalnya (Senin – Minggu).
  - **Daftar Work Order (`WO List`)**: Ditambahkan bilah filter lengkap di bagian atas daftar untuk memfilter WO berdasarkan Minggu ISO, status pengerjaan (Open, In Progress, Closed), serta kolom pencarian cepat.
  - **SAP & Monitoring Dashboard**: Pilihan rentang waktu kini mendukung standar Minggu ISO untuk mempermudah pelaporan mingguan operasional.
  - **Tag Minggu pada Data**: Setiap kartu dan baris data WO kini memiliki label *badge* minggu (contoh: `W34`) agar periode pengerjaan langsung terbaca jelas.

- **Pagination (Bagi Halaman per 20 Data) & Pencarian pada Tabel Rincian WO**:
  - Tabel rincian Work Order di bagian bawah dashboard maintenance kini dibagi menjadi **20 data per halaman**, sehingga pengguna tidak perlu lagi menggulir (*scroll*) layar terlalu panjang ke bawah.
  - Dilengkapi tombol navigasi halaman (**Sebelumnya**, **Nomor Halaman**, **Berikutnya**) dan kotak pencarian langsung di atas tabel untuk mencari nomor WO, alat, keluhan, teknisi, maupun status secara instan.

- **Animasi Cuaca & Langit Dinamis (Pengganti Animasi Tangan Melambai)**:
  - Menggantikan animasi tangan melambai lama dengan visual animasi kondisi langit dan matahari tanpa latar belakang kotak (*clean & glowing*), yang berganti otomatis mengikuti waktu saat membuka portal:
    - 🌅 **Pagi (04:00 - 10:59)**: Matahari terbit dengan sinar keemasan yang berotasi lembut.
    - ☀️ **Siang (11:00 - 14:59)**: Matahari siang cerah dengan efek korona energi berdenyut.
    - 🌇 **Sore (15:00 - 17:59)**: Matahari senja yang turun perlahan ke ufuk langit.
    - 🌙 **Malam (18:00 - 03:59)**: Bulan sabit ungu malam dengan kilauan bintang.

- **Tampilan Halaman Login & Header Baru (Identitas Resmi Prep & Lab)**:
  - Tampilan login dirombak total dengan gaya modern bernuansa *dark-mode enterprise* dengan efek pendaran cahaya (*glow effect*) dan lencana keamanan resmi.
  - Logo resmi Prep & Lab kini disematkan di halaman login serta di pojok kiri atas bilah navigasi utama sistem.

- **Panel Diskusi Topik Bulletin & Galeri Lampiran Media**:
  - Tampilan detail topik di papan Bulletin kini terbuka lebih luas dalam format **2 kolom** dari sisi kanan:
    - **Kolom Kiri**: Berisi rincian lengkap kegiatan, catatan, target, serta **Galeri Lampiran & Foto**.
    - **Kolom Kanan**: Ruang diskusi dan pembaruan progres kerja anggota tim.
  - Pengguna dapat langsung mengunggah foto/dokumen lampiran dengan fitur kompresi otomatis dan pratinjau layar penuh (*fullscreen zoom*).

- **Pilihan PIC & Periode yang Lebih Fleksibel**:
  - Kolom PIC pada tabel Bulletin kini menyediakan pilihan cepat untuk **All Foreman**, **SPV**, serta pencarian karyawan otomatis via NIK maupun Nama.
  - Kolom periode kegiatan dilengkapi opsi pilihan waktu baku (*Daily, Weekly, Monthly, 3 Month, 6 Month, Yearly*).

### 🛠 Perbaikan Sistem (Bug Fixes)

- **Perbaikan Alur Navigasi (Breadcrumb)**: Memperbaiki kesalahan tautan yang sebelumnya membuat pengguna tersasar ke halaman lain saat menekan tombol kembali dari ruang Laboratorium.
- **Tampilan Layar Penuh Section Hub**: Menghapus pembatasan lebar tengah layar agar halaman ruang kerja section tampil penuh (*full-width*) dan leluasa di monitor kerja.
- **Keamanan Data Baris Teratas**: Memperbaiki validasi penghapusan baris pada tabel agar tidak menghapus kegiatan utama lainnya secara tidak sengaja.

---

## [2.5.0] - 2026-08-23

### 🚀 Fitur Baru & Peningkatan Utama

- **Modul Manajemen P5M & Safety Talk Terpadu (`P5M Management`)**:
  - **Bank Data Materi P5M**: Halaman khusus untuk mengelola materi briefing harian lengkap dengan pencarian cepat, filter divisi, dan tombol tambah materi baru.
  - **Upload Flyer Poster Langsung**: Pengguna dapat mengunggah file gambar/poster materi P5M (PNG/JPG hingga 10MB) yang langsung disimpan rapi di Google Drive dan database Cloud SQL.
  - **Menu Pemilih Materi yang Interaktif**: Mengganti kolom teks biasa dengan pemilih materi modern yang dilengkapi pencarian instan, filter kategori (*Preparasi, Laboratorium, General, Non-Teknis*), dan tombol aksi cepat (*Senam Bersama, Logbook*).
  - **Penetapan Pemateri yang Akurat**: Pergantian nama pemateri secara manual langsung menyinkronkan data NIK, nama lengkap, dan bagian kerja agar penugasan tepat sasaran.
  - **Penampil & Pengunduh Poster Flyer Cepat**: Server proxy lokal memastikan poster materi selalu dapat dilihat dan diunduh langsung tanpa kendala akses.

- **Notifikasi Pop-up Jadwal Briefing untuk Pemateri**:
  - Karyawan yang bertugas menjadi pemateri briefing P5M akan otomatis menerima notifikasi pop-up saat login ke portal, lengkap dengan judul materi, tanggal, shift, dan tombol lihat poster.
  - Notifikasi hanya muncul untuk jadwal hari ini dan masa depan (jadwal yang sudah lewat tidak akan memunculkan pop-up lagi).

- **Penyelarasan Warna Matriks Jadwal P5M**:
  - Memperbarui skema warna untuk membedakan Shift Siang (kuning/oranye cerah) vs Shift Malam (biru tua/gelap) serta area Preparasi (oranye) vs Laboratorium (hijau zamrud) agar jadwal mudah dibaca dalam sekejap.
  - Menambahkan penanda garis batas khusus bagi personil yang mendapat penugasan briefing 2 kali dalam satu minggu.

---

## [2.4.0] - 2026-08-22

### 🚀 Fitur Baru & Peningkatan Utama

- **Papan Buletin Digital (Prep & Lab Bulletin)**:
  - Peluncuran modul papan buletin kerja digital terintegrasi untuk menggantikan papan informasi konvensional.
  - Terhubung langsung dengan agenda kerja tim untuk sinkronisasi kegiatan harian secara otomatis.

- **Dashboard Ruang Kerja Section (Section Hub)**:
  - Setiap bagian kerja (*Administrasi, Laboratorium, Preparasi, IT, K3LH/Safety*) kini memiliki beranda ruang kerja interaktifnya masing-masing.
  - Mempermudah akses dokumen, instruksi kerja, dan pelaporan rutin per divisi.

- **Tampilan Database Fleksibel (Multi-View)**:
  - Data kegiatan dapat dilihat dalam format Tabel (*Table View*), Papan Alur (*Kanban Board*), maupun Daftar (*List View*).
  - Dilengkapi filter status (*Open, On Progress, Close, Pending*) dan prioritas kerja (*High, Medium, Low*).

- **Diskusi Interaktif & Pembaruan Progres Tim**:
  - Setiap kegiatan memiliki ruang diskusi sendiri dengan avatar pengguna, waktu komentar, dan notifikasi pembaruan progres otomatis ke anggota tim.

- **Pratinjau Foto & Dokumen Resolusi Penuh**:
  - Modal galeri foto layar penuh (*Lightbox*) dengan fitur perbesaran (*zoom*) dan tombol unduh langsung.
