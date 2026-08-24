# Changelog - Prep & Lab Portal

Semua pembaruan dan perbaikan sistem Prep & Lab Portal dicatat dalam dokumen ini.

---

## [2.6.0] - 2026-08-25

### 🚀 Fitur Baru & Peningkatan Utama

- **Filter Minggu ISO (ISO 8601 Week) di Seluruh Dashboard & Work Order**:
  - **Dashboard Maintenance WO**: Sekarang pengguna bisa langsung memfilter laporan berdasarkan **Minggu ISO Ini**, **Minggu ISO Lalu**, atau memilih nomor minggu tertentu (**Minggu 01 s/d Minggu 53**) lengkap dengan rentang tanggalnya (Senin – Minggu).
  - **Daftar Work Order (`WO List`)**: Ditambahkan bilah filter lengkap di bagian atas daftar untuk memfilter WO berdasarkan Minggu ISO, status pengerjaan (Open, In Progress, Closed), serta kolom pencarian cepat.
  - **SAP & Monitoring Dashboard**: Pilihan rentang waktu kini mendukung standar Minggu ISO untuk mempermudah pelaporan mingguan operasional.
  - **Tag Minggu pada Data**: Setiap kartu dan baris data WO kini memiliki label badge minggu (contoh: `W34`) agar periode pengerjaan langsung terbaca jelas.

- **Pagination (Bagi Halaman per 20 Data) pada Tabel Rincian WO**:
  - Tabel rincian Work Order di bagian bawah dashboard maintenance kini dibagi menjadi **20 data per halaman**, sehingga pengguna tidak perlu lagi menggulir (*scroll*) layar terlalu panjang ke bawah.
  - Dilengkapi tombol navigasi halaman (**Sebelumnya**, **Nomor Halaman**, **Berikutnya**) dan kotak pencarian langsung di atas tabel untuk mencari nomor WO, alat, keluhan, teknisi, maupun status secara instan.

- **Animasi Cuaca & Langit Dinamis (Pengganti Animasi Tangan)**:
  - Menggantikan animasi tangan melambai lama dengan visual animasi kondisi langit dan matahari tanpa latar belakang kotak (*clean & glowing*), yang berganti otomatis mengikuti waktu saat membuka portal:
    - **Pagi (04:00 - 10:59)**: Matahari terbit dengan sinar keemasan yang berotasi lembut.
    - **Siang (11:00 - 14:59)**: Matahari siang cerah dengan efek korona energi berdenyut.
    - **Sore (15:00 - 17:59)**: Matahari senja yang turun perlahan ke ufuk langit.
    - **Malam (18:00 - 03:59)**: Bulan sabit ungu malam dengan kilauan bintang.

- **Tampilan Halaman Login & Header Baru (Identitas Resmi Prep & Lab)**:
  - Tampilan login dirombak total dengan gaya modern bernuansa *dark-mode enterprise* dengan efek pendaran cahaya (*glow effect*) dan badge keamanan resmi.
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

### 🚀 Added
- **P5M & Safety Talk Management Module (`p5m-screen.tsx`)**:
  - **Materi Management UI/UX**: Added "Bank Data Materi P5M" interface with search, division filters, sub-category tags, and "+ Tambah Materi Baru" modal.
  - **Direct Flyer Upload**: Supported drag-and-drop / file picker for flyer posters (PNG/JPG up to 10MB) with automatic upload to Google Drive (`P5M_Materi_Flyers`) and metadata storage in PostgreSQL.
  - **Materi Management Backend Endpoints (`server/routes/p5m.ts`)**:
    - `GET /api/p5m/materi` & `GET /api/p5m/materi-list`: Fast search & category filtering for briefing materials.
    - `POST /api/p5m/materi`: Uploads base64 flyer to Google Drive and inserts record into Cloud SQL.
    - `DELETE /api/p5m/materi/:id`: Safe removal of obsolete briefing materials.
  - **Searchable Materi Picker Popover**: Replaced plain text input with an interactive materi selector featuring instant search, division/category filter chips (*Preparasi*, *Laboratorium*, *General*, *Non-Teknis*), and one-click quick actions (*🤸 Senam Bersama*, *📋 Logbook*).
  - **Accurate Personnel Targeting**: Ensured manual slot person replacement synchronizes `nama`, `nik`, `karyawanId`, and `pt` so briefing notifications are 100% targeted to the newly selected presenter.
  - **Reliable Flyer Image & Download Proxy**:
    - Enhanced `GET /api/p5m/flyer` with streaming and `download=true` support (`Content-Disposition: attachment`), preventing broken links and CORS issues.
- **Presenter Briefing Notification Modal (`p5m-notification-modal.tsx`)**:
  - Automatically alerts assigned personnel when logging into the portal with topic title, date, shift, and one-click flyer viewer/download.
  - **Past Date Filtering**: Integrated WIT (UTC+9) timezone date checks (`todayIso > assignmentDateIso`) so pop-up notifications will not appear for sessions whose scheduled date has already passed.

### 🔄 Migrated
- **P5M Database & Flyer Storage (Notion ➡️ Cloud SQL & Google Drive)**:
  - Migrated all **88 P5M briefing topics & flyers** completely from Notion to Google Drive (`P5M_Materi_Flyers`, Folder ID: `1AH151Lrgklv4Q1Ty0vdEgsPES6VcCKps`).
  - Saved full relational metadata in PostgreSQL table `p5m_materi` with Google Drive direct view URLs, eliminating external Notion dependency.

### 🎨 UI & UX Improvements
- **Schedule Matrix Color Palette & Visual Index**:
  - Overhauled color tokens for Day Shift (warm yellow-amber/orange) vs. Night Shift (indigo/navy/slate) and Preparation (orange) vs. Laboratory (emerald green) to eliminate ambiguous visual overlaps.
  - Hardened text clipping boundaries and badge containers in Shift & Zone headers.
  - Thickened outline marker (`border-2`) with distinct section color accents for personnel assigned to **2× briefing** in a single week.

### 🧹 Maintenance & Database Cleanup
- **Schedule Reset (Clean Slate)**:
  - Cleaned all test scheduling entries from `p5m_schedules` and reset `last_used = NULL` across all 88 materi records in `p5m_materi` to prepare for actual production scheduling.

---

## [2.4.0] - 2026-08-22

### 🚀 Added
- **Prep & Lab Bulletin Module**:
  - Rebranded module from "Prep & Lab Notion" to **"Prep & Lab Bulletin"** across navigation sidebar, breadcrumbs, and page headers.
  - Integrated bidirectional event synchronization with the Agenda module (excluding personnel birthdays which remain isolated to the Quality Assurance section).
- **Dynamic Section Hub Dashboard (`SectionHubDashboard.tsx`)**:
  - Implemented automatic homepage rendering for all section workspaces (`ADMINISTRASI`, `LABORATORIUM`, `PREPARASI`, `IT`, `K3LH / SAFETY`, etc.).
  - Added interactive navigation cards, child page explorer, and category switchers.
- **Enhanced Notion Database Table (`NotionDatabaseTable.tsx`)**:
  - Interactive multi-view component supporting Table View, Kanban Board, and List View.
  - Live filtering by Status (`OPEN`, `ON PROGRESS`, `CLOSE`, `PENDING`), Priority (`High`, `Medium`, `Low`), and dynamic search query.
  - Column mapper that prioritizes `Jenis Kegiatan`, `Nama`, `Task`, `Judul`, and `Rencana Tindakan` as primary topic titles.
- **Topic Discussions & Live Progress Updates**:
  - Integrated discussion threads for every bulletin topic with personnel avatars, timestamps, and status update badges.
  - Web push notifications automatically dispatched to section team members when a progress update is submitted.
- **Direct Google Drive Media & Document Streaming Proxy**:
  - Added backend proxy endpoints `GET /api/drive/view/:fileId` and `GET /api/drive/download/:fileId` in `server/routes/bulletin.ts`.
  - Bypasses Google Drive hotlinking and CORS restrictions, ensuring 100% reliable thumbnail loading and instant image viewing.
  - Integrated fullscreen Image Lightbox Modal with zoom, external Google Drive viewer, and one-click file download.
  - Added attachment upload support in the comment box with direct Google Drive cloud storage.

### 🔄 Migrated
- **Notion Historical Comments & Attachments**:
  - Migrated 101 historical comments and 182 media attachments (`.jpg`, `.png`, `.xlsx`, `.pdf`) from Notion to Google Drive (`1JE6EusixbK7saIzboKNOk9aMiAqEX-zF`).
  - Synced comment attachments into PostgreSQL (`bulletin_comments.file_url` & `fileName`).
  - Restored locker inventory verification image (`gambar.jpg`) under topic *"Pengecekan Loker Lab"*.

### 🛠 Fixed
- **Multi-Tenancy Post Separation**:
  - Cleanly isolated TBP and GTS post records in `bulletin_posts` to prevent GTS data from overlapping inside TBP Non Routine Laboratorium.
- **Direct Image Previews**:
  - Resolved broken image thumbnail icon caused by Google Drive `lh3.googleusercontent.com` access blocks by routing all media requests through the local authenticated streaming proxy.
