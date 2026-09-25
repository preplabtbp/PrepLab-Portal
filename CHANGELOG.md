# Catatan Pembaruan (Changelog) - Prep & Lab Portal

Semua riwayat pembaruan, penambahan fitur, dan perbaikan sistem Prep & Lab Portal dicatat secara runtut dalam dokumen ini menggunakan bahasa yang jelas dan mudah dipahami.

## [2.9.31] - 2026-09-25

### 🛡️ Pembatasan Perolehan EXP Inspeksi K3 Maksimal 1x per Minggu Kalender & Audit Transparansi Gamifikasi

- **Pembatasan Kuota Perolehan EXP Inspeksi Lapangan (Maks 1x/Minggu)**:
  - **Deduplikasi Berbasis ISO 8601 Week (`server/routes/gamification.ts`, `src/utils/iso-week.ts`)**: Sistem gamifikasi kini mengelompokkan riwayat pengisian inspeksi personil berdasarkan minggu kalender standar (zona waktu WIT / `Asia/Jayapura`).
  - **Pemberian EXP Konsisten (50 EXP / Minggu)**: Dalam satu minggu kalender yang sama, personil hanya memperoleh maksimal +50 EXP dari aktivitas inspeksi, terlepas dari berapa banyak formulir inspeksi yang diisi pada minggu tersebut. Ini mencegah eksploitasi perolehan EXP instan dari pengisian formulir berulang dalam satu pekan.
  - **Dukungan Karir dan Musim (*Season*)**: Pembatasan 1x/minggu kalender diterapkan seragam baik untuk perhitungan Karir (*All-Time EXP*) maupun Musim Berjalan (*Season EXP*).
  - **Preservasi Akumulasi Badge & Gelar (`rawInspectionCount`)**: Total formulir fisik yang telah diisi tetap dicatat seutuhnya (`rawInspectionCount`) untuk syarat pencapaian gelar milestone (*Bronze, Silver, Gold, Master Branch Inspection*), sehingga dedikasi teknis personil tetap terakui sepenuhnya.

- **Transparansi Audit EXP & Satuan Pengukuran (`src/lib/gamificationEngine.ts`, `src/components/ExpAuditModal.tsx`)**:
  - Satuan baris inspeksi diubah secara resmi menjadi **`Minggu`** (misal: *2 Minggu × 50 = +100 EXP*).
  - Modal Audit EXP kini menampilkan catatan informatif jika personil menyelesaikan lebih banyak formulir daripada jumlah minggu aktifnya (contoh: *Total 5 formulir diselesaikan (2 minggu aktif dihitung)*).

- **Pemberitahuan Kuota Interaktif pada Frontend (`src/components/InspectionCompletionModal.tsx`, `src/components/SimplifiedInspectionModal.tsx`)**:
  - Modal penyelesaian inspeksi dan modal unggah bukti SS mingguan kini memverifikasi kuota EXP mingguan pengguna saat itu juga.
  - Jika pengguna telah mengklaim jatah EXP inspeksi di minggu yang sama, sistem menampilkan notifikasi informatif (*"Form inspeksi tercatat! Kuota EXP mingguan inspeksi (1x/minggu) sudah terpenuhi untuk minggu ini."*) dan tidak lagi memunculkan pop-up perolehan EXP yang berlebih.

## [2.9.30] - 2026-09-25

### 🚀 Enterprise WYSIWYG Editor, Relokasi Progress Bar ke Kolom Status, Otomatisasi Status Tugas, & Interaksi Rincian Kegiatan Topik

- **Perbaikan Rincian Kegiatan di Panel Diskusi Topik (`src/components/NotionDatabaseTable.tsx`, `src/components/notion/tasklist-utils.ts`)**:
  - **Pembersihan Tag Raw HTML**: Mengeliminasi tampilan teks mentah `<br/>` yang sebelumnya tampak pada kartu rincian kegiatan dan mengonversinya secara mulus ke pemisah baris dan paragraf yang rapi dan responsif.
  - **Checklist Subtask Interaktif di Drawer**: Jika kegiatan memiliki subtask (tasklist), kartu *Rincian & Keterangan Kegiatan* di panel samping kini menyajikan:
    - *Badge* persentase dan rasio penyelesaian (`completed/total (%)`).
    - *Progress bar* dinamis yang berubah warna sesuai persentase progres.
    - Kotak centang interaktif (`CheckSquare` / `Square`) yang dapat diklik langsung di dalam drawer untuk menandai tugas selesai/belum dengan efek *strikethrough* seketika.
  - **Sinkronisasi Dua Arah (*Two-Way Realtime Sync*)**: Menandai subtask di dalam drawer topik langsung menyinkronkan status, persentase kemajuan, dan tabel utama secara seketika tanpa perlu menutup panel.
  - **Pemformatan Elegan Tipe Non-Task List**: Catatan kegiatan konvensional diformat rapi dengan parser poin (*bullet list*) dan pemisah baris tanpa kebocoran kode mentah.

- **Relokasi Progress Bar ke Kolom Status & Pemisahan Bersih Kolom Keterangan (`src/components/NotionDatabaseTable.tsx`, `src/components/notion/NotionTasklistView.tsx`)**:
  - **Pembersihan Kolom Keterangan**: Melepas header progress bar dari kolom keterangan menggunakan opsi `hideProgressBar={true}`, sehingga sel kolom keterangan fokus pada judul subtask dan checklist tanpa redundansi visual.
  - **Penempatan Progress Bar di Kolom Status**: Progress bar dipindahkan ke kolom *Status* persis di bawah lencana/dropdown status kegiatan, menampilkan persentase (`X%`) dan jumlah tugas (`X/Y`) secara ringkas dan informatif.

- **Otomatisasi Transisi Status Berdasarkan Progres Checklist**:
  - **0% Selesai**: Status baris kegiatan otomatis ditetapkan menjadi **`Open`**.
  - **> 0% & < 100% Selesai**: Status otomatis beralih menjadi **`On Progress`**.
  - **100% Selesai**: Status otomatis beralih menjadi **`Closed`**.
  - Perubahan ini otomatis berlaku baik saat pengguna mencentang subtask di tabel utama maupun melalui panel diskusi topik.

- **Fleksibilitas Status & Opsi `Canceled` (`src/components/notion/NotionDropdownCell.tsx`)**:
  - Menambahkan pilihan status **`Canceled`** pada opsi dropdown status, modal penyuntingan data kegiatan, filter tab status, dan kanban board.
  - Pengguna memiliki keleluasaan penuh untuk mengubah status menjadi `Canceled` secara manual kapan saja.
  - **Dukungan Baris Non-Task List**: Untuk kegiatan bertipe catatan biasa (tanpa checklist), kolom Status menyediakan pilihan lengkap: **`Open`**, **`On Progress`**, **`Closed`**, dan **`Canceled`** **tanpa menampilkan progress bar**.

- **Relokasi Floating Focus Mode Pill ke Pojok Kiri Bawah (`src/App.tsx`)**:
  - Menyesuaikan posisi pil melayang (*floating pill*) *Focus Mode • Diskusi Kerja* pada tampilan desktop (`sm:` dan ke atas) dari yang semula di pojok kanan atas menjadi di pojok kiri bawah (`bottom-5 left-4 sm:bottom-6 sm:left-6`).
  - Menjaga area kerja tabel buletin dan kontrol navigasi atas tetap lapang dan bebas halangan pandang.

- **Enterprise WYSIWYG Editor & Peningkatan Readability (`src/components/notion/EnterpriseWysiwygEditor.tsx`, `src/components/notion/NotionInlineEditor.tsx`)**:
  - **Overhaul Kontras & Warna (WCAG AA Compliant)**: Memperbaiki masalah keterbacaan (*readability*) yang buruk akibat benturan kelas `dark:*` Tailwind dengan variabel tema terang portal.
  - **Judul Header Jelas & Tajam**: Mengganti warna judul modal/kartu yang sebelumnya memudar menjadi teks arang kontras tinggi (`var(--text-main, #0f172a)`).
  - **Pilihan Mode Teks & Checklist Subtask Terang & Jelas**: Mendesain ulang tombol peralihan mode agar memiliki indikator aktif berbasis teal tegas (`bg-teal-600 text-white font-bold`) dan latar belakang netral yang bersih, mengeliminasi kotak hitam pekat yang tidak terbaca.
  - **Bilah Tombol Format (*Toolbar*) Bersih & Kontras**: Ikon tebal, miring, garis bawah, coret, kode, dan daftar poin kini menggunakan warna teks tajam dengan latar belakang lembut (`var(--input-bg)`), serta lencana `+ Done` dan `+ OPEN` dengan warna tegas yang tidak saling bertubrukan.
  - **Keterangan Pintasan & Tombol Aksi Nyaman Dibaca**: Teks panduan tombol pintas (`Tekan Esc untuk batal • Ctrl+Enter untuk simpan`) diselaraskan ke `var(--text-muted, #475569)` yang nyaman di mata tanpa buram, dengan tombol aksi `Batal` dan `Simpan Keterangan` yang kontras dan kokoh.
  - Editor catatan dan tugas dwifungsi kelas enterprise (*Mode Teks Bebas* vs *Mode Checklist Subtask*) dilengkapi bilah format, pintasan keyboard (`Ctrl+Enter` untuk simpan, `Escape` untuk batal), template prasetel kegiatan laboratorium, serta live markdown preview.

- **Sinkronisasi Logbook & Pemilihan PIC Cerdas (`src/components/logbook-screen.tsx`, `server/routes/logbook.ts`)**:
  - Pencarian PIC dengan fitur ketik nama/NIK cerdas (searchable autocomplete dropdown).
  - Otomatisasi penguncian seksi pelaksana sesuai seksi akun personil.
  - Pemilihan tanggal fleksibel (*date picker*) untuk estimasi target penyelesaian.
  - Sinkronisasi penambahan baris tugas baru ke baris pertama tabel markdown Buletin Manajemen Mutu.

## [2.9.29] - 2026-09-25

### 🎯 Penyesuaian Interaksi Diskusi, Editor Teks Native Terintegrasi, & Manajemen Kolom Dinamis Buletin

- **Interaktivitas Baris & Pembukaan Panel Diskusi Terarah (`src/components/NotionDatabaseTable.tsx`)**:
  - **Penonaktifan Klik Baris Global**: Mengklik atau menyeleksi baris tabel kini tidak lagi memicu pembukaan panel samping diskusi secara tidak disengaja. Pengguna dapat dengan leluasa berinteraksi dengan sel tabel tanpa terganggu oleh drawer yang tiba-tiba terbuka.
  - **Pemicu Diskusi Eksklusif**: Panel diskusi kini hanya akan terbuka secara terarah dan terencana saat tombol komentar (*badge* dengan ikon `MessageSquare` dan jumlah komentar) di samping judul kegiatan diklik atau ditap.

- **Desain Editor Teks Native Menyatu dengan Sel (`src/components/notion/NotionInlineEditor.tsx`)**:
  - **Eliminasi Tampilan "Tempelan" Mengambang**: Mendesain ulang antarmuka penyunting inline dari sebelumnya berupa kartu mengambang (*floating popover*) dengan bayangan tebal menjadi wadah tertanam langsung (*in-cell embedded container*) yang menyatu secara harmonis dengan batas sel tabel.
  - **Adopsi Tema Sistem Portal**: Menggunakan variabel CSS tema portal (`var(--input-bg)`, `var(--card-bg)`, `var(--border-main)`, `var(--text-main)`) sehingga otomatis beradaptasi dengan mode gelap dan terang tanpa tabrakan warna latar belakang.
  - **Bilah Alat (Toolbar) Terintegrasi**: Bilah pemformatan teks (*Bold*, *Italic*, *+ Tasklist*, *Bullet Point*) dan tombol aksi (*Batal*, *Terapkan*) tersusun rapi di dalam ruang sel dengan pintasan keyboard praktis `Ctrl+Enter` untuk menyimpan dan `Escape` untuk batal.

- **Hierarki Urutan Kolom Standar Notion & Fitur Reordering Kolom (`src/components/NotionDatabaseTable.tsx`)**:
  - **Penataan Kolom Terstruktur (Canonical Notion Layout)**: Mengatasi susunan kolom mentah acak dari dokumen markdown dengan algoritma canonical weighting: Kolom *Nomor (#)* selalu berada di indeks paling awal, diikuti *Jenis Kegiatan (Judul)*, *Keterangan/Tasklist*, *PIC*, *Status*, *Priority*, *Aktivitas*, *Target Selesai*, *Aktual Selesai*, *Period*, *Group/Kategori*, kolom kustom, dan diakhiri oleh *Created Time*.
  - **Kontrol Geser Kolom Interaktif**: Ditambahkan tombol geser ke kiri (`<`) dan ke kanan (`>`) pada setiap header kolom saat di-hover sehingga personil dapat menyesuaikan posisi kolom tabel secara fleksibel.
  - **Tombol "Rapikan Kolom" Sekali Klik**: Ditambahkan tombol aksi cepat *Rapikan Kolom* pada bilah filter untuk langsung merestorasi seluruh susunan kolom ke standar hierarki Notion.

- **Eliminasi Efek Transparan Dropdown via React Portal & Solid Palette (`src/components/notion/NotionDropdownCell.tsx`)**:
  - **Penyebab Masalah**: Elemen baris tabel berikutnya (`<tr>`) secara alami memiliki stacking context CSS yang saling menumpuk, menyebabkan tombol dari baris bawah terlukis di atas menu dropdown baris atasnya sehingga tampak "tembus pandang" / transparan. Ditambah teks `text-slate-300` yang kehilangan kontras pada tema terang.
  - **Rendering Bebas Stacking via `createPortal`**: Popover menu dropdown kini dirender langsung ke `document.body` menggunakan `createPortal` dengan koordinat `fixed` presisi dari tombol pemicu dan `z-index: 99999`, sehingga tidak pernah tertimpa atau terpotong oleh baris dan kontainer tabel.
  - **Desain Kartu Solid & Kontras Tinggi**: Menghapus efek `backdrop-blur` semi-transparan dan menerapkan latar belakang solid opaque `var(--card-bg, #ffffff)` dengan teks kontras tinggi `var(--text-main)` yang adaptif di mode terang maupun gelap.
  - **Penyesuaian Posisi Cerdas**: Menu otomatis membuka ke atas jika ruang vertikal di bawah tombol tidak mencukupi, serta tertutup otomatis saat jendela digulir (*on-scroll auto close*).

## [2.9.28] - 2026-09-25

### ⚡ Optimasi Performa & Modularisasi Buletin, Inline Editing Tabel Enterprise, Smart Tasklist Progress, dan Konfirmasi Simpan

- **Paginasi Server-Side & Optimasi Pemuatan API Buletin (`server/routes/bulletin.ts`)**:
  - **Dukungan Parameter Paginasi**: Menambahkan dukungan query `page` dan `limit` pada endpoint `GET /api/bulletin` dengan pemfilteran berbasis universe (`TBP_GPS` vs `GTS`) dan kalkulasi hitung cepat `count(*)`.
  - **Respons Paginasi Terstruktur**: Mengembalikan metadata `{ page, limit, total, totalPages, hasMore }` sekaligus menjaga kompatibilitas mundur 100% untuk pemanggil yang membutuhkan seluruh data.
  - **Peningkatan Kecepatan Initial Load**: Mengurangi ukuran payload HTTP secara drastis saat memuat artikel buletin pada jaringan lambat di lapangan.

- **Modularisasi Komponen Notion Database Table (`src/components/notion/`)**:
  - Memecah berkas raksasa menjadi modul-modul independen dan reusable:
    1. **`tasklist-utils.ts`**: Utilitas parsing ekspresi reguler untuk mendeteksi item tasklist markdown, kalkulasi persentase kemajuan penyelesaian tugas, dan fungsi toggle status checklist tanpa merusak susunan teks.
    2. **`NotionTasklistView.tsx`**: Komponen tampilan interaktif daftar tugas dengan mini progress bar dinamis, badge persentase berwarna adaptif (*Amber/Sky/Teal/Emerald*), serta checkbox yang dapat diklik langsung.
    3. **`NotionDropdownCell.tsx`**: Dropdown sel inline bergaya Notion untuk perubahan instan kolom *Status*, *Activity (Routine / Non Routine)*, *Priority*, dan *Period*.
    4. **`NotionInlineEditor.tsx`**: Antarmuka penyunting teks inline kelas enterprise dengan bilah format cepat (Bold, Italic, Sisipkan Tasklist, Sisipkan Poin Bullet) serta pintasan keyboard `Ctrl+Enter` dan `Escape`.
    5. **`NotionSaveConfirmationModal.tsx`**: Dialog modal konfirmasi interaktif bertema gelap elegan yang menampilkan ringkasan jumlah baris yang diubah sebelum disimpan ke backend.

- **Pengeditan Langsung di Tabel (Direct Inline Table Editing without Modal) (`src/components/NotionDatabaseTable.tsx`)**:
  - **Dropdown Status & Tipe Tugas**: Personil dapat langsung mengganti status (*Open, In Progress, Resolved, Closed, Done, Cancelled*) dan kategori aktivitas (*Routine, Non Routine, Periodic, Special Task*) cukup dengan satu klik pada sel tabel tanpa perlu membuka menu modal detail.
  - **Penyuntingan Judul & Keterangan Kelas Enterprise**: Pengguna dapat melakukan klik ganda (*double click*) atau menekan ikon pensil pada sel *Jenis Kegiatan* atau *Keterangan* untuk memunculkan editor inline lengkap dengan fitur format tebal, miring, dan checklist.
  - **Smart Tasklist & Persentase Progres Otomatis**:
    - Sistem otomatis membaca item checklist markdown (`- [ ]` vs `- [x]`) di kolom keterangan.
    - Menghitung persentase progres secara real-time (`Math.round((completed / total) * 100)%`).
    - Checkbox dapat langsung dicentang/dihapus centangnya secara interaktif di tabel, dan otomatis merekomendasikan status *Resolved* saat seluruh tugas telah selesai (100%).

- **Deteksi Perubahan Langsung & Pop-up Konfirmasi Simpan (`src/components/NotionDatabaseTable.tsx`)**:
  - **Pelacakan Baris Kotor (*Dirty Row Tracking*)**: Baris yang diubah secara langsung ditandai dengan aksen visual halus dan indikator titik animasi pada nomor baris.
  - **Bilah Aksi Melayang (*Floating Save Bar*)**: Bilah simpan melayang muncul di bagian bawah tabel saat terdeteksi ada modifikasi sel yang belum disimpan.
  - **Dialog Konfirmasi Penyimpanan**: Saat tombol *Simpan Perubahan* ditekan, sistem memunculkan pop-up modal: *"Apakah Anda ingin menyimpan perubahan?"* dengan rincian jumlah baris yang dimodifikasi, opsi *"Ya, Simpan Perubahan"*, serta opsi pembatalan / rollback ke data semula (*"Buang Perubahan"*).

## [2.9.27] - 2026-09-24

### 🛡️ Perbaikan Aksesibilitas Modul APD, Navigasi Multi-Submodul, dan Pembukaan Guard Endpoint APD

- **Pembukaan Guard Endpoint API APD (`server.ts`)**:
  - **Penyebab Masalah Utama**: Endpoint `/api/apd/*` (`/api/apd/settings`, `/api/apd/history`, `/api/apd/documents`) sebelumnya terhalang oleh *Centralized API Auth Guard* dan menghasilkan status `401 Unauthorized` bagi pengguna, sehingga pemanggilan data master interval APD dan riwayat pengambilan gagal dimuat.
  - **Daftar Allowlist GET Publik**: Menambahkan `url.startsWith('/api/apd')` ke dalam daftar allowlist metode GET publik di `server.ts` sehingga seluruh pengaturan interval APD dan riwayat pengambilan personil dapat diakses secara instan dan aman.

- **Pembukaan Hak Akses Menu APD untuk Seluruh Personil (`src/components/modules-screen.tsx`, `src/components/ModulesDrawer.tsx`)**:
  - Menghapus pembatasan seksi yang sebelumnya hanya memperbolehkan personil berlabel `Inventory Control` untuk melihat menu APD (`hasInventoryAccess`).
  - Seluruh staf dari seksi *Preparation*, *Laboratory*, *Maintenance*, *QA*, *Administration*, *Superintendent*, hingga *Manager* kini dapat mengakses kategori menu **Inventory Control (APD)** baik dari halaman Semua Menu (`/modules`) maupun laci navigasi desktop/mobile (`ModulesDrawer`).

- **Peningkatan Antarmuka & Navigasi Submodul APD Terpadu (`src/components/apd-input-screen.tsx`, `src/components/apd-monitoring-screen.tsx`, `src/components/apd-settings-screen.tsx`, `src/App.tsx`)**:
  - **Bilah Navigasi Tab Terpadu**: Menambahkan tab switcher di bagian atas setiap halaman APD yang memungkinkan pengguna berpindah dengan satu klik antara:
    1. **Distribusi APD** (`/apd-input`): Input dan pencatatan pengambilan APD baru.
    2. **Monitoring Dokumen** (`/apd-monitoring`): Pelacakan status tanda tangan dan unggah scan formulir APD.
    3. **Pengaturan Interval** (`/apd-settings`): Konfigurasi batas interval kelayakan pengambilan tiap jenis APD.
  - **Tombol Kembali Terintegrasi**: Menyematkan tombol *"Kembali"* di sudut kiri atas seluruh layar APD yang mengarahkan pengguna kembali ke halaman utama portal (`home`).
  - **Pencarian Mandiri Otomatis (Self-Check)**: Layar distribusi APD kini otomatis mendeteksi NIK pengguna yang sedang aktif dan menyediakan tombol cepat *"Cek Riwayat APD Saya"* untuk melihat status kelayakan APD tanpa perlu mengetik ulang NIK.
  - **Pencegahan Crash Tipe Data (Safe Filtering)**: Menambahkan pemeriksaan null-safety `(emp.nama || emp.name || '')` pada penyaringan karyawan untuk mencegah crash browser akibat data karyawan yang tidak lengkap.

## [2.9.26] - 2026-09-24

### 🚀 Integrasi Data Riil 100% Dashboard Eksekutif SPT & Manager, Penambahan Modul P5M Lab di Home, dan Restrukturisasi Simulasi 10 Peran Operasional

- **Integrasi 100% Data Riil Database pada Dashboard Pimpinan (`src/components/LeadershipDashboardModal.tsx`, `server/routes/workOrders.ts`)**:
  - **Penyebab Masalah Sebelumnya**: Pemanggilan endpoint work orders sebelumnya menggunakan path `/api/workorders` (tanpa tanda hubung) yang belum terdaftar di backend Express, sehingga Vite mengembalikan berkas HTML SPA (`<!doctype html>`). Hal ini memicu kegagalan parsing JSON dan menyebabkan antarmuka dashboard jatuh ke nilai fallback statis (dummy).
  - **Dukungan Rute Ganda Backend**: Menambahkan alias `router.get(["/api/work-orders", "/api/workorders"], ...)` pada `server/routes/workOrders.ts` dan memasang parser `safeJson` dengan validasi `content-type: application/json` agar kebal dari respons HTML.
  - **Pembersihan Seluruh Data Dummy & Fallback Statis**: Menghapus seluruh angka persentase palsu (seperti 92%, 95%, 94%, 85%, 91%, dan nilai suhu/kelembaban statis 22.4°C / 52%). Seluruh metrik kini 100% dihitung secara dinamis dari tabel database riil:
    - **183 Tiket K3 / Temuan**: Indeks keselamatan LTI dihitung secara dinamis (*0 LTI / 100% Zero Accident*), lengkap dengan pelacakan temuan open dan closed.
    - **538 Work Orders**: Tingkat resolusi perbaikan dihitung presisi dari status *Closed/Done* vs *Open/Progress*.
    - **156 Peralatan & Aset**: Kesiapan alat berat preparasi dan instrumen lab dihitung langsung dari status *IN USE* vs *BREAKDOWN* di tabel `equipments`.
    - **1.341 Baris Pemantauan Lingkungan**: Suhu, kelembaban, dan aliran gas diambil dari entri pencatatan aktual analis lab di tabel `pemantauan`.
    - **266 Personil Roster & Rekap SAP Mingguan**: Menghubungkan kepatuhan SAP dan data penjadwalan roster secara langsung per seksi.
  - **Indikator Pemuatan Telemetri**: Menambahkan animasi loading skeleton transparan saat data disinkronkan dari Cloud SQL sehingga antarmuka tidak pernah menampilkan angka kosong atau berkedip.

- **Penambahan Modul Briefing P5M untuk Personil Laboratory & Inventory Control di Home (`src/components/MobileSimpleHomeScreen.tsx`)**:
  - Menyediakan kartu **Briefing P5M** langsung di grid tugas harian Mode Sederhana untuk seluruh personil seksi *Laboratory* dan *Inventory Control*.
  - Personil lab kini dapat langsung mengetuk kartu P5M untuk membuka modal interaktif `SimplifiedP5mModal`, meninjau giliran pemateri harian, membaca materi safety talk, serta mengunduh flyer P5M resmi.

- **Restrukturisasi Simulasi 10 Peran Operasional Mandiri & Etis (`src/components/DevRoleplaySwitcher.tsx`, `src/components/MobileSimpleHomeScreen.tsx`)**:
  - Menghapus skema peminjaman akun rekan kerja lain (seperti Deni Nugraha / Tigwa Anggawikara) yang dinilai tidak etis.
  - Menerapkan fitur **"Simulasi Tampilan Peran" (View-As-Role Lens)** yang sepenuhnya mempertahankan nama dan NIK pengguna sendiri (`Muhammad Naufalsar` / `02D25000055`) dengan overlay jabatan dan seksi yang disimulasikan.
  - Memperbarui daftar profil simulasi menjadi 10 peran operasional resmi PrepLab:
    1. **Crew** (Preparasi & Operasi Umum - P2H, KTA/TTA, WO, P5M)
    2. **Laboratory Foreman** (Pengawasan Analis & Pemantauan Lab)
    3. **Preparation Foreman** (Pengawasan Crusher & Alat Berat Preparasi)
    4. **Administration** (Pengelolaan Roster & SAP Management)
    5. **Inventory Control** (Distribusi APD, Dokumen Digital, Stok)
    6. **SPV Laboratory** (PIC Temuan Area Lab & Integritas Alat)
    7. **SPV Preparation** (PIC Temuan Area Prep & Monitoring P2H)
    8. **SPT Prep** (Dashboard Pengawasan Preparasi)
    9. **SPT Lab** (Dashboard Pengawasan Laboratorium)
    10. **Manager** (Executive Dashboard Helicopter View Seluruh Seksi)

## [2.9.25] - 2026-09-23

### 📋 Perbaikan Klasifikasi Kewajiban Inspeksi Mingguan & KTA/TTA untuk Personil Cuti Sebelum Jumat

- **Kewajiban Tugas Mingguan Berdasarkan Hari Kerja Aktif (`server/routes/misc.ts`)**:
  - **Aturan Operasional Lapangan**: Personil yang memiliki hari kerja aktif di site sebelum hari Jumat (Senin s.d. Kamis) tetap berstatus **WAJIB** menyelesaikan kewajiban tugas mingguan (Inspeksi Rutin Mingguan dan Laporan Observasi KTA/TTA), meskipun jadwal cuti/travel mereka dimulai pada pertengahan atau akhir pekan (misal: Kamis, Jumat, atau akhir pekan).
  - **Penambahan Helper Hari Kerja Pra-Jumat (`getWorkdayDatesBeforeFriday`)**: Menyaring 4 hari kerja pertama (Senin - Kamis) dalam minggu berjalan untuk memvalidasi apakah karyawan sempat bertugas di site sebelum cuti.
  - **Penyelarasan Klasifikasi Rekap (`getRekapPersonnelClassification`)**:
    - Karyawan yang bertugas pada Senin s.d. Kamis (seperti Muhamad Alvin Febriansyah, Muhammad Nova Herisandi, Nyong Dokolamo, Ayup Riyan Redondo, M. Harits Asyardy, dll.) otomatis diklasifikasikan sebagai **WAJIB** pada Rekap Inspeksi dan Rekap KTA/TTA.
    - Status **Cuti / Bebas Kewajiban** hanya diberikan kepada personil yang seluruh hari kerja efektifnya tercatat cuti penuh dari awal pekan.
- **Penyelarasan Tampilan Dashboard Hub Kepatuhan (`src/components/InspectionScheduleCard.tsx`)**:
  - **Pemisahan Logika Cuti Harian vs Cuti Mingguan**: Memisahkan status roster hari ini (`isRosterCutiToday` untuk checklist harian P2H/Pemantauan) dari status pembebasan kewajiban mingguan (`isWeeklyCuti` / `isWeeklyInspectionExempt`).
  - **Tampilan Kartu Tugas Mingguan Akurat**: Karyawan yang wajib mingguan namun sedang dalam jadwal travel/cuti harian hari ini tidak lagi salah ditampilkan sebagai *"🏖️ Sedang Cuti / Libur Roster (Bebas Tugas)"* atau *"Kewajiban K3L Dinonaktifkan"*, melainkan tetap menampilkan penugasan inspeksi aktif, target observasi KTA/TTA, dan progress bar kepatuhan mingguan yang sesungguhnya.

## [2.9.24] - 2026-09-23

### 🎖️ Perbaikan Layer Z-Index Modal Promosi Pangkat & Sinkronisasi Komentar / Lampiran Notion

- **Layer Z-Index Modal Promosi Pangkat (`src/components/PromotionWelcomeModal.tsx`)**:
  - **Akar Masalah**: Modal upacara promosi pangkat (`PromotionWelcomeModal`) sebelumnya menggunakan kelas `z-50`, sehingga saat tombol *"Promosi"* diklik di dalam Drawer Profil Karyawan (`z-[60]`), modal promosi tertutup dan berada di belakang panel profil.
  - **Perbaikan Layer Stacking**: Meningkatkan z-index backdrop dan wadah modal ke `z-[150]`, memastikan seluruh animasi piala, medali, sertifikat pangkat komando, dan efek kembang api selalu tampil prima di atas drawer profil dan modal lainnya.
- **Tampilan Balasan Komentar Bergaya Notion & Sinkronisasi Data (`src/components/NotionDatabaseTable.tsx`)**:
  - **Accordion Thread Balasan Notion**: Menerapkan tata letak berjenjang Notion dengan toggle collapsible *"Show N replies"* / *"Sembunyikan balasan"*, foto profil inisial, badge tamu, dan stempel waktu relatif.
  - **Grid Lampiran Foto Cerdas**: Menampilkan thumbnail foto lampiran dengan indikator overflow `+N Foto Lagi` dan pratinjau langsung resolusi tinggi melalui Google Drive.
  - **Pencegahan Peringatan Duplikasi Key React**: Memastikan seluruh kunci iterasi komentar dan balasan unik (`key={comment-id-index}`).
- **Pratinjau Layar Penuh Foto Galeri & Banner Dashboard (`src/components/TbpDashboard.tsx`)**:
  - **Pratinjau Interaktif Resolusi Tinggi**: Ke-4 kartu kanvas galeri foto kegiatan dan header banner utama kini dapat diklik langsung untuk membuka modal pratinjau layar penuh (*Image Lightbox*) beresolusi tinggi.
  - **Fitur Lengkap Pratinjau**: Mendukung *Zoom In / Zoom Out* (Ctrl + Scroll / tombol), geser posisi (*Pan & Drag*), putar arah (*Rotate*), unduh foto asli (*Download*), dan buka di tab baru.
  - **Kontrol Tombol Aksi Cerdas**: Tombol *"Lihat Layar Penuh"* dan *"Lihat Banner"* kini tersedia berdampingan dengan *"Ganti Foto / Teks"* sehingga pengguna dapat menikmati dokumentasi visual site secara utuh.
- **Penyempurnaan Navigasi Alias Dashboard (`src/components/TbpDashboard.tsx`)**:
  - Menambahkan dukungan alias pencarian untuk kategori seperti *Inventory* (*Warehouse / Inventory Control*) dan *General Issue*.

## [2.9.23] - 2026-09-22

### 🔍 Perbaikan Tombol "Lihat SS" Inspeksi Mingguan (Pratinjau Langsung vs Form Upload)

- **Pembukaan Langsung Pratinjau Bukti Screenshot (`src/components/InspectionScheduleCard.tsx`)**:
  - **Akar Masalah**: Tombol *"Lihat SS"* sebelumnya memanggil `setShowSsModal(true)` yang merupakan dialog formulir upload/ganti screenshot. Di dalam dialog tersebut, variabel pratinjau gambar baru (`ssImagePreview`) bernilai `null` saat modal dibuka, sehingga dialog menampilkan area unggah kosong (*"Klik untuk pilih gambar atau tekan Ctrl + V"*) dan membuat pengguna merasa diminta mengunggah ulang padahal screenshot sudah tersimpan di server.
  - **Pratinjau Instan Layar Penuh (Lightbox)**: Tombol *"Lihat SS"* kini terhubung ke `handleViewSsProof()` yang langsung membuka *lightbox modal* resolusi tinggi (`setLightboxUrl`) untuk melihat screenshot yang sudah tersimpan (`ssProofUrl`), baik dari memori, cache lokal, maupun sinkronisasi otomatis dari API `/api/inspection-proofs`.
  - **Penyempurnaan Modal Upload/Ganti Screenshot**:
    - Jika pengguna membuka dialog upload saat screenshot sudah ada, dialog kini secara eksplisit menampilkan screenshot aktif saat ini dengan status badge *"✓ Screenshot Sudah Terunggah"* dan tombol *"Lihat Layar Penuh"*, serta menyediakan opsi jelas *"Ganti dengan Screenshot Baru"*.
  - **Kontrol Tambahan pada Lightbox**: Lightbox pratinjau kini dilengkapi tombol *"Ganti / Upload Ulang"*, *"Buka di Tab Baru"*, dan *"Tutup Pratinjau"*, memberikan alur interaksi yang sangat intuitif.

## [2.9.22] - 2026-09-22

### 🎯 Kartu Ringkasan Interaktif Status Laporan SAP Management (Sudah, Belum, Cuti, Total Wajib)

- **Filter Cepat Berbasis Kartu Ringkasan (`src/components/GroupReportScreen.tsx`)**:
  - **Interaktivitas Kartu Status**: Seluruh kartu ringkasan di bagian atas (*Total Wajib*, *Sudah*, *Belum*, dan *Sedang Cuti*) pada sub-tab **Rekap Inspeksi** dan **Rekap KTA/TTA** kini dapat diklik langsung untuk memfilter daftar personil secara instan.
  - **Mekanisme Toggle Cerdas**: Mengklik kartu yang sedang aktif akan otomatis membatalkan filter dan mengembalikan tampilan ke seluruh personil (`Semua`), sedangkan mengklik kartu lain akan langsung memfilter personil sesuai status tersebut.
  - **Sinkronisasi Visual & Feedback Indikator**: Kartu yang aktif kini dilengkapi dengan *ring highlight*, kontras latar belakang lebih tinggi, label status *"Aktif"*, efek *hover scale*, dan tersinkronisasi dua arah dengan tombol filter pil di bagian bawah.

## [2.9.21] - 2026-09-22

### 💬 Perbaikan Duplikasi Pesan Chat (3x) & Sinkronisasi Multi-Localhost / Identitas Pengirim

- **Eliminasi Total Duplikasi Pesan Chat (`server.ts`, `src/components/ChatScreen.tsx`)**:
  - **Akar Masalah Pesan Terkirim 3x**:
    1. *Optimistic Rendering*: Frontend menambahkan pesan sementara dengan `id: Date.now()`.
    2. *Socket ID Mismatch & Double Broadcast*: Server sebelumnya membuat ID acak baru (`id: Date.now()`) yang berbeda milidetik dari client dan menyiarkan dua event sekaligus (`new_message` dan `chat:broadcast`), sehingga filter client menganggapnya sebagai pesan baru dan menampilkan duplikat ke-2.
    3. *Polling Background (`fetchHistory`)*: Polling setiap 3.5 detik mengambil data dari PostgreSQL di mana kolom ID berupa SERIAL integer (misal `435`), sehingga tidak cocok dengan ID timestamp client dan menambahkan duplikat ke-3.
  - **Solusi Komprehensif**:
    - Backend kini memanfaatkan `.returning()` pada `db.insert(chatMessages)` untuk menangkap integer ID kanonikal Postgres riil dan mengembalikannya ke socket event.
    - Menghapus siaran ganda `chat:broadcast` dan hanya menggunakan satu event kanonikal `new_message`.
    - Menambahkan `clientMsgId` unik (`c_<timestamp>_<rand>`) pada pesan optimistik; saat konfirmasi socket atau sinkronisasi database tiba, pesan optimistik digantikan secara *in-place* tanpa menambah baris baru.
    - Pengurutan riwayat pesan kini 100% konsisten secara kronologis berdasarkan `timestamp`, bukan integer ID yang sebelumnya tercampur dengan timestamp ms.
- **Klarifikasi Identitas Pengirim Chat Antar Localhost (`src/components/ChatScreen.tsx`)**:
  - Menjelaskan bahwa kedua instans pengembang terhubung ke basis data Cloud SQL yang sama. Saat Anugrah mengirim pesan uji coba dengan kata `"test"` atau `"tes"` dari localhost-nya, database menyimpannya secara valid dengan NIK dan nama Anugrah.
  - Indikator pesan keluar kini menampilkan secara eksplisit: `Anda (<Nama Depan>)` (misal `Anda (Alvin)`), sehingga tidak ada lagi kerancuan antara pesan sendiri dan pesan dari rekan kerja yang sedang bersamaan melakukan pengujian.

## [2.9.20] - 2026-09-22

### ⚡ Pemulihan Realtime Chat Room & Presensi Karyawan Online, Serta Pemisahan Seksi Maintenance & Administration

- **Pemisahan Presisi Seksi Maintenance & Administration pada Leaderboard & Chat (`server/routes/gamification.ts`, `src/components/ChatScreen.tsx`)**:
  - **Penyebab Masalah**: Sebelumnya kata kunci `LAB` / `PREP` dievaluasi terlalu agresif sehingga jabatan teknis majemuk (seperti *"Laboratory Maintenance Foreman"*, *"Crew, Laboratory Maintenance"*, *"Admin, Preparation & Laboratory"*) keliru diserap ke dalam seksi *Laboratory* dan *Preparation*, menyebabkan seksi *Maintenance* dan *Administration* kosong (0 personil).
  - **Perbaikan Urutan Normalisasi (`normalizeSection`)**: Memprioritaskan kata kunci spesifik `Quality Assurance`, `Maintenance` (`MAINT`, `BENGKEL`, `MEKANIK`, `ELEKTRIK`), `Inventory Control`, dan `Administration` (`ADMIN`, `FINANCE`, `HR`) sebelum pencocokan umum `Laboratory` dan `Preparation`.
  - **Hasil Evaluasi Riil**: Pemetaan personil kini akurat 100% pada Leaderboard: **Maintenance (22 personil)** (seperti La Alwino La Ode Pudu, Yulianus Tiku Mangando, Burhanudin La Wio), **Administration (4 personil)** (seperti Agung Adi Putra Prasetyo, Muhammad Iqbal), **Quality Assurance (2 personil)**, **Inventory Control (5 personil)**, **Preparation (122 personil)**, dan **Laboratory (107 personil)**.
- **Infrastruktur Real-Time Chat & Presensi Karyawan Online Portal (`server.ts`, `src/lib/socketClient.ts`, `src/App.tsx`, `src/components/ChatScreen.tsx`)**:
  - **Presensi Global Portal Real-Time**: Setiap karyawan yang membuka portal kini otomatis mendaftarkan status online ke server (`presence:join` & `presence:ping`) melalui singleton socket `src/lib/socketClient.ts`. Bilah obrolan chat room kini menampilkan dua indikator: *Pengguna di Room Ini* dan *Karyawan Online di Portal*.
  - **Streaming Obrolan Real-Time Tanpa Reload**:
    - Menghilangkan pemutusan socket (*socket.disconnect*) yang sebelumnya selalu memutus koneksi setiap kali pengguna berganti tab chat atau beralih seksi.
    - Menambahkan mekanisme auto re-join ruangan obrolan aktif secara otomatis saat peramban tersambung kembali (*reconnect* / *wake from sleep*).
    - Menerapkan *dual-path broadcast* (`new_message` dan `chat:broadcast`) pada backend serta *optimistic instant rendering* (0ms) di sisi pengirim.
    - Dilengkapi *heartbeat polling fallback* otomatis setiap 3.5 detik dan sinkronisasi instan saat tab peramban kembali aktif (*focus* / *visibilitychange*), menjamin tidak ada pesan yang tertinggal meski jaringan area tambang sempat terputus.
  - **Bilah Pemilih Pengguna Online**: Pengguna dapat dengan mudah beralih antara melihat personil di ruangan aktif (`Room (X)`) atau seluruh rekan kerja yang aktif di portal (`Semua Portal (Y)`), lengkap dengan fitur klik untuk *mention* langsung (`@Nama`).

## [2.9.19] - 2026-09-22

### 📖 Standardisasi KBBI Perawatan Pabrik & Integrasi AI Refine Khusus ROUTR & Bandelbanget (Tanpa Gemini & OpenAI)

- **Standardisasi Kata Baku KBBI & Pemisahan Terminologi Lapangan (`src/utils/kbbi-maintenance-corrector.ts`)**:
  - **Koreksi Oven & Variasi Fonem F/V/P**: Memperbaiki kata non-baku `ofen`, `open`, `ovent` menjadi kata baku KBBI `oven`. Memperluas pemetaan fonem teknis seperti `fentilasi` -> `ventilasi`, `facum/pakum` -> `vakum`, `valv/falv/pelp` -> `valve` / `katup`, `fiting` -> `fitting`, `kwalitas` -> `kualitas`, `analisa` -> `analisis`, `praktek` -> `praktik`, dan `jadual` -> `jadwal`.
  - **Pemulihan Istilah Operasional Tambang `manhaul`**: Memulihkan dan mengamankan kata `manhaul` (*bus / kendaraan angkut personel tambang*) agar tidak terhapus atau tertukar dengan `manhole` (*lubang inspeksi tangki/cerobong*).
  - **Kamus Peralatan & Gelas Laboratorium Preparasi**: Menambahkan istilah baku peralatan analitis dan lab basah (*buret, pipet, erlenmeyer, desikator, gelas beker, tanur muffle, sentrifugasi, hotplate*).
  - **Pencegahan False Positive**: Memperbaiki mesin deteksi typo sehingga kata yang sudah baku (seperti `oven`, `rusak`, `bocor`) tidak lagi terdeteksi keliru sebagai typo, serta meniadakan duplikasi kata berulang saat proses penggantian.
- **Penyempurnaan AI Laporan Maintenance Murni Non-Gemini & Non-OpenAI (`server/routes/kbbi.ts`, `server.ts`, `src/components/KbbiCorrectorWidget.tsx`)**:
  - **Eksklusif ROUTR & Bandelbanget**: Menghubungkan fitur *Koreksi Otomatis KBBI* ke API endpoint backend `POST /api/kbbi/refine` yang ditenagai murni oleh `ROUTR_API_KEY` (model `glm-5.3` dan `claude-sonnet-4.6`) serta fallback `BANDELBANGET_API_KEY` (model `deepseek-chat`). Sama sekali tidak menggunakan `GEMINI_API_KEY` maupun `OPENAI_API_KEY`.
  - **Respons Instan + Polishing Cerdas**: Koreksi aturan lokal berjalan seketika (0ms) di browser, disusul perapian tata bahasa AI dengan indikator loading animasi halus pada tombol widget.
- **Pembersihan Referensi Gemini & OpenAI (`server/routes/finance.ts`, `server/routes/labbot.ts`)**:
  - Menghapus total pengecekan dan ketergantungan `GEMINI_API_KEY` dan `OPENAI_API_KEY` serta menghapus hardcoded fallback tokens lama pada modul scan struk keuangan dan LabBot. Keduanya kini murni berjalan pada `ROUTR_API_KEY` dan `BANDELBANGET_API_KEY`.

## [2.9.18] - 2026-09-22

### 🛡️ Perbaikan Resolusi Seksi Laboratory, Pemulihan Display Akumulasi EXP & Hak Akses Developer / SAP QA (Sukarman)

- **Perbaikan Resolusi Seksi Laboratory (`server/routes/gamification.ts`, `src/App.tsx`, `src/components/LeaderboardScreen.tsx`)**:
  - Memperbaiki fungsi `normalizeSection`: Pengecekan kata kunci seksi (`s`) dan posisi (`p`) kini diprioritaskan sebelum memeriksa departemen (`d`). Kata kunci `LAB` / `KIMIA` / `XRF` dievaluasi mendahului `PREP` sehingga departemen gabungan `"Preparation & Laboratory"` tidak lagi salah memetakan personil Laboratory menjadi `'Preparation'`.
  - Mengirimkan prop `userProfile={userProfile}` ke komponen `<LeaderboardScreen>` di `src/App.tsx` sehingga kartu perangkat yang disematkan (*pinned row*) tidak lagi jatuh ke fallback default `'Preparation [TBP]'`, melainkan menampilkan data riil karyawan: `'Laboratory [GPS]'`.
- **Pemulihan Tampilan Akumulasi EXP Perangkat Pengembang (`src/components/LeaderboardScreen.tsx`)**:
  - Membersihkan *stale cache* lokal browser yang menyimpan nilai sementara dari pengujian kuis sebelumnya (`140 XP` season / `250 XP` total).
  - Menyinkronkan perolehan EXP riil operasional pada baris Game Master / Developer (Total EXP riil: **5,190 XP**, Season EXP: **710 XP**) dengan fallback otomatis ke `currentDevEntry` bila data profil sedang dimuat.
- **Pembukaan Hak Akses Penuh SAP Management & Menu Developer untuk Sukarman (QA) (`server.ts`, `server/middleware/auth.ts`, `src/App.tsx`, `src/components/home-screen.tsx`, `src/components/ModulesDrawer.tsx`, `src/components/modules-screen.tsx`)**:
  - **Pendaftaran Endpoint Publik Developer (`server.ts`)**: Mendaftarkan rute `/api/developers` ke dalam `PUBLIC_API_PREFIXES` agar pemanggilan `fetch('/api/developers')` dari sisi antarmuka pengguna tidak lagi ditolak dengan kode error *HTTP 401 Unauthorized*.
  - **Dukungan Seksi Quality Assurance (QA)**: Memperluas validasi `isAdminOrDeveloper` dan `isAdminRole` di seluruh antarmuka dan backend agar mencakup seksi `QA` / `Quality Assurance` dan jabatan `QA`.
  - **Pendaftaran NIK Developer Eksplisit**: Memasukkan NIK Sukarman A. Akil, ST (`04D21001047`) dan Junjunan Muhammad Syukur (`04D24000042`) ke dalam daftar pengenal pengembang terpercaya (*developer allowlist*) sehingga menu Developer dan peluncur *SAP Management* aktif dan terbuka penuh saat login.
- **Format Daftar Minimalis Rapi Deskripsi Temuan K3, Ketidakpatuhan APD & Stok Kotak P3K (`src/components/StructuredFindingList.tsx`, `src/components/ticket-screen.tsx`, `src/components/sap-dashboard.tsx`, `src/components/OpenFindingsReminderModal.tsx`)**:
  - Mengonversi deskripsi temuan yang sebelumnya menumpuk dalam satu paragraf teks mentah menjadi format daftar bernomor (*numbered list*) yang bersih, rapi, dan minimalis.
  - **Dukungan Temuan APD**: Otomatis mengekstrak nomor urut, nama personil (`text-slate-900 font-bold`), seksi/posisi, item APD yang tidak lengkap (`Tidak lengkap: Sepatu, ...`), serta catatan terkait.
  - **Dukungan Temuan Stok P3K**: Otomatis mengenali deskripsi temuan P3K (seperti *Kekurangan Stok Item Kotak P3K: Gunting: Stok Kosong, Lampu senter: Stok Kosong, ...*) dan mengonversinya menjadi daftar terstruktur bernomor dengan nama item dalam cetak tebal kontras tinggi (`text-slate-900 font-bold`), tanda pisah, dan status stok merah tegas (`text-rose-600 font-semibold`). Mendukung nama item dengan koma desimal seperti *Sodium Chloride 0,9%* dan spesifikasi ukuran/merek dalam tanda kurung secara presisi.
  - Menyediakan tampilan *CompactFindingPreview* untuk pratinjau ringkas pada kartu daftar tiket dan modal pengingat temuan terbuka.

## [2.9.17] - 2026-09-21

### 🎖️ Sistem Notifikasi Perayaan Gamifikasi 5-Tingkat & Pembaruan Leaderboard Top 10 + Game Master (GM)

- **Sistem Pop-Up Notifikasi & Perayaan 5-Tingkat (`src/components/GamificationAlertCenter.tsx`, `src/lib/gamificationEvents.ts`)**:
  - **Pop-Up Kecil (Perolehan EXP Interaktif)**:
    - Menampilkan *floating pill toast* elegan di sudut kanan atas layar setiap kali pengguna menyelesaikan aktivitas yang menghasilkan EXP (Inspeksi Lapangan +50 EXP, Penuntasan Work Order +60 EXP, Pengajuan WO +40 EXP, Laporan KTA/TTA +35 EXP, Kuis SOP/K3 100% +250 EXP, Laporan Bug/Saran +100 EXP, dan Kustomisasi Tema +40 EXP).
    - Dilengkapi *dual-tone chime* murni via Web Audio API synthesizer tanpa ketergantungan berkas audio eksternal.
  - **Pop-Up Sedang (Pencapaian Lencana Tier Biasa)**:
    - Modal kartu prestasi militer ketika membuka Tier 1 (Bronze), Tier 2 (Silver), atau Tier 3 (Gold) lengkap dengan perolehan bonus EXP dan gelar penghargaan.
  - **Pop-Up Mewah (Lencana Master Tier 4 Tertinggi)**:
    - Layar perayaan megah dengan efek semburan partikel emas dinamis (*HTML5 Canvas*), mahkota lencana Master, bingkai avatar eksklusif, serta opsi langsung memasang gelar kehormatan aktif.
  - **Pop-Up Sedang (Kenaikan Pangkat Biasa Pangkat #2 s.d. #50)**:
    - Upacara promosi taktis militer menampilkan lambang pangkat baru, perbandingan pangkat lama vs baru, dan akumulasi total EXP.
  - **Pop-Up Mewah (Kenaikan Pangkat Bintang 5 Supreme Vanguard Commander - Pangkat #51)**:
    - Upacara kenetralan komando tertinggi dengan animasi sinar radial emas berputar, lencana bintang 5 merah-emas legendaris, partikel selebrasi imperial, dan hak istimewa *Hall of Fame Abadi*.
- **Pembaruan Leaderboard Kompetitif & Integrasi Pangkat GM (`src/components/LeaderboardScreen.tsx`, `server/routes/gamification.ts`)**:
  - **Filter Top 10 Bersih per Kategori/Disiplin**:
    - Tabel leaderboard kompetitif kini membatasi tampilan hanya untuk 10 besar personil terbaik per kategori.
    - **Pinned Baris "Posisi Anda"**: Jika personil yang sedang login berada di luar 10 besar (atau berstatus Developer), kartu perangkat saya secara otomatis disematkan tepat di bawah baris ke-10 dengan pemisah visual bertuliskan *Posisi Anda Saat Ini*.
  - **Rank 0: Game Master (GM) pada Tab "Daftar Pangkat & Personel"**:
    - Menampilkan lencana hitam-emas minimalis Rank 0: Game Master (GM) di posisi paling terhormat untuk tim pengembang sistem PrepLab.
    - Personil developer tercantum rapi di bawah Rank GM tanpa mengintervensi atau merebut podium kompetitif Top 10 personil operasional lapangan.
- **Auto-Diffing Real-Time Latar Belakang**:
  - Otomatis mendeteksi kenaikan pangkat dan pencapaian lencana baru dari respon API `/api/gamification/user-stats/:nik` saat kembali aktif atau event `gamification_updated` dipicu, tanpa perlu me-refresh peramban secara manual.

## [2.9.16] - 2026-09-20

### 🔬 Penyelarasan Kamus KBBI & Korektor Teks Khusus Preparation & Laboratory Nikel

- **Pembersihan Kosakata Alat Berat / Tambang Terbuka (`src/utils/kbbi-maintenance-corrector.ts`)**:
  - Menghapus seluruh entri istilah tambang/hauling luar ruangan yang tidak relevan dengan operasional PrepLab (seperti *manhaul bus operasional tambang*, *dump truck*, *excavator*, *bulldozer*, *motor grader*, *compactor*, *water truck*, dll.).
  - Mengoreksi penanganan kata `menhol` / `manhol` / `manhole`: kini secara akurat didefinisikan sebagai **`manhole (lubang inspeksi)`** untuk akses pemeriksaan/perawatan tabung tangki udara kompresor, bejana tekan (*pressure vessel*), saluran pipa, atau cerobong hisap *dust collector*, bukan lagi terdeteksi sebagai bus tambang (*manhaul*).
- **Pengayaan Kosakata Baku Khusus Preparation & Laboratory Sampel Nikel**:
  - **Area Preparasi Sampel**: Menambahkan terminologi baku untuk *jaw crusher* (jaw plate / pelat rahang, toggle plate, flywheel), *roll crusher*, *pulverizer* (mangkuk giling / bowl mill, cincin puck), *riffle splitter*, *rotary sample divider (RSD)*, *sieve shaker*, *ayakan wiremesh*, *oven dryer pengering sampel nikel (105°C)*, *baki sampel (drying tray)*, *sekop JIS 30D*, dan *troli sampel*.
  - **Area Laboratorium & Spektrometri**: Menambahkan istilah resmi untuk *spektrometer XRF (Zetium)*, *mesin pres pelet (pellet press)*, *die set cetakan pelet*, *cup aluminium*, *asam borat binder*, *mesin fusi manik kaca (fluxer XRF)*, *cawan & cetakan platina (platinum crucible/mould Pt-Au)*, *tanur suhu tinggi (muffle furnace LOI 1000°C)*, *lemari asam (fume hood)*, *wet scrubber*, *pelat pemanas (hot plate)*, *water purifier / air demineralisasi*, *buret titrasi*, *desikator silika gel*, *neraca analitik (presisi 0.1 mg)*, *termokopel sensor suhu*, *water chiller*, serta gas ultra murni (*argon UHP*, *gas P10*).
  - **Matriks Nikel & Kontrol Mutu**: Menyelaraskan istilah matriks *sampel saprolit (high Ni)*, *sampel limonit (high Fe)*, *kadar air (moisture content)*, *Loss on Ignition (LOI / hilang pijar)*, *CRM (Certified Reference Material)*, *sampel duplikat QC*, *larutan blangko*, dan *reagen analitis*.
- **Pembaruan Template Deskripsi Kerusakan Cepat**:
  - Mengganti kategori alat berat dengan kategori khusus: **Preparasi Sampel Nikel (Prep)**, **Laboratorium Kimia, XRF & Spektrometri**, **Utilitas PrepLab (Kompresor, Manhole & Dust Collector)**, **Kelistrikan & Motor Dinamo**, serta **Mekanikal, Baut & Pelumasan**.

## [2.9.15] - 2026-09-20

### 📊 Dukungan Upload Berkas 30MB+ & Interactive Excel Spreadsheet Viewer pada P5M

- **Peningkatan Kapasitas Upload Materi P5M hingga 30MB+ (`server.ts` & `src/components/p5m-screen.tsx`)**:
  - Menaikkan batas ukuran upload berkas pada form Tambah/Edit Materi P5M dari sebelumnya 10MB menjadi **30MB** (memenuhi dan melampaui kebutuhan 20MB+).
  - Meningkatkan limit payload `express.json` dan `express.urlencoded` di backend `server.ts` menjadi **50MB**, mencegah galat HTTP 413 (*Payload Too Large*) saat mengirim data dokumen/spreadsheet terenkripsi base64 berukuran besar.
  - Memberikan indikator peringatan ukuran berkas real-time pada kartu upload jika melebihi batas 30MB.
- **Dukungan Penuh Format Spreadsheet Excel (`.xlsx` & `.xls`)**:
  - Mengizinkan upload berkas dokumen Microsoft Excel (`.xlsx`, `.xls`) pada form materi baru di samping gambar flyer (`image/*`) dan PDF (`.pdf`).
  - Menjaga ekstensi asli berkas saat disimpan ke Google Drive / local storage dan menyematkan MIME type resmi (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` / `application/vnd.ms-excel`).
- **Interactive In-App Excel Viewer (`src/components/ExcelViewer.tsx`)**:
  - Menghadirkan viewer spreadsheet interaktif bertenaga SheetJS langsung di dalam modal pratinjau materi portal.
  - Fitur penjelajah multi-sheet: beralih tab sheet secara mulus dengan indikator jumlah baris dan kolom.
  - Bilah pencarian instan: filter dan cari cell/kata kunci di seluruh baris tabel secara real-time.
  - Tampilan grid tabel spreadsheet lengkap dengan header abjad kolom (A, B, C...) dan nomor baris (1, 2, 3...) bergaya modern dark mode.
  - Tombol unduh langsung berkas spreadsheet asli (`.xlsx`) dan badge khusus `📊 Excel` pada tabel Bank Materi.

## [2.9.14] - 2026-09-20

### 🔄 Sinkronisasi Roster Mingguan P5M & Smart Positioning Popover Editor

- **Penyelarasan Roster P5M Berbasis Periode Minggu Aktif (`server/routes/p5m.ts` & `src/components/p5m-screen.tsx`)**:
  - Mengeliminasi regresi tanggal usang di mana sistem sebelumnya memuat jadwal minggu lalu (14–20 Sep 2026) secara otomatis saat portal dibuka, sehingga personil seperti Muhammad Furqan sempat berstatus `(N)` (Night Shift lama).
  - Mengimplementasikan penentuan default tanggal cerdas: otomatis menetapkan target ke hari Senin minggu baru (**21 September 2026**) ketika dibuka pada akhir pekan (Minggu, 20 September 2026).
  - Menambahkan dukungan parameter `weekDate` pada endpoint `/api/p5m/schedules/latest`, memastikan jadwal tersimpan dan ketersediaan personil (`karyawanPool`) disinkronkan tepat per minggu target.
  - Memperkuat fungsi pembacaan tanggal `getWeekDates` di backend untuk menangani format `DD/MM/YYYY` dengan garis miring secara presisi tanpa menghasilkan *Invalid Date*.
- **Smart Positioning Dropdown Pemilih Materi & Personil (`src/components/p5m-screen.tsx`)**:
  - Mengatasi kendala popover *"Cari materi briefing"* yang terpotong/tertutup oleh batas footer pada baris Night Shift paling bawah.
  - Menerapkan arah membuka adaptif: popover pada sesi **Night Shift** otomatis membuka ke arah **ATAS (`bottom-full mb-1.5`)** melayang leluasa di area Day Shift yang lapang.
  - Menyelaraskan popover kolom tepi kanan (Jumat, Sabtu, Minggu) merapat ke sisi kanan (`right-0`) agar tidak keluar dari batas horizontal layar.
  - Menambahkan backdrop transparan untuk interaksi klik-di-luar (*click outside*) yang menutup dropdown secara otomatis.
  - Mengaktifkan `overflow-visible` dengan padding bawah adaptif (`pb-16`) pada kontainer tabel selama mode edit aktif.

## [2.9.13] - 2026-09-20

### 📘 Pengaktifan Materi SOP & IK P5M, Proporsi Toolbar Responsif & Penyelarasan Roster Cuti

- **Pengaktifan Penuh Seluruh Dokumen SOP & IK pada P5M Schedule Builder (`server/routes/p5m.ts`)**:
  - Mengintegrasikan seluruh 44 dokumen materi SOP (Standar Operasional Prosedur) dan IK (Instruksi Kerja) ke dalam mesin acak jadwal P5M otomatis untuk sesi Gabungan maupun Split.
  - Menyeleraskan topik SOP/IK dengan divisi pembawa materi (misalnya presenter Lab membawakan IK Lab/Pencucian Platinum Ware, presenter Prep membawakan IK Crusher/Mixer, dst.).
  - Mengeliminasi peringatan daur ulang materi semu dan memprioritaskan seluruh materi SOP/IK fresh sebelum mendaur ulang materi lama.
  - Menambahkan opsi kategori baru **`📘 SOP & IK`** pada *Konfigurasi Slot Hari* serta tombol aksi cepat **`Reset SOP & IK`** langsung di tab Jadwal dan di dalam kotak notifikasi peringatan.
- **Optimalisasi Proporsi Bilah Menu (Toolbar) P5M Builder (`src/components/p5m-screen.tsx`)**:
  - Memperbaiki styling tombol toolbar menggunakan kelas `w-auto` dan `whitespace-nowrap`, mencegah ekspansi paksa `w-full` (100% lebar kontainer) yang sebelumnya membuat tombol bertumpuk ke bawah.
  - Mengelompokkan tombol secara rapi dan seimbang: sisi kiri untuk aksi builder (*Acak*, *Edit Manual*, *Konfigurasi Slot*, *Reset SOP/IK*) dan sisi kanan untuk aksi berkas (*Ekspor Excel*, *Unduh PNG*, *Simpan Jadwal*).
- **Penyelarasan Akurat Tanggal Cuti Profil Personil (`src/pages/ProfilePage.tsx`)**:
  - Memperbarui resolusi tanggal cuti aktual pada kartu profil personil dengan mengutamakan `outsiteDate` / `nextTrvDate` hasil perhitungan master roster, memastikan tanggal awal cuti (misal: 24 September 2026) tampil 100% akurat dan sinkron dengan Master Spreadsheet HR.

## [2.9.12] - 2026-09-20

### 🎖️ Penyempurnaan Terminologi Pangkat Kehormatan, Modal Audit EXP & Hall of Fame

- **Standardisasi Terminologi Pangkat Profesional**:
  - Menggantikan seluruh nomenklatur game (*"PB / Point Blank"*) menjadi istilah komando kehormatan korporat (*"Pangkat Kehormatan Preplab Vanguard"*, *"Pangkat Kehormatan (Level 1–51)"*, *"Gelar Kehormatan Taktis"*, dan *"Pencapaian Rahasia Operasional"*).
  - Memperbarui teks pada pop-up upacara promosi awal (`PromotionWelcomeModal.tsx`), podium top 3 leaderboard, tabel klasemen bulanan (`LeaderboardScreen.tsx`), modal transparansi EXP (`ExpAuditModal.tsx`), serta drawer modul navigasi (`ModulesDrawer.tsx`).
- **Modal Audit Transparansi Perolehan EXP Personil (`ExpAuditModal.tsx`)**:
  - Fitur pencarian instan nama/NIK personil untuk memeriksa seluruh rekapitulasi poin EXP dari beragam instrumen (Inspeksi K3, Laporan KTA, Tema Desain, Kuis 100, dsb.) secara transparan.
- **Fitur Import Excel Roster Langsung dari PC Admin (`RosterExcelImportModal.tsx` & `excelRosterParser.ts`)**:
  - Menyediakan modal import file spreadsheet `.xlsx` / `.xls` langsung dari komputer admin untuk mempercepat dan mempermudah alur pembaruan roster operasional.
  - Mendukung pembacaan sheet `Staff` (`Rooster_Staff`), `Crew` (`Rooster_Crew`), dan `CutiTahunan` dengan live preview instan (< 1 detik).
  - Menampilkan ringkasan metrik sebelum disimpan: jumlah personil terdeteksi, rentang tanggal (mulai–selesai), total entri shift, dan opsi fleksibel (update profil, jadwal shift, atau kuota cuti).
  - Dilengkapi tombol **Unduh Template Excel Resmi** untuk standarisasi format file admin.
  - Endpoint berkecepatan tinggi `POST /api/roster/import-excel` dengan chunked upsert dan otomatisasi refresh cache roster.
- **Opsi Keterangan Roster XP (Penyesuaian Jadwal Speedboat) dengan Warna Khas (`roster-admin-screen.tsx` & `adm-dashboard.tsx`)**:
  - Menambahkan kode status `XP` (*Speedboat*) ke daftar opsi preset edit shift admin lengkap dengan label `"XP (Speedboat)"` dan deskripsi `"Penyesuaian Jadwal Speedboat"`.
  - Menerapkan palet warna *Cyan Maritim* yang berbeda dan mencolok (`bg-cyan-500/20 text-cyan-700 border-cyan-500/40 ring-1 ring-cyan-500/25`) pada sel tabel matriks roster, popover editor sel, legenda status, dan daftar absensi harian administrasi (`adm-dashboard.tsx`).
- **Penyempurnaan Hall of Fame & Batas Cabang Prestasi**:
  - Memastikan Hall of Fame akhir musim tetap tampil terbuka dan permanen untuk apresiasi pencapaian personil terbaik.
  - Menyelaraskan perhitungan cabang prestasi aktif personil agar konsisten dengan 12 cabang achievement sistem.

## [2.9.11] - 2026-09-19

### ⏱️ Format Durasi Jam & Menit Eksplisit, Interaktivitas Filter Grafik Batang, & Presisi Proporsi Kategori

- **Format Tampilan Downtime Eksplisit Jam & Menit (`src/lib/downtimeHelper.ts` & `src/components/wo-maintenance-dashboard.tsx`)**:
  - Mengubah tampilan downtime pada tabel desktop dan kartu mobile dari format desimal (`2.7 Jam`) menjadi durasi eksplisit jam dan menit (`2 Jam 44 Menit`, `1 Jam 42 Menit`, `6 Jam 19 Menit`, `0 Jam 7 Menit`) sehingga teknisi dan manajemen dapat mengetahui jumlah menit secara pasti.
  - Memperbarui fungsi `formatDowntimeDisplay`: memprioritaskan kalkulasi durasi aktual dari stempel waktu mulai dan selesai perbaikan (`repair_start` & `repair_end`), mempertahankan format string `X Jam Y Menit`, serta mengonversi nilai desimal menjadi jam dan menit yang presisi.
  - Menyesuaikan proporsi kolom tabel (`colgroup`): memperlebar kolom Downtime dari `5%` menjadi `8%` sehingga teks durasi jam dan menit muat rapi dalam satu baris lencana tanpa terpotong.
- **Filter Interaktif Satu-Klik pada Grafik Batang Downtime per Alat**:
  - Mengaktifkan interaktivitas klik pada grafik batang *Downtime per Alat*: mengeklik batang alat (misal: *Gerobak Arco*) otomatis memfilter tabel rincian ke alat tersebut dan melakukan *smooth scroll* langsung ke tabel rincian.
  - Batang yang terpilih diberi sorotan warna amber khusus (`#f59e0b` dengan garis tepi kontras) untuk visual feedback yang jelas.
  - Menampilkan lencana filter aktif di judul tabel (`Alat: Gerobak Arco`) lengkap dengan tombol `[×]` untuk mereset filter. Mengeklik kembali batang yang sama juga membatalkan pilihan (*toggle filter*).
  - Menambahkan kursor *pointer* dan teks bantuan tooltip: `👉 Klik batang untuk memfilter tabel rincian`.
- **Perbaikan Proporsi Diagram Lingkaran Kategori & Pembulatan Maksimal 2 Desimal**:
  - Mengoreksi sumber data *Proporsi Downtime Kategori* (`Doughnut Chart`) agar membaca ringkasan kategori keseluruhan periode aktif (`categorySummary`) sehingga proporsi perbandingan Instrument vs Non-Instrument tetap akurat (tidak lagi menciut menjadi 100% teal saat tab kategori Non-Instr aktif).
  - Menghilangkan artefak desimal pecahan *floating-point* (seperti `208.29999999999995 Jam` dan `96.00000000000001 Jam`) dengan pembulatan bersih maksimal 2 desimal (`208.3 Jam` dan `96 Jam`).
  - Menambahkan persentase proporsi pada tooltip diagram lingkaran (`X Jam (Y%)`).
  - Mengubah kartu ringkasan kategori menjadi tombol interaktif untuk mempermudah beralih filter kategori.

## [2.9.10] - 2026-09-19

### ⏱️ Perbaikan Otomatisasi & Pemulihan Downtime Work Order Closed

- **Pemulihan & Kalkulasi Akurat Seluruh WO Closed Agustus - September 2026 (`scripts/fix-closed-wo-downtime.cjs`)**:
  - Mengidentifikasi dan memulihkan 80 kasus Work Order berstatus `Closed` pada periode Agustus - September 2026 yang sebelumnya kehilangan nilai downtime (tampil `-` / 0 jam).
  - Melakukan komputasi ulang durasi downtime berdasarkan selisih waktu aktual pelaporan/mulai perbaikan (`date` / `repair_start`) hingga selesai perbaikan (`repair_end`) ke dalam format standar `X Jam Y Menit` (misal: `WO-260913-420` menjadi `2 Jam 44 Menit [2.7 Jam]`, `WO-260915-282` menjadi `1 Jam 42 Menit [1.7 Jam]`, `WO-260916-668` menjadi `6 Jam 19 Menit [6.3 Jam]`, dan `WO-260916-971` menjadi `0 Jam 7 Menit [0.1 Jam]`).
  - Rekor pemutihan 259 tiket periode Juni - Juli tetap terjaga tanpa terpengaruh.
- **Otomatisasi Penyimpanan Downtime di Backend (`server/routes/workOrders.ts`)**:
  - Memperbaiki endpoint `PUT /api/work-orders/:woId` agar saat status WO diubah menjadi `Closed`:
    - Otomatis menetapkan `repairEnd` (jika belum ada).
    - Otomatis mengisi `repairStart` dari waktu lapor WO (`date`) jika teknisi langsung menyelesaikan dari status `Open`.
    - Otomatis menghitung dan menyimpan `downtimeDuration` secara permanen ke database PostgreSQL `work_orders` sebelum eksekusi selesai.
- **Parser Downtime Terpadu & Presisi Tinggi (`src/lib/downtimeHelper.ts`)**:
  - Mengembangkan fungsi pembantu `parseDowntimeHours` yang mampu mem-parsing format durasi bahasa Indonesia (`"X Jam Y Menit"`) maupun desimal secara presisi.
  - Memperbaiki bug kritis di mana fungsi bawaan `parseFloat("0 Jam 35 Menit")` sebelumnya menghasilkan angka `0` (sehingga seluruh perbaikan di bawah 1 jam dianggap 0 downtime dan tampil strip `-`).
  - Menyediakan fallback cerdas: jika durasi string kosong, sistem otomatis menghitung selisih waktu `repairEnd - (repairStart || date)`.
- **Pembaruan Visualisasi Dashboard & Detail Modal (`src/components/wo-maintenance-dashboard.tsx` & `WorkOrderDetailModal.tsx`)**:
  - Grafik *Downtime per Alat*, diagram lingkaran *Proporsi Downtime Kategori*, dan lencana tabel kini menampilkan jam henti aktual yang akurat.
  - Lencana tabel downtime dilengkapi tooltip teks detail durasi (`title="2 Jam 44 Menit"`).
  - Modal penyelesaian WO kini menampilkan rincian total downtime secara eksplisit.

## [2.9.9] - 2026-09-19

### 🤖 Smart Suggest Kategori Mesin/Aset, Validasi Ketat & Input Detail Alat

- **Pemilihan Kategori Terstandarisasi Non-Instrument (`src/components/create-wo-screen.tsx` & `src/lib/equipmentNormalizer.ts`)**:
  - Mengubah input bebas nama alat non-instrument menjadi sistem pemilihan kategori terstandarisasi berdasarkan katalog 31 kategori resmi PrepLab (dikelompokkan rapi ke dalam 7 rumpun: *IT & Kelistrikan*, *HVAC & Fasilitas*, *Fasilitas & Bangunan*, *Utilitas & K3*, *Alat Operasional Preparasi*, *Fasilitas Kerja & Ergonomi*, dan *Sanitasi & Housekeeping*).
- **Fitur Rekomendasi Pintar (Smart Suggest)**:
  - Menyediakan algoritma pendeteksi kata kunci (*fuzzy/keyword matcher*): saat pelapor mengetik `"PC"`, `"CPU"`, `"Komputer"`, `"Monitor"`, atau `"UPS"`, sistem secara otomatis merekomendasikan kategori **`Perangkat IT & Kelistrikan [IT]`** dengan kartu pilihan satu-klik.
  - Berlaku untuk seluruh kata kunci operasional lainnya (seperti `"Arco"` → *Gerobak Arco*, `"AC"`/`"Daikin"` → *Air Conditioner (AC)*, `"Sapu"`/`"Pel"` → *Alat Housekeeping*, `"Plafon"` → *Plafon*, dsb.).
- **Validasi Ketat & Notifikasi Tim QA**:
  - Pelapor tidak dapat lagi memasukkan nama mesin/asset sembarangan yang tidak masuk dalam kategori resmi (*blocking validation*).
  - Menampilkan informasi kontak Tim QA: *"Tidak menemukan kategori alat/mesin yang sesuai? Harap hubungi Tim QA untuk penambahan kategori atau aset baru."*
- **Input Nama Detail / Spesifikasi Mesin/Aset**:
  - Setelah kategori dipilih, sistem secara dinamis memunculkan kolom input **Detail Nama / Spesifikasi Mesin / Aset Rusak** (contoh: *"PC Desktop Ruang Timbang No. 2"*, *"AC Split Daikin 2PK Area Prep"*).
  - Nama detail digabungkan ke dalam nama alat dan tersinkronisasi utuh ke Dashboard Maintenance, PDF Work Order, dan notifikasi WhatsApp sehingga tim maintenance dapat langsung mengidentifikasi unit spesifik di lapangan.

## [2.9.8] - 2026-09-19

### 📐 Proporsionalitas & Keterbacaan Penuh Tabel Rincian Work Order

- **Tata Letak Proporsional Terkunci (`table-fixed` & `<colgroup>`)**:
  - Mengonversi tabel desktop dari *unconstrained auto-layout* ke sistem proporsional terdistribusi 100% menggunakan `<colgroup>` sehingga seluruh 11 kolom selalu pas di dalam kartu tabel tanpa terpotong (*no clipping*).
  - Alokasi proporsi lebar kolom yang adil:
    - **Kolom Naratif Utama (49%)**: `Nama Alat & Kode` (13%), `Deskripsi Kerusakan` (18%), dan `Tindakan Perbaikan` (18%) mendapatkan porsi hampir setengah lebar tabel untuk memastikan keluhan dan tindakan teknisi terbaca dengan jelas.
    - **Kolom Metadata & Identitas (51%)**: `No. WO` (8.5%), `Tanggal & Shift` (7.5%), `Kategori` (7.5%), `Teknisi` (7.5%), `Status` (6%), `Downtime` (5%), `Sparepart` (5%), dan `Aksi` (4%) dirancang kompak dan rapi.
- **Pencegahan Teks Terpotong & Header Berantakan**:
  - Seluruh judul kolom header (`<th>`) kini diproteksi dengan `whitespace-nowrap` sehingga judul seperti *Deskripsi Kerusakan* dan *Tindakan Perbaikan* tidak lagi patah menjadi dua baris.
  - Nama alat kini menggunakan `line-clamp-2 leading-tight` menggantikan `truncate`, sehingga nama alat panjang (seperti *Evacuable Pellet Disk*) tidak lagi terpotong elipsis (`Evacuable Pell...`).
  - Kolom **Aksi** (*tombol lihat detail*) kini tampil 100% utuh di tepi kanan tanpa terpotong container.

## [2.9.7] - 2026-09-19

### 👁️ Penyembunyian Work Order Pemutihan Tanpa Downtime Periode Juni - Juli 2026

- **Otomatisasi Penyembunyian WO Pemutihan (`server/routes/workOrders.ts` & `src/components/wo-maintenance-dashboard.tsx`)**:
  - Menyembunyikan secara baku (*default: hidden*) 315 tiket Work Order dari periode awal (Juni - Juli 2026) yang tidak memiliki jam henti/downtime (`0 Jam 0 Menit`) agar tidak mengganggu maupun mengaburkan data operasional aktual.
  - Metrik akumulasi Dashboard Maintenance (total kasus perbaikan dan kalkulasi MTTR) kini menjadi jauh lebih akurat dan merefleksikan perbaikan riil, tanpa terdistorsi oleh ratusan tiket uji coba/pemutihan.
- **Kontrol Toggle Interaktif di Dashboard & Tabel**:
  - Menambahkan tombol cepat pada toolbar tabel *Rincian Seluruh Work Order*: `Pemutihan: Disembunyikan / Ditampilkan` lengkap dengan ikon `EyeOff`.
  - Menambahkan opsi *checkbox* pada kartu filter utama: `Sembunyikan WO Pemutihan Juni - Juli (Tanpa Downtime)`.
  - Menampilkan lencana informasi (*badge*) pada judul tabel ketika filter pemutihan aktif: `"Pemutihan 0 DT disembunyikan"`.
- **Dukungan API Parameter (`?hidePemutihan=true|false`)**:
  - Endpoint `/api/work-orders/maintenance-summary` kini mendukung parameter `hidePemutihan` (default `true`) untuk memastikan data ringkasan dan raw work order terfilter secara sinkron sejak dari layer server.

## [2.9.6] - 2026-09-19

### 🏷️ Standarisasi Format No. WO & Pengurutan Tabel Berdasarkan No. WO

- **Standarisasi Menyeluruh Nomor Work Order (`WO-YYMMDD-XXX`)**:
  - Mengonversi seluruh 515 tiket Work Order di database produksi ke format baku tunggal: `WO-YYMMDD-XXX` (contoh: `WO-260607-001`, `WO-260717-313`).
  - Menghilangkan awalan lama `FWO-` dan format digit panjang `WO-YYYYMMDD-XXXX` agar seragam dan rapi di seluruh sistem.
  - Memperbarui generator nomor WO baru di backend (`server/routes/workOrders.ts`) agar selalu mencetak format `WO-YYMMDD-XXX`.
  - Memperbarui referensi pesan notifikasi terkait ID lama agar tautan dan pelacakan notifikasi tetap akurat.
- **Pengurutan Otomatis dan Interaktif Berdasarkan No. WO (`src/components/wo-maintenance-dashboard.tsx` & `server/routes/workOrders.ts`)**:
  - Tabel *Rincian Seluruh Work Order* pada Dashboard Maintenance kini secara baku diurutkan berdasarkan `No. WO`.
  - Menambahkan tombol pengubah urutan (*sort toggle*) di sebelah kolom pencarian (`No. WO: A → Z` / `Z → A`).
  - Menjadikan judul kolom header **No. WO** dapat diklik langsung dengan indikator visual panah (`ArrowUp` / `ArrowDown`) untuk membalik urutan (Ascending / Descending) kapan saja.
  - Endpoint `/api/work-orders/maintenance-summary` dan `/api/work-orders` kini mengembalikan data yang tersusun rapi berdasarkan nomor WO (`orderBy(asc(workOrders.woId))`).
- **Restorasi Downtime Tiket Closed Historis**:
  - Memastikan 94 tiket yang sudah berstatus Closed sebelum periode pemutihan tetap mempertahankan data downtime aslinya, sementara 259 tiket open yang diputihkan tetap berdurasi 0 jam.

## [2.9.5] - 2026-09-19

### 🧹 Pemutihan Laporan Work Order & Penol-an Downtime Periode Juni - Juli 2026

- **Pemutihan 259 Work Order Open Menjadi Closed (`work_orders`)**:
  - Mengubah seluruh 259 tiket Work Order berstatus `Open` pada periode awal implementasi (Juni 2026: 191 WO, Juli 2026: 68 WO) menjadi `Closed`.
  - Mengisi keterangan tindakan perbaikan (*action_taken*) dengan `"Pemutihan laporan WO (Closed)"` untuk tiket yang belum memiliki catatan tindakan.
  - Menetapkan durasi downtime menjadi `0 Jam 0 Menit` serta mengosongkan tanggal perbaikan kalkulatif sehingga tidak menambah jam henti pada metrik historis.
- **Penol-an Downtime untuk 94 Work Order Closed Historis (Juni - Juli 2026)**:
  - Mengatur ulang durasi downtime 94 tiket yang sudah berstatus `Closed` di bulan Juni dan Juli menjadi `0 Jam 0 Menit` sesuai arahan operasional agar periode transisi/uji coba tidak menggelembungkan akumulasi jam henti alat.
- **Penyempurnaan Logika Fallback Downtime (`server/routes/workOrders.ts` & `src/components/wo-maintenance-dashboard.tsx`)**:
  - Memperbaiki penanganan fallback kalkulasi durasi: kalkulasi selisih waktu (`repairEnd - repairStart`) kini **hanya** berjalan apabila kolom durasi downtime benar-benar kosong/null. Tiket dengan nilai eksplisit `0` atau `0 Jam 0 Menit` tetap diperlakukan mutlak sebagai 0 jam downtime.

## [2.9.4] - 2026-09-19

### 🔤 Pengurutan Alfabetis Dropdown Alat (Backend API & Client Summary Engine)

- **Sinkronisasi Pengurutan Alfabetis (A - Z) Menyeluruh (`server/routes/workOrders.ts` & `src/components/wo-maintenance-dashboard.tsx`)**:
  - Menyempurnakan pengurutan `equipmentList` di endpoint backend `/api/work-orders/maintenance-summary` dan kalkulator ringkasan frontend `computeClientSummary` agar sepenuhnya tersusun secara alfabetis dari A ke Z (menggantikan pengurutan berbasis durasi downtime).
  - Menjaga integritas kartu ringkasan KPI *Peralatan Downtime Tertinggi* (`topDowntimeEquipment`) dengan mengidentifikasi alat dengan akumulasi jam henti terbesar secara independen sebelum pengurutan nama A - Z diterapkan.
  - Memastikan *natural sorting* dan *whitespace trimming* bekerja optimal di seluruh browser desktop maupun mobile.
- **Cache-Busting Bundle Frontend**:
  - Pembaruan hash bundler Vite (`wo-maintenance-dashboard-BJCbE22T.js` dan `index-CABbzFAq.js`) untuk memastikan browser pengguna memuat bundel skrip terbaru tanpa tertahan oleh cache lama.

## [2.9.3] - 2026-09-19

### 🔧 Standarisasi Peralatan Non-Instrument, Unifikasi Kode & Pengurutan Alfabetis Dropdown

- **Standarisasi Nomenklatur Peralatan Non-Instrument (`src/lib/equipmentNormalizer.ts`)**:
  - Mengintegrasikan modul sentral `equipmentNormalizer.ts` yang menyatukan 120+ variasi nama alat liar dan typo menjadi 31 nama peralatan standar kanonikal (seperti *Gerobak Arco*, *Sekop JIS 30D*, *Sekop Besar / Ujung Rata*, *Ayakan Screen Test 200 Mesh*, *Lampu & Penerangan*, *Pintu & Aksesoris*, *Exhaust Fan*, dll.).
  - Menetapkan kode kanonikal ketat untuk setiap peralatan non-instrument (contoh: `GA` untuk Gerobak Arco, `AST` untuk Ayakan Screen Test, `KRN` untuk Keran & Pipa Air, dll.) agar pengelompokan metrik downtime tidak lagi terfragmentasi.
- **Unifikasi Data & Migrasi Database (`work_orders`)**:
  - Melakukan migrasi database PostgreSQL pada tabel `work_orders` untuk membersihkan dan menyatukan seluruh riwayat data nama dan kode alat non-instrument.
  - Menyingkirkan seluruh variasi nama ganda (0 duplikat tersisa) pada dropdown dan grafik dashboard.
- **Pengurutan Alfabetis Dropdown "Pilih Alat Spesifik" (`src/components/wo-maintenance-dashboard.tsx`)**:
  - Mengurutkan daftar alat pada dropdown filter dashboard secara alfabetis dari **A sampai Z** dengan *natural sorting* (`localeCompare`), dilengkapi pengurutan sekunder berdasarkan nomor/kode alat untuk kategori instrumen.
- **Rekomendasi & Autocomplete Form Create WO (`src/components/create-wo-screen.tsx`)**:
  - Menambahkan datalist rekomendasi 31 alat standar saat membuat WO Non-Instrument.
  - Dilengkapi deteksi otomatis nama standar secara dinamis sehingga input pengguna selalu terstandarisasi sebelum disimpan ke database.

## [2.9.3] - 2026-09-19

### 📊 Tabel Rekapitulasi & Audit EXP, Sinkronisasi Polymath 10 Bidang & Transparansi Hall of Fame

- **Tabel Rekapitulasi & Audit Perolehan EXP (`src/components/ExpAuditModal.tsx`, `LeaderboardScreen.tsx`, `ProfilePage.tsx`)**:
  - Menyediakan visualisasi breakdown perolehan EXP dari seluruh 14 aktivitas operasional (+35 KTA, +50 Inspeksi, +60 Defects Closing, +40 Buat WO, +60 Selesai WO, +100 Saran, +100 Quotes, +100 Tema, +10 Buletin, +60 P5M, +250 Kuis 100%, +50 Shift Malam, +50 Shift Subuh, +50 Shift Weekend).
  - Dilengkapi fitur *Mode EXP Saya* dan *Mode Cari & Audit Personil (Developer / Supervisor)* dengan kotak pencarian instan nama/NIK serta filter section.
  - Opsi toggle periode *Bulan Ini (Season EXP)* vs *Total Karir (Career EXP)* lengkap dengan Baseline Pangkat Bintang 5/3 dan Bonus Milestone Achievement.
  - Tombol aksi salin format teks laporan audit ke clipboard.
- **Sinkronisasi Capaian 10 Bidang Aktif Polymath (`src/lib/gamificationEngine.ts`, `server/routes/gamification.ts`)**:
  - Memperluas target achievement *Omni-Discipline Polymath* (`BRANCH_POLYMATH`) hingga Tier IV = 10 Bidang Aktif (+3.000 XP, Gelar: *Apex PrepLab Polymath*) untuk mengakomodasi personil serba bisa yang aktif di 10 modul operasional.
  - Menyebutkan ke-13 modul yang dipantau sistem secara transparan pada petunjuk perolehan.
- **Transparansi Achievement Hall of Fame Champion (`BRANCH_SEASON`)**:
  - Mengubah achievement juara musim bulanan (`BRANCH_SEASON`) menjadi non-hidden (`isHidden: false`) dengan petunjuk perolehan terbuka agar seluruh personil termotivasi mengejar peringkat podium di akhir musim.
- **Achievement Penuntasan Temuan Inspeksi (`BRANCH_DEFECTS`) & Bingkai Avatar Hazard Remediation Aegis**:
  - Menambahkan achievement task rutin penuntasan temuan K3 (tiket status CLOSED) dengan 4 tier progresif (+150, +350, +800, +1.600 XP).
  - Menghadirkan bingkai eksklusif bertema *Hazard Remediation Aegis* (`frame_hazard_aegis`) dengan filter section terpisah untuk *Inventory Control* dan *Administration*.

## [2.9.2] - 2026-09-19

### 🎖️ Penyatuan Card Profil, Direktori Pangkat Leaderboard & Perbaikan Akses Flyer P5M

- **Penyempurnaan Header Profil Personil (`src/pages/ProfilePage.tsx`)**:
  - Memperkecil ukuran logo lencana pangkat agar selaras seukuran font nama lengkap (`w-6 h-6 sm:w-7 sm:h-7`).
  - Menghilangkan latar belakang hitam di sekeliling logo pangkat sehingga tidak memakan ruang visual horizontal.
  - Memposisikan gelar militer aktif `[{activeMilitaryTitle}]` tepat di baris bawah nama personil, disusul oleh username/callsign di baris ketiga.
- **Direktori 51 Jenjang Pangkat di Leaderboard (`src/components/LeaderboardScreen.tsx`)**:
  - Menambahkan tab khusus *Daftar Pangkat & Personil* yang memuat seluruh hierarki 51 tingkat pangkat PrepLab Vanguard.
  - Menerapkan batasan cerdas: jika sebuah jenjang pangkat diduduki oleh **lebih dari 10 personil**, daftar kartu personil individu disembunyikan dan diringkas dengan banner jumlah personil. Jika 1–10 personil, daftar personil ditampilkan lengkap dengan avatar, dynamic frames, dan status departemen.
  - Dilengkapi fitur pencarian tingkat pangkat, pengurutan (#51 → #1 atau #1 → #51), serta filter kelompok tier.
- **Penempatan Menu Leaderboard di Desktop View (`src/App.tsx`, `src/components/home-screen.tsx`)**:
  - Memindahkan akses menu Leaderboard ke *Dedicated Right Rail* pada tampilan desktop (`hidden md:flex`), diposisikan tepat di bawah tombol menu *Chat*.
  - Menggunakan tombol bergaya lencana emas mewah (*amber/yellow gradient*) lengkap dengan efek kilau *glow ring*, micro-rotation ikon *Trophy*, dan label teks bertingkat (*Leader* / *Board*).
  - Menyembunyikan banner besar leaderboard pada konten utama layar desktop (`md:hidden`) agar antarmuka beranda lebih ringkas dan terfokus.
- **Perbaikan Akses Materi & Flyer P5M (`src/lib/p5m-flyer.ts`, `server.ts`, `src/components/p5m-screen.tsx`)**:
  - Mengarahkan pratinjau flyer dan dokumen PDF secara bawaan ke server streaming proxy (`/api/p5m/flyer`), meniadakan kendala *"Akses dibatasi"* dari tautan mentah Google Drive.
  - Membuka akses publik baca (GET) untuk `/api/p5m/materi`, `/api/p5m/schedules`, dan `/api/p5m/pool` sehingga semua personil dapat meninjau penugasan tanpa hambatan sesi.
  - Menambahkan tombol *Buka / Lihat Materi* pada kartu penugasan personil (`myAssignments`) serta membuka akses baca katalog *Bank Materi* bagi seluruh personil operasional.

## [2.9.1] - 2026-09-19

### 🎖️ Redesain Pangkat Vektor Point Blank Kustom & Zero-Baseline Reset untuk Rilis Main

- **Pangkat Vektor PB Presisi Tinggi (`public/assets/ranks/`, `src/lib/pointBlankRanks.ts`)**:
  - Mengganti aset raster lama dengan ikon vektor SVG kustom mandiri yang *blend in* sempurna baik di tema *dark mode* maupun *light mode*.
  - **Strip 1–4**: Desain balok horizontal perak ramping dengan bingkai gelap bevel.
  - **Major 1–3**: Desain bintang 8 penjuru 3D berdimensi tajam dengan bingkai pelindung.
  - **Bintang 5 (Commander)**: Susunan 5 bintang emas 3D di atas plakat perisai merah marun berlis emas (*crimson velvet gold-trimmed shield*).
- **Reset Bersih Semua Achievement & EXP Dimulai dari 0 untuk Rilis Main (`server/routes/gamification.ts`)**:
  - Seluruh 268 personil kini memulai kompetisi serentak dari **0 EXP (Pangkat Trainee, 0 badge/gelar terbuka, 0 Season XP)**.
  - Mengimplementasikan mekanisme **Season Start Cutoff (`gamification_season_start`)** yang secara cerdas hanya menghitung aktivitas pada/setelah tanggal peluncuran tanpa menghapus data operasional riil.
  - Menghapus seluruh artifisial testing XP, sehingga EXP murni mencerminkan kontribusi personil di lapangan.

## [2.9.0] - 2026-09-18

### 🎖️ Sistem Pangkat Militer & Gamifikasi Kehormatan Operasional

- **Aset Ikon Pangkat Resmi 51 Level (`public/assets/ranks/`, `src/lib/pointBlankRanks.ts`)**:
  - Mengintegrasikan 51 level ikon pangkat Vanguard mulai dari Trainee hingga Supreme Vanguard Commander.
- **12 Cabang Prestasi Militer Berjenjang (Tier I s/d Tier IV Master) (`src/lib/gamificationEngine.ts`)**:
  - 12 cabang pencapaian dinilai langsung dari rekam jejak riil di database portal dengan 12 dynamic glowing avatar frame.
- **Siaran Komando Emas di Chat Global (`src/components/ChatScreen.tsx`)**:
  - Pengumuman otomatis taktis bergradien emas megah untuk promosi pangkat tertinggi dan pembukaan achievement master.

## [2.8.37] - 2026-09-18

### 📸 Perbaikan Unduh Massal ZIP Foto Dokumentasi Inspeksi

- **Dukungan Penuh Format Base64 & Direct Blob Conversion (`src/components/ticket-screen.tsx`)**:
  - Mengimplementasikan helper `fetchPhotoAsBlob` yang secara cerdas mendeteksi format gambar sebelum diunduh.
  - Foto berformat data URL Base64 (`data:image/...`) kini dikonversi langsung menjadi binary `Blob` di sisi browser tanpa mengirim string base64 raksasa ke server HTTP GET, meniadakan kendala *Request-URI Too Large* (HTTP 414 / 431).
  - Foto Google Drive dialirkan secara aman melalui endpoint `/api/drive/view/:fileId`.
  - Memastikan seluruh foto dokumentasi mingguan (33 foto pada minggu berjalan, baik tersimpan di Drive maupun Base64) terunduh 100% lengkap tanpa ada yang terlewat ke dalam satu arsip ZIP.
- **Standarisasi Ekstensi Berkas Foto `.jpg` (`src/components/ticket-screen.tsx`, `src/components/inspection-forms/FormSarana.tsx`, `src/sheets-api.ts`, `server/routes/cloud.ts`)**:
  - Memastikan seluruh berkas foto inspeksi yang diunduh (baik satuan maupun bulk ZIP) serta yang diunggah ke Google Drive secara konsisten menggunakan ekstensi standar `.jpg` (mengonversi format `.jpeg` menjadi `.jpg`).
  - Membersihkan potensi duplikasi ekstensi ganda (seperti `area.jpeg.jpg`) dari penamaan file foto hasil inspeksi.
- **Dukungan Agregasi Data URL di Backend Galeri (`server/routes/misc.ts`)**:
  - Memperluas filter `/api/gallery` agar mengenali foto proses bertipe `data:image/` selain `http`.
  - Menangani parameter data URL langsung pada endpoint `/api/gallery/image-proxy` sebagai proteksi cadangan.

## [2.8.36] - 2026-09-18

### 📰 Navigasi Buletin Langsung & Penguncian Universe Perusahaan

- **Navigasi Langsung Tanpa Pop-up Dialog (`src/App.tsx`)**:
  - Mengklik menu Buletin pada bilah navigasi utama (sidebar desktop maupun menu mobile) kini langsung membuka halaman buletin sesuai universe perusahaan pengguna (`bulletin/TBP` atau `bulletin/GTS`).
  - Dialog pop-up pemilihan universe yang sebelumnya muncul kini telah ditiadakan sepenuhnya untuk mempercepat akses informasi personil.
- **Penguncian Universe untuk Non-Developer (`src/components/bulletin-board.tsx`)**:
  - Tab pengubah universe (`ALL / TBP / GTS`) di dalam modul buletin disembunyikan bagi seluruh pengguna reguler (non-developer).
  - Pengguna reguler dikunci secara aman ke universe perusahaannya masing-masing dengan label badge status resmi (`TBP GPS UNIVERSE` atau `GTS UNIVERSE`).
  - Khusus akun Developer, tab switcher universe (`ALL / TBP / GTS`) tetap tersedia penuh di bagian atas modul buletin untuk kebutuhan audit dan moderasi lintas entitas, dengan pilihan aktif tersimpan secara otomatis di `localStorage`.

### 📅 Kalender & Agenda Departemen pada Homepage Buletin

- **Integrasi Widget Kalender Interaktif (`src/components/TbpDashboard.tsx`)**:
  - Menghadirkan widget interaktif **"Kalender & Agenda Departemen"** di halaman muka buletin.
  - Kalender mini dilengkapi kontrol navigasi bulan (sebelumnya/berikutnya/bulan ini), indikator tanggal aktif, dan penanda titik berwarna (*dots*) pada tanggal yang memiliki agenda kegiatan.
  - Pengguna dapat mengklik tanggal mana pun untuk memfilter daftar agenda yang berlangsung pada tanggal tersebut.
- **Daftar Agenda Departemen Terdekat (`src/components/TbpDashboard.tsx`)**:
  - Menampilkan kartu agenda kegiatan terdekat dengan badge waktu relatif yang informatif (`HARI INI`, `BESOK`, `LUSA`, atau `X Hari Lagi`).
  - Dilengkapi jam pelaksanaan waktu WIT, penanggung jawab/departemen penyelenggara, nama kegiatan, dan pill kategori bertema.

### 🎂 Pemisahan Agenda Ulang Tahun ke Tab Khusus Developer

- **Pembersihan Agenda Quality Assurance (`server/routes/agenda.ts` & `src/components/agenda-dashboard.tsx`)**:
  - Menghilangkan kegiatan ulang tahun dari kategori `Quality Assurance` dan tab `Semua Kategori` agar agenda operasional kerja tim QA tetap rapi dan tidak tertimbun ucapan ulang tahun.
  - Kategori agenda ulang tahun distandarisasi di backend menjadi `kategori: 'Birthday'` dengan departemen global `'ALL'`.
- **Tab Khusus Developer (`src/components/agenda-dashboard.tsx`)**:
  - Menambahkan tab khusus **`🎂 Ulang Tahun (Dev)`** yang hanya dapat dilihat dan diakses oleh akun Developer (`isDev`).

### 💬 Sistem Komentar Bersarang (Threaded Comments) & Drawer Diskusi Buletin

- **Balasan Komentar Bertingkat / Nested Replies (`src/components/NotionDatabaseTable.tsx`, `src/db/schema.ts`, `server.ts`)**:
  - Kolom komentar buletin kini mendukung balasan bertingkat dengan kutipan referensi komentar yang dibalas (`replyToId`, `replyToNik`, `replyToName`, `replyToContent`).
  - Menampilkan panel kutipan aktif di atas input balasan beserta tombol batal silang.
  - Komentar balasan ditampilkan dengan indentasi bertingkat, garis panduan alur diskusi, dan chip nama pengirim asli.
- **Drawer Samping Interaktif (`src/components/NotionDatabaseTable.tsx`)**:
  - Slide-over drawer kini memiliki transisi visual mulus, panel header yang bersih, dan backdrop blur modern.

### 🖼️ Penampil Gambar & Thumbnail Google Drive Buletin

- **Proxy Gambar Cerdas Google Drive (`server/routes/bulletin.ts`)**:
  - Menyediakan endpoint `/api/drive/view/:fileId` yang secara cerdas mengambil stream berkas gambar langsung dari Google Drive API saat thumbnail publik Google dibatasi hak aksesnya.
  - Mengeliminasi masalah gambar rusak (*broken thumbnail*) pada lampiran buletin dan preview kartu pengumuman.

### 🏆 Sinkronisasi & Pembaruan Leaderboard Quest K3LH

- **Endpoint Progres Quest Real-time (`server.ts`)**:
  - Menambahkan endpoint `POST /api/quiz/quest-progress` yang merekam node kemajuan kuis quest pulau Obi personil secara persisten ke database `easter_egg_progress`.
- **Normalisasi Event Socket Progres (`server.ts`)**:
  - Memperbaiki penanganan event socket `quiz:progress` agar dapat menerima baik angka node langsung maupun objek data personil (`{ nik, name, node }`) tanpa memicu kegagalan database.
- **Penyelarasan Klasemen / Leaderboard (`server.ts`)**:
  - Memperbarui endpoint `/api/quiz/quest-leaderboard` dengan `LEFT JOIN` dan fallback nama `COALESCE(employees.name, easterEggProgress.nik)` sehingga klasemen seluruh personil tampil akurat dan terbarui secara instan.

### 🔔 Pembaruan Sistem & Arsitektur Modul Notifikasi Real-Time

- **Penghantaran Notifikasi Seketika via Socket.IO (`server/utils.ts`, `src/components/notification-bell.tsx`)**:
  - Notifikasi baru kini dipancarkan langsung melalui event Socket.IO (`notification:new`) seketika saat event terjadi di server tanpa perlu menunggu jeda polling 30 detik.
  - Dilengkapi nada dering *audio chime* lembut, pertambahan badge lonceng instan, dan toast interaktif Sonner dengan tombol aksi *"Buka"*.
- **Aturan Notifikasi Buletin: Isolasi Balasan vs Siaran Seksi (`server/routes/bulletin.ts`)**:
  - **Komentar dalam Komentar (Balasan / Nested Replies)**: Notifikasi **hanya** dikirimkan kepada orang yang membuat komentar yang dibalas (`replyToNik`), tidak disiarkan ke anggota seksi lainnya.
  - **Artikel Baru & Komentar Utama**: Penerbitan artikel baru dan komentar utama baru secara cerdas ditargetkan ke seluruh personil di seksi/departemen yang relevan.
- **Pembersihan Fallback Spam Web Push HP (`server/utils.ts`)**:
  - Menghilangkan fallback broadcast liar yang sebelumnya mengirimkan notifikasi role ke seluruh karyawan saat role bersangkutan belum memiliki perangkat push terdaftar di HP.
- **Navigasi Cerdas & Tautan Langsung / Deep-Linking (`src/components/notification-bell.tsx` & `src/App.tsx`)**:
  - Mengklik kartu notifikasi buletin atau agenda kini langsung membawa pengguna ke halaman buletin topik spesifik atau modul agenda.
- **Sinkronisasi Instan Modal Pengingat Tugas (`src/components/ReminderNotificationModal.tsx`)**:
  - Modal pengingat tugas inspeksi dan KTA mendengarkan event notifikasi real-time sehingga langsung muncul begitu pengingat dikirimkan oleh admin tanpa menunggu siklus interval 10 detik.

## [2.8.35] - 2026-09-17

### 📅 Penambahan Informasi Tanggal & Jam pada Kartu Modul SAP Management

- **Informasi Tanggal & Jam pada Kartu Feed Aktivitas (`src/components/GroupReportScreen.tsx`)**:
  - Menambahkan keterangan tanggal pelaporan pada header kartu (`📅 dd MMM yyyy`) berdampingan dengan badge periode minggu.
  - Memperbaiki footer kartu: yang sebelumnya hanya menampilkan waktu tanpa tanggal (`14:30`), kini menampilkan tanggal lengkap di sisi kiri (`📅 dd MMM yyyy`) serta jam dan ikon status terkirim di sisi kanan (`🕒 HH:mm ✓`).
  - Menyertakan tanggal kirim pada kartu lampiran dokumen PDF inspeksi dan kartu bukti tanggapan screenshot KTA/TTA.
- **Keterangan Tanggal Penyelesaian pada Kartu Rekap Inspeksi Terpadu (`src/components/GroupReportScreen.tsx` & `server/routes/misc.ts`)**:
  - Setiap kartu personil pada tab Rekap Inspeksi kini memiliki baris keterangan tanggal status:
    - Status Selesai (`SUDAH`): menampilkan tanggal dan jam penyelesaian lengkap (`📅 Tgl Selesai: dd MMM yyyy, HH:mm`).
    - Status Parsial (kurang PDF atau kurang screenshot): menampilkan tanggal unggahan dokumen yang sudah masuk (`📅 Tgl Lapor: dd MMM yyyy, HH:mm`).
    - Status Belum Lapor: menampilkan keterangan periode aktif (`📅 Belum ada laporan (Week X)`).
    - Status Cuti: menampilkan keterangan cuti (`📅 Status Cuti (Week X)`).
  - Menambahkan tooltip tanggal laporan pada tombol ceklis interaktif PDF Inspeksi dan Screenshot Form.
  - Memperbarui endpoint backend `/api/rekap-inspeksi` agar menyertakan `pdfTimestamp` dan `ssTimestamp` pada rincian pemeriksaan.
- **Keterangan Tanggal Penyelesaian pada Kartu Rekap KTA / TTA (`src/components/GroupReportScreen.tsx` & `server/routes/misc.ts`)**:
  - Setiap kartu personil pada tab Rekap KTA/TTA kini menampilkan tanggal penyelesaian laporan atau tanggal unggah bukti pertama/kedua secara transparan (`📅 Tgl Selesai / Tgl Unggah: dd MMM yyyy, HH:mm`).
  - Menambahkan tooltip tanggal pada tombol bukti observasi per item ceklis.
  - Memperbarui endpoint backend `/api/rekap-kta` agar menyertakan `check1Timestamp` dan `check2Timestamp`.
- **Informasi Tanggal pada Modal Lightbox & Viewer PDF (`src/components/GroupReportScreen.tsx`)**:
  - Header lightbox bukti screenshot KTA/TTA dan modal penampil PDF kini menyertakan tanggal dan jam pelaporan yang bersangkutan.

## [2.8.34] - 2026-09-16 (Baru Teraplikasi di Staging)

### 📍 Otomatisasi Kunci Lokasi / Sub-Area Inspeksi Umum Tanpa Input Manual

- **Penghapusan Isian Dropdown Lokasi yang Redundan (`src/components/inspection-forms/FormUmum.tsx`)**:
  - Menggantikan elemen isian dropdown `-- Pilih Lokasi / Sub-Area --` ("Wajib Dipilih") dengan kartu informasi status resmi: **"Lokasi Inspeksi Ditugaskan"** berlabel **"✓ Otomatis Ditentukan Admin"**.
  - Personil tidak lagi perlu memilih lokasi secara manual karena tugas sub-area/ruangan sudah ditentukan sepenuhnya dari sistem jadwal admin.
  - Menghilangkan kotak blokir *"Silakan Pilih Lokasi Inspeksi di Atas"*; daftar checklist pertanyaan inspeksi kini langsung terbuka dan siap diisi.
  - Dilengkapi algoritma pencocokan cerdas (*token-overlap matching*) yang secara otomatis menjembatani perbedaan tanda baca (koma vs tanda hubung/spasi) antara agenda Google Sheets dan master pertanyaan.
  - Tetap menyertakan opsi aman *"Ubah Lokasi (Opsional)"* yang dapat dibuka jika sewaktu-waktu terjadi pertukaran area kerja antar inspektur di lapangan.
- **Penyelarasan Pemetaan Agenda Jadwal & Banner Pemberitahuan (`server/routes/inspections.ts` & `src/components/weekly-inspection-screen.tsx`)**:
  - Memperbarui fungsi `mapInspectionToFormInfo` agar seluruh 64 variasi agenda Google Sheets (seperti *R. Chiller, R. UPS, R. XRF*, *R. Fusion, R. Timbang & R. Scrubber*, *Preparasi Basah/Kering*, *Gudang*, dll.) secara presisi memetakan sub-area yang ditugaskan.
  - Menyesuaikan banner pemberitahuan pada layar inspeksi mingguan agar mengonfirmasi lokasi yang telah terkunci sesuai jadwal personil aktif.

### 🦺 Otomatisasi Keterangan "Cuti" & Sinkronisasi Personil Roster pada Inspeksi APD

- **Otomatisasi Pengisian Keterangan "Cuti" (`src/components/inspection-forms/FormAPD.tsx` & `src/components/weekly-inspection-screen.tsx`)**:
  - Saat personil memilih status kehadiran **"Cuti"** pada formulir inspeksi APD, kolom keterangan kini secara otomatis langsung terisi teks **"Cuti"** (sebelumnya hanya tanda strip `"-"` dan input dalam keadaan terkunci/disabled).
  - Ketika status kehadiran dialihkan kembali ke status selain Cuti, keterangan otomatis dikosongkan untuk mencegah residu data.
  - Pada pengiriman data formulir (`handleSubmitAPD`), ditambahkan pengamanan ganda sehingga jika kehadiran berstatus Cuti dan keterangan kosong atau `"-"`, sistem otomatis menetapkan nilai keterangan menjadi `"Cuti"` sebelum dikirim ke server.
  - Sistem juga otomatis mendeteksi jadwal roster hari ini: jika personil memang berstatus Cuti (`C`, `CT`, dsb.), baris personil langsung diinisialisasi dengan status `Cuti` dan keterangan `Cuti`.
- **Sinkronisasi Personil Aktif ke Data Roster Terintegrasi (`src/components/inspection-forms/FormAPD.tsx`)**:
  - Formulir APD kini langsung mengintegrasikan data dari endpoint roster (`getRosterData()`).
  - Diterapkan fungsi validasi `hasActiveRoster`: hanya personil yang memiliki data roster aktif (jadwal 7 hari ke depan maupun jadwal bulan berjalan ke depan terisi status kerja/cuti yang valid dan bukan kosong/strip `'-'`) yang akan ditampilkan di daftar inspeksi.
  - Personil yang sudah resign dan tidak lagi memiliki jadwal aktif di sistem roster secara otomatis **tidak muncul lagi** pada daftar personil inspeksi maupun pada kolom pencarian *"Tambah Personil Lain"*.
- **Pembersihan Data Personil Resign di Backend & Roster Sync (`server/routes/employees.ts`, `server/routes/roster.ts`, `src/syncRoster.ts`)**:
  - Mendaftarkan 9 NIK personil yang telah resign (`M0206250825`, `M0203220107`, `M0402240107`, `M0402230177`, `M0205250595`, `M0201250027`, `M0206250798`, `M0403240137`, `M0404220419`) ke daftar pengecualian permanen pada master karyawan dan modul roster.
  - Memperbarui status database ke `Resign` untuk ke-9 personil tersebut agar data konsisten di seluruh modul portal.

### 📥 Modal Pasca-Inspeksi: Unduh Laporan PDF & Akses General Submit Safety

- **Modal Interaktif Pasca-Submit Inspeksi Rutin Mingguan (`src/components/InspectionCompletionModal.tsx` & `src/App.tsx`)**:
  - Setelah inspeksi rutin mingguan (baik APD, Umum, Tangga, maupun P3K) berhasil dikirim ke server, sistem langsung menampilkan modal penyelesaian inspeksi yang persisten.
  - Menyediakan tombol langsung untuk **mengunduh / membuka pratinjau berkas Laporan PDF** hasil inspeksi.
  - Menyediakan tombol akses cepat **"Buka Halaman General Submit Safety"** yang mengarahkan personil langsung ke formulir pelaporan resmi milik tim Safety.
- **Otomatisasi Pemilihan Formulir Sesuai Jadwal Personil (`src/components/weekly-inspection-screen.tsx`)**:
  - Personil tidak perlu lagi bingung memilih formulir inspeksi secara manual; sistem langsung mengunci dan memilihkan formulir serta lokasi inspeksi yang ditugaskan berdasarkan jadwal mingguan aktif personil.

### 🔔 Pembukaan Kembali Modal Jadwal P5M dari Lonceng Notifikasi

- **Akses Fleksibel Materi & Jadwal P5M (`src/components/notification-bell.tsx` & `src/App.tsx`)**:
  - Mengatasi kendala personil yang sebelumnya tidak sengaja melewati (*skip*) pop-up pembaruan jadwal P5M.
  - Item notifikasi jadwal P5M pada lonceng notifikasi kini dapat diklik kapan saja untuk memunculkan kembali pop-up modal jadwal P5M lengkap, sehingga personil tetap dapat melihat materi presentasi atau mengunduh dokumen lampiran P5M jika terlewat.

## [2.8.33] - 2026-09-16

### 📑 Penyempurnaan Tautan WhatsApp & Auto-Generate PDF Inspeksi dengan Tanda Tangan & Foto

- **Jaminan Tautan Pesan WhatsApp Inspeksi (`server/routes/inspections.ts`)**:
  - Memperbaiki pembentukan pesan WhatsApp laporan inspeksi mingguan/universal dan APD agar tautan dokumen laporan PDF (`*Dokumen Laporan TBP*` & `*Dokumen Laporan GPS*`) selalu tercantum secara andal dan tidak lagi kosong jika Google Apps Script masih dalam proses *render*.
  - Menyertakan **Nomor ID Tiket resmi** (contoh: `TKT-W38Y26-001`) pada setiap rincian temuan bahaya/kekurangan stok.
  - Menambahkan tautan langsung tindak lanjut temuan ke portal (`/ticket`) pada bagian akhir daftar temuan pesan WhatsApp.
- **On-Demand PDF Auto-Generation & Auto-Redirect (`server/routes/inspections.ts`)**:
  - Mengoptimalkan endpoint `/api/inspections/:id/pdf` agar otomatis memicu pembuatan PDF resmi ke Google Drive jika belum tersedia, lengkap dengan penyematan tanda tangan inspektur (`ttd1`/`ttd2`/`ttd3`) dan foto dokumentasi proses inspeksi.
  - Menyediakan tampilan loading interaktif dengan auto-refresh yang langsung mengarahkan (*auto-redirect*) ke berkas Google Drive setelah proses pembuatan dokumen selesai.

## [2.8.32] - 2026-09-15

### 📲 Push Notifikasi Mobile & PWA Terpasang (Temuan Inspeksi K3, APD & KTA/TTA)

- **Otomatisasi Langganan Push Notifikasi di HP (`src/push-notifications.ts` & `src/components/PushNotificationPrompt.tsx`)**:
  - Menambahkan deteksi otomatis status aplikasi terpasang di HP (PWA standalone mode / Home Screen / peramban HP).
  - Jika izin notifikasi telah diberikan (`granted`), sistem otomatis menghubungkan token Web Push HP ke NIK personil di latar belakang (*silent subscription*) tanpa perlu membuka lonceng manual.
  - Jika izin belum diatur (`default`), menampilkan banner interaktif modern di layar HP untuk mengaktifkan notifikasi dengan 1 ketukan.
  - Menangani event `appinstalled` ketika pengguna baru memasang aplikasi ke layar utama HP agar langsung menawarkan pengaktifan notifikasi.
- **Pemberitahuan Temuan Inspeksi Terpadu (`server/routes/inspections.ts`)**:
  - Saat form inspeksi terpadu/universal disubmit dengan temuan bahaya K3 (`ticketValues.length > 0`), sistem otomatis membuat notifikasi in-app dan memicu `sendWebPush` ke seluruh HP personil Safety, Pengawas, dan Tim Terkait.
- **Pemberitahuan Temuan Ketidakpatuhan APD (`server/routes/inspections.ts`)**:
  - Saat inspeksi kepatuhan APD menemukan personil yang melanggar/tidak lengkap APD, tiket temuan langsung mengirimkan Web Push ke HP tim terkait secara seketika (*real-time*).
- **Pemberitahuan Laporan KTA & TTA (`server/routes/misc.ts`)**:
  - Saat personil mengirim laporan Kondisi Tidak Aman (KTA) atau Tindakan Tidak Aman (TTA), sistem langsung mengirimkan notifikasi push ke tim K3 & pengawas.
- **Penyempurnaan Penargetan Push Notification di Backend (`server/utils.ts`)**:
  - Memperbaiki penargetan role: sebelumnya hanya memeriksa kecocokan string kaku pada `employees.department`. Kini mencakup `department`, `section`, dan `jabatan` (case-insensitive) dengan fallback broadcast cerdas agar temuan K3 tidak hilang jika ada variasi nama seksi.
  - Menambahkan inisialisasi aman VAPID fallback dan deduplikasi endpoint langganan ganda.
- **Penyempurnaan Klik Notifikasi Mobile (`public/sw.js`)**:
  - Saat notifikasi di HP diketuk, Service Worker otomatis memfokuskan jendela aplikasi PWA yang sedang berjalan dan langsung menavigasi ke halaman tiket/temuan (`/ticket` atau `/bulletin`) tanpa membuka tab duplikat.

### ⚖️ Penyelarasan Data KTA/TTA dengan Jadwal Inspeksi (Perbaikan Deteksi Cuti)

- **Penyebab Masalah (Root Cause)**:
  - Pada perhitungan status rekap (`getRekapPersonnelClassification` di `server/routes/misc.ts`), sistem sebelumnya menganggap personil sedang **Cuti** jika terdapat $\ge 1$ hari cuti di database roster pada minggu berjalan.
  - Hal ini menyebabkan personil seperti **Ryan M Rusli** yang aktif bekerja dari Senin hingga Jumat dan hanya mengambil Cuti di hari Sabtu/Minggu langsung dikelompokkan ke `CUTI` untuk 1 minggu penuh pada modul KTA/TTA.
  - Akibatnya, pada portal muncul status *"Cuti Aktif - Bebas dari kewajiban pelaporan KTA/TTA"*, padahal di Jadwal Inspeksi (Google Sheet `CurrentWeek`), ia aktif terdaftar dengan tugas inspeksi mingguan.
- **Sinkronisasi Langsung dengan Jadwal Inspeksi (`server/routes/misc.ts` & `server/routes/inspections.ts`)**:
  - Mengekspor dan menghubungkan parser `fetchInspectionScheduleFromSheet` ke `getRekapPersonnelClassification`.
  - Jika seorang personil memiliki jadwal inspeksi aktif di Google Sheet minggu berjalan (`!item.isCuti`), sistem **menjamin status personil tersebut AKTIF (wajib inspeksi & wajib KTA/TTA)** dan tidak dimasukkan ke daftar Cuti.
  - Personil yang secara eksplisit masuk dalam bagian Cuti pada lembar jadwal inspeksi tetap diposisikan sebagai `CUTI`.
- **Penyempurnaan Ambang Batas Cuti Roster (Fallback)**:
  - Mengubah aturan roster: personil hanya dianggap Cuti mingguan jika **mayoritas hari ($\ge 4$ hari atau $\ge$ separuh entri)** berstatus Cuti/TRV. Cuti 1–2 hari di akhir pekan tidak lagi menggugurkan kewajiban mingguan.
- **Isolasi Bukti Unggah SS General Inspeksi per Individu (`server/routes/inspections.ts` & `src/components/InspectionScheduleCard.tsx`)**:
  - Memperbaiki bug pada `enrichSchedulesWithCompletion`: sebelumnya pencocokan bukti SS general inspeksi (`hasSsProof`) menggunakan array gabungan `personNames` yang menyertakan nama rekan tim/pasangan (`partners`).
  - Akibatnya, jika salah satu personil (contoh Pak Muhammad Nova Herisandi) telah mengunggah SS form general inspeksi, pasangannya (Pak Mohamad Noer Syafi’i) ikut otomatis tercentang sudah mengunggah, padahal belum.
  - Memisahkan validasi bukti SS general inspeksi agar **hanya memeriksa NIK dan Nama personil yang bersangkutan secara individual**, sehingga bukti SS tidak lagi tertaut atau bocor antar rekan tim.
  - Menambahkan penanganan `else` pada `InspectionScheduleCard` agar kartu jadwal langsung mereset status SS dan menghapus cache lokal jika personil belum mengunggah SS.

### 🩹 Perbaikan Alokasi Area & Deskripsi Temuan Checklist Kotak P3K

- **Penyebab Masalah (Root Cause)**:
  - Pada formulir inspeksi Kotak P3K (`FormP3K.tsx`), tidak terdapat kolom input area manual karena nama area telah melekat pada judul formulir (misal *Checklist Isi Kotak P3K Preparasi Basah*).
  - Hal ini menyebabkan `lokasiUmum` terkirim dengan nilai default `'-'`, sehingga kolom **Area / Lokasi** di kartu tiket temuan menjadi kosong (`-`).
  - Selain itu, teks temuan sebelumnya menggabungkan seluruh judul formulir ke dalam deskripsi temuan (*"Checklist Isi Kotak P3K Preparasi Basah: Aquades..."*), sehingga nama area tercampur di dalam deskripsi.
- **Ekstraksi Otomatis Area Formulir P3K (`src/components/weekly-inspection-screen.tsx` & `server/routes/inspections.ts`)**:
  - Menambahkan deteksi otomatis nama area dari judul form P3K (*Preparasi Basah*, *Preparasi Kering*, atau *Laboratorium*) saat submit inspeksi.
  - Memastikan field `location` pada tiket temuan otomatis terisi dengan nama area yang benar.
  - Merapikan format teks temuan menjadi `Kekurangan Stok Item Kotak P3K: [daftar item kosong]` tanpa menduplikasi nama area di dalam deskripsi.
- **Normalisasi API & Database Backfill (`server/routes/tickets.ts`)**:
  - Menambahkan normalisasi otomatis pada endpoint `GET /api/tickets` agar tiket temuan P3K yang sebelumnya tersimpan dengan lokasi `'-'` otomatis menampilkan nama areanya.
  - Memperbarui 8 data tiket temuan P3K eksisting di database (termasuk tiket `TKT-W38Y26-155`) agar area dan deskripsinya langsung bersih dan rapi.

### 🔔 Notifikasi Penyelesaian Temuan untuk Inspektor Pelapor (`server/routes/tickets.ts`)

- **Notifikasi Otomatis Personil Pelapor saat Temuan CLOSED**:
  - Saat suatu tiket temuan di-*closing* oleh PIC/teknisi, sistem kini otomatis menelusuri NIK atau nama inspektor pelapor (`requestorName`).
  - Mengirimkan notifikasi in-app dan Web Push langsung ke akun inspektor yang bersangkutan (*"Temuan Anda [TKT-...] di Area ... telah diselesaikan oleh PIC"*).
  - Melengkapi fallback ke role `Safety` jika NIK pelapor tidak terdeteksi, sehingga tim K3 selalu terpantau.

### 🔕 Eliminasi Notifikasi Dobel di SAP Dashboard (`src/components/sap-dashboard.tsx`)

- **Penyesuaian Alur Pengingat Target Inspeksi**:
  - Menghilangkan *auto-popup* modal saat halaman SAP Dashboard pertama kali dibuka, sehingga pengguna tidak lagi melihat peringatan ganda (banner atas dan pop-up bersamaan).
  - Banner peringatan di bagian atas dashboard tetap aktif dan responsif, sementara pop-up modal detail hanya akan terbuka jika pengguna sengaja mengklik tombol **`[Detail]`** pada banner.

### 🖼️ Perbaikan Pratinjau Foto Temuan K3: Pencegahan Salah Deteksi Base64 sebagai ID Google Drive

- **Penyebab Masalah (Root Cause)**:
  - Pada komponen penampil gambar (`src/components/image-modal.tsx`), logika deteksi ID Google Drive sebelumnya menggunakan ekspresi reguler umum `str.match(/\/d\/([a-zA-Z0-9_-]+)/)`.
  - Foto temuan inspeksi yang tersimpan langsung dalam format data Base64 (`data:image/...`) memiliki puluhan ribu karakter acak yang sering kali mengandung deretan karakter `/d/...`.
  - Hal ini menyebabkan sistem salah mengira potongan teks Base64 tersebut sebagai Google Drive File ID, mengganti tautan gambar asli menjadi thumbnail Google Drive palsu (`drive.google.com/thumbnail?id=...`), dan memunculkan tombol *"Buka di Drive"*.
  - Akibatnya, pratinjau gambar menjadi layar hitam/kosong dan saat tombol *"Buka di Drive"* diklik, Google Drive menampilkan galat *"Halaman Tidak Ditemukan"* (404).
- **Perbaikan Deteksi Berkas & URL Modal Gambar (`src/components/image-modal.tsx`)**:
  - Menambahkan pengecualian dini untuk data gambar lokal / Base64 (`data:`) dan blob (`blob:`), sehingga tidak lagi diproses sebagai link Google Drive.
  - Memperketat regex pencarian Google Drive ID agar hanya aktif pada URL domain resmi Google Drive dengan panjang ID minimal 25 karakter.
  - Tombol *"Buka di Drive"* kini hanya muncul jika gambar memang tersimpan di Google Drive.
  - Memperbarui tombol *"Download"* agar dapat mengunduh gambar Base64 lokal secara langsung sebagai berkas `.jpg`.
- **Perbaikan Sanitasi Tautan di Halaman Tiket (`src/components/ticket-screen.tsx`)**:
  - Menyelaraskan fungsi `formatImageUrl` dan `extractDriveFileId` agar tidak memanipulasi string Base64 dan memproses format URL Drive secara konsisten.

### ✨ Sub-Menu Changelog & Manajemen Riwayat Pembaruan di Panel Developer

- **Sub-Menu Terdedikasi di Panel Developer (`src/components/admin-dashboard.tsx`)**:
  - Menambahkan modul **Changelog** ke dalam grid modul navigasi Developer Panel (`AdminDashboard`).
  - Mendukung pembukaan langsung via parameter query URL: `/admin-dashboard?module=changelog`.
- **Komponen Penampil Rilis Modern (`src/components/DeveloperChangelog.tsx`)**:
  - **Default Rilis Terkini**: Otomatis memunculkan versi terbaru dengan badge status portal aktif (`LATEST RELEASE / AKTIF`) dan ringkasan metrik pembaruan.
  - **Dua Mode Tampilan (Dual-View)**:
    - **Mode Fokus (Detail Versi)**: Tampilan master-detail dengan daftar versi di sisi kiri dan detail rilis di sisi kanan, dilengkapi navigasi *stepper* versi sebelumnya/berikutnya.
    - **Mode Akordion (Timeline Lengkap)**: Tampilan vertikal seluruh riwayat versi dengan mekanisme buka-tutup kartu serta tombol aksi *Buka Semua* dan *Tutup Semua*.
  - **Pencarian Real-time & Filter Seri**: Fitur pencarian cepat seluruh isi rilis dan filter seri (`v2.8`, `v2.7`, `v2.6`, `v2.5`, `v2.4`).
  - **Aksi Instan 1-Klik**: Tombol salin ringkasan rilis ke clipboard untuk broadcast ke grup komunikasi kerja.
- **Endpoint API Terpusat (`server/routes/changelog.ts` & `server.ts`)**:
  - Endpoint `GET /api/changelog` dan `GET /api/changelog/latest` dengan *in-memory caching* otomatis berbasis waktu modifikasi berkas (`mtime`).
  - Didaftarkan ke `PUBLIC_API_PREFIXES` agar dapat diakses secara publik dan cepat tanpa hambatan autentikasi.

### 🔐 Perbaikan Fitur Ganti Password: Endpoint Khusus `/api/auth/change-password` & Integrasi Menu Pengaturan

- **Penyebab Masalah (Root Cause)**:
  - Pada menu **Pengaturan** (`src/components/settings-screen.tsx`), alur penyimpanan password baru sebelumnya memanggil endpoint `/api/auth/setup`.
  - Pasca pengetatan keamanan sistem (P1 Security Guard), endpoint `/api/auth/setup` secara ketat hanya diperuntukkan bagi aktivasi awal akun baru (`firstLoginComplete: false`).
  - Akun karyawan yang telah aktif otomatis ditolak dengan pesan error: *"Akun ini sudah pernah diaktivasi dan aktif. Silakan login atau gunakan menu Lupa Password untuk mereset akun Anda."*
- **Endpoint Terdedikasi `POST /api/auth/change-password` (`server/routes/auth.ts`)**:
  - Menambahkan endpoint mandiri untuk penggantian password akun aktif.
  - Memverifikasi keabsahan password lama secara kriptografis menggunakan `bcrypt.compare`.
  - Memvalidasi batas minimum 8 karakter untuk password baru.
  - Memperbarui hash password (`passwordHash`) dan email pemulihan ke database dalam satu transaksi aman.
- **Pembaruan Formulir Pengaturan Akun (`src/components/settings-screen.tsx`)**:
  - Menyederhanakan alur update password menjadi satu request langsung ke `/api/auth/change-password`.
  - Menambahkan validasi dini panjang karakter di sisi browser serta pesan notifikasi status yang responsif dan informatif.

## [2.8.27] - 2026-09-14

### 📝 Peningkatan Formulir Induksi Karyawan: Kompresi Gambar Klien, Limit Payload 25MB & Penanganan Error JSON

- **Kompresi Gambar Sisi Klien Otomatis (`src/components/induksi-screen.tsx`)**:
  - Menambahkan fungsi kompresi gambar berbasis HTML5 Canvas (`compressImage`) sebelum foto dikonversi ke Base64 dan dikirim ke server.
  - Resolusi foto dibatasi secara proporsional hingga maksimal 1200x1200px dengan kompresi JPEG kualitas 0.8, secara dramatis memangkas ukuran berkas tanpa mengurangi kejernihan dokumentasi visual.
  - Dilengkapi indikator proses interaktif (*"Mengompres ukuran foto untuk upload cepat..."*) serta tombol **`[Hapus Foto]`** untuk memudahkan peserta mengganti dokumentasi jika diperlukan.
  - Memperbaiki penanganan respons API agar secara tanggap mendeteksi status `413 (Payload Too Large)` atau pesan galat server lainnya dan menyajikannya dalam pesan notifikasi (*toast*) yang jelas bagi pengguna.
- **Peningkatan Batas Ukuran Body Parser Server (`server.ts`)**:
  - Menaikkan batas ukuran request body Express (`express.json` dan `express.urlencoded`) dari sebelumnya 10MB menjadi **`25MB`**.
  - Memberikan ruang yang cukup untuk memproses dokumen formulir induksi keselamatan yang memuat tanda tangan digital ganda dan lampiran foto dokumentasi.
  - Menambahkan rute `/api/induksi` ke dalam daftar rute yang dikecualikan dari middleware tertentu.
- **Middleware Penanganan Error Global Server (Global JSON Error Handler, `server.ts`)**:
  - Menambahkan middleware penanganan error terpusat yang selalu mengembalikan respons JSON terstruktur alih-alih halaman galat HTML baku saat terjadi kegagalan sistem.
  - Secara spesifik menangani error `entity.too.large` / HTTP 413 dengan pesan ramah pengguna: *"Ukuran payload/foto terlalu besar (maksimal 25MB). Silakan gunakan foto yang telah dikompres."*
- **Optimalisasi Inisialisasi Layanan Google Auth (`google-services.ts`)**:
  - Menambahkan pemuatan konfigurasi `dotenv.config()` secara eksplisit dan melengkapi fallback aman untuk variabel lingkungan Google OAuth2 (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`).

### 🏷️ Standardisasi Bank Materi P5M: Penambahan Prefiks 'Pemahaman' pada Judul SOP & IK

- **Standardisasi Judul Prosedur Operasional Standar (SOP, `scripts/sync-sop-drive-to-p5m.cjs`, `scripts/test-sop-parser.cjs`)**:
  - Seluruh judul dokumen SOP yang disinkronisasikan dari Google Drive ke bank materi P5M kini otomatis diawali dengan prefiks **`Pemahaman`** (misalnya: *"Pemahaman SOP Pengoperasian Jaw Crusher"*).
  - Menyelaraskan format penamaan agar materi briefing harian berfokus pada pemahaman dan edukasi prosedur kerja aman di lapangan.
- **Standardisasi Judul Instruksi Kerja (IK, `scripts/migrate-ik-preparasi-to-p5m.cjs`, `scripts/sync-ik-drive-to-p5m.cjs`)**:
  - Seluruh skrip migrasi dan sinkronisasi berkas Instruksi Kerja Preparasi & Laboratorium kini otomatis menyematkan prefiks **`Pemahaman IK`** pada judul materi.
  - Menjamin konsistensi penyajian topik pada jadwal acak P5M mingguan, pencarian bank materi, serta notifikasi penugasan personil.

## [2.8.26] - 2026-09-12

### 📄 Pratinjau Dokumen P5M: Auto-Sharing Google Drive & Mode Server Stream Bebas Hambatan

- **Otomatisasi Hak Akses Google Drive (`ensureAnyoneCanReadDriveFile`, `server/routes/p5m.ts`, `server/routes/bulletin.ts`)**:
  - Menambahkan fungsi otomatis via Google Drive API untuk menyetel izin berkas menjadi publik pembaca (*role: reader, type: anyone*) saat file dokumen P5M atau buletin diakses melalui sistem.
  - Mencegah timbulnya pesan kendala login atau *"No preview available"* ketika karyawan membuka dokumen prosedur di perangkat yang tidak terhubung dengan akun Google perusahaan.
- **Dukungan Mode Server Stream Langsung (Direct Binary Stream Viewer)**:
  - Menyediakan penampil streaming langsung dari server (`/api/drive/view/:fileId` dan `/api/p5m/view-drive/:fileId`) yang mendeteksi berkas PDF melalui verifikasi header biner (`%PDF-`) dan menyajikan konten dengan `Content-Type: application/pdf` serta `Cache-Control: public, max-age=86400`.
  - Berfungsi sebagai jalur alternatif handal apabila Google Drive Embed diblokir oleh ekstensi peramban, cookie pihak ketiga, atau pembatasan jaringan lokal.
- **Toggle Mode Penampil Interaktif (`p5m-screen.tsx` & `p5m-notification-modal.tsx`)**:
  - Menambahkan tombol pemilih mode penampil **`[Mode Stream Server / Mode Google Drive]`** dengan ikon `RefreshCw` pada modal notifikasi penugasan P5M dan modal pratinjau materi P5M.
  - Memberikan fleksibilitas penuh kepada personil untuk beralih mode pratinjau hanya dengan satu kali klik bila salah satu metode mengalami kendala pemuatan.
- **Optimalisasi Deteksi File Prosedur & Tautan Flyer (`src/lib/p5m-flyer.ts`)**:
  - Memperluas deteksi tipe dokumen prosedur agar mencakup berkas yang mengandung penamaan `JSA`, `IK`, maupun `SOP`.
  - Mengarahkan tautan unduh dokumen ke proxy backend terproteksi.

## [2.8.25] - 2026-09-12

### 🚫 Penegakan Mutlak: Larangan Masuk Karyawan Resign ke Database & Pembersihan Otomatis

- **Pencegahan Insert Baris Resign dari Spreadsheet (`src/syncRoster.ts`)**:
  - Baris karyawan pada Google Spreadsheet yang memiliki indikator `#N/A` (Section, JobGrade, Jabatan), status kontrak/mess `Resign`, atau terdaftar dalam daftar NIK resign kini **DIPERLAKUKAN SEBAGAI SKIP MUTLAK**.
  - Baris tersebut sama sekali **TIDAK AKAN dimasukkan atau di-upsert ulang ke tabel `employees`**, sehingga karyawan yang telah dihapus admin tidak akan pernah muncul kembali di database.
- **Pembersihan Bersih (Hard Delete) Karyawan Resign**:
  - Logika rekonsiliasi sinkronisasi roster diperbarui dari yang sebelumnya hanya mengubah status menjadi `Resign` kini secara langsung **MENGHAPUS (Delete)** karyawan resign beserta entri jadwal rosternya dari database.
  - Telah dilakukan pembersihan database secara menyeluruh terhadap 19 record karyawan berstatus resign/keluar.
- **Pencegahan Karyawan Resign Terpilih di Jadwal P5M (`server/routes/p5m.ts`)**:
  - Filter pada rute `/api/p5m/pool` dan `/api/p5m/randomize` diperketat dengan validasi karyawan resign, menjamin generator acak P5M tidak akan pernah menugaskan materi/senam kepada mantan karyawan.

## [2.8.24] - 2026-09-12

### 🔄 Sinkronisasi Jadwal Multi-Sheet Google Sheets & Transisi Roster Pekan Baru (Week 38)

- **Penargetan Eksplisit Sheet `CurrentWeek`**:
  - Mengubah URL GViz penarik data dari `&gid=0` menjadi penargetan eksplisit nama sheet `&sheet=CurrentWeek`.
  - Memastikan jadwal aktif selalu terbaca tepat dari tab `CurrentWeek` meskipun pengguna menduplikasi, membuat tab baru, atau memindahkan urutan sheet di Google Spreadsheet.
- **Dukungan Sheet Rekapan Riwayat (Misal: `Week 37`)**:
  - Backend `/api/inspection-schedule` kini menerima parameter `?sheet=...` dan `?week=...`, dilengkapi cache terpisah per sheet (`scheduleCacheMap` dan `enrichedScheduleCacheMap`).
  - Modal **Matriks Jadwal Inspeksi Terpadu** kini dilengkapi tombol pemilihan sheet interaktif:
    - **`[⚡ CurrentWeek (W38 Aktif)]`**: Memuat roster pekan aktif berjalan.
    - **`[⏮️ Week 37 (Rekapan Lalu)]`**: Memuat lembar arsip rekapan jadwal minggu sebelumnya.
- **Transisi Roster Akhir Pekan (Weekend Advance to W38)**:
  - Penjadwalan mingguan yang diperbarui pada akhir pekan (Sabtu & Minggu) otomatis dihitung sebagai pekan yang dituju (**Week 38**), sehingga personil yang mengecek jadwal langsung melihat label periode yang tepat (**W38**) dan pencocokan inspeksi/bukti SS tersinkronisasi akurat tanpa menunggu pergantian hari Senin.

## [2.8.23] - 2026-09-11

### ✨ Tampilan Kartu Home Screen: Mode Ringkas (Minimize) Estetis & Terpadu

- **Fitur Perkecil/Perluas (Minimize/Expand Toggle)**:
  - Kartu **Jadwal Inspeksi Terjadwal** dan kartu **Kewajiban KTA / TTA Minggu Ini** kini dilengkapi tombol toggle **`[Ringkas / Detail]`** dengan ikon panah di bagian header kartu.
  - Pilihan pengguna disimpan otomatis di `localStorage` (`p2h_schedule_card_minimized` & `p2h_kta_card_minimized`), sehingga preferensi tampilan tetap terjaga saat me-refresh halaman atau membuka portal kembali.
- **Tampilan Mode Ringkas (Aesthetic Compact View)**:
  - Mengurangi tinggi kartu secara signifikan agar halaman utama terasa lega dan minimalis, tanpa menghilangkan informasi penting:
    - **Kartu Inspeksi (Ringkas)**: Tetap menampilkan status inspeksi (`✓ Selesai` / `Shift`), judul penugasan inspeksi, peran/rekan kerja, tombol aksi instan (`PDF Laporan` / `Isi Form`), serta status bukti screenshot (*SS General Inspeksi*) dengan tombol upload langsung.
    - **Kartu KTA / TTA (Ringkas)**: Tetap menyajikan status kelengkapan target (`✓ Lengkap (2/2)` / `⏳ Belum (0/2)`), judul target K3L, rincian per item (*TTA 1, TTA 2 / KTA*), serta tombol aksi cepat pelaporan (`+ Lapor Lagi` / `Laporkan KTA/TTA`).
  - Animasi transisi lembut (*fade-in / scale*) dengan palet warna dan styling CSS variables tema (`var(--card-bg)`, `var(--input-bg)`, `var(--border-main)`).

## [2.8.22] - 2026-09-10

### 🛡️ Rekap Status Laporan Inspeksi: Syarat Wajib Bukti Screenshot (SS) Form General & Ceklis Ganda (PDF + SS)

- **Penegakan Prasyarat Ganda Kelengkapan Inspeksi (Dual Requirement 2/2)**:
  - Rekapan status laporan inspeksi kini mewajibkan **dua prasyarat** terpenuhi sebelum seorang personil dinyatakan berstatus **`SUDAH`** (`✓ LENGKAP (2/2)`):
    1. **Dokumen PDF Inspeksi**: Otomatis terkirim dan terekap di server saat formulir inspeksi disubmit di sistem.
    2. **Bukti Screenshot (SS) Pengisian Form General Inspeksi**: Tangkapan layar bukti pengisian formulir General Inspection yang diunggah oleh karyawan.
  - **Aturan Tegas**: Jika personil baru memiliki dokumen PDF namun belum mengunggah bukti SS formulir general inspeksi, status personil **TIDAK dijadikan `SUDAH`**, melainkan tetap **`BELUM`** dengan badge peringatan **`⚠️ KURANG SS (1/2)`**.
- **Tampilan Ceklis Ganda Interaktif pada Kartu Rekap**:
  - Setiap kartu personil di Rekap Inspeksi menyajikan dua indikator ceklis:
    - **`[✅ PDF Inspeksi]`** (atau `[○ PDF Belum]`): Terhubung langsung dengan modal penampil PDF (PDF viewer) dan tautan Google Drive / tab baru.
    - **`[✅ SS General]`** (atau `[○ SS General Belum]`): Terhubung langsung dengan lightbox resolusi tinggi untuk memverifikasi screenshot formulir.
- **Penyempurnaan Proporsi & Keterbacaan Banner Status Personal (`GroupReportScreen.tsx`)**:
  - Mengubah tata letak banner status personal dari model flex horizontal yang sempit menjadi tata letak blok berjenjang yang proporsional dan seimbang:
    - **Header**: Judul status inspeksi berdampingan dengan badge status solid kontras tinggi berlatar warna tegas dengan teks putih tebal (**`bg-amber-600 text-white font-black`**) sehingga 100% terbaca jelas.
    - **Status Ceklis Ganda**: Grid 2 kolom seimbang (*50% / 50%*) menampilkan status `Syarat 1 (PDF): Terekap Server` dan `Syarat 2 (Bukti SS): Wajib Upload` secara visual dan informatif.
    - **Tipografi & Kontras Tinggi**: Teks penjelasan menggunakan lebar penuh (*100% card width*) dengan warna solid `text-slate-800 dark:text-slate-200 font-semibold` tanpa efek opacity pudar, menjamin keterbacaan optimal di tema terang maupun gelap.
    - **Tombol Aksi Proporsional**: Tombol **`[Buka Form ↗]`** dan **`[Upload Bukti SS]`** ditata rapi dalam grid 2 kolom di bagian bawah kartu.
  - **Optimalisasi Kartu Ringkasan & Lebar Drawer Floating**:
    - Kartu ringkasan (*Total Wajib, Sudah, Belum, Cuti, %*) pada jendela drawer popup diubah menjadi grid 3 kolom responsif sehingga label kartu tidak lagi terhimpit atau patah baris per kata.
    - Dimensi jendela popup diperlebar menjadi `480px` dengan tinggi `600px` agar tampilan rekap terasa lega, nyaman, dan estetis.
- **Modal Upload Bukti SS Form General Inspeksi (`showSsModal`)**:
  - Modal khusus untuk mengunggah tangkapan layar bukti pengisian Google Form General Inspeksi.
  - Mendukung penempelan gambar langsung dari clipboard (**`Ctrl + V`**) serta pemilihan file (PNG, JPG, WebP).
  - Dilengkapi tautan langsung ke Google Form Inspeksi serta pratinjau foto sebelum dikirim.
  - Tersedia pula tombol aksi kontekstual di Feed saat filter **Inspeksi K3** dipilih.
- **Smart Push Notification Reminder**:
  - Tombol **`[Ingatkan (Kurang SS)]`** otomatis menyesuaikan teks dan pesan notifikasi secara spesifik mengingatkan personil untuk mengunggah screenshot form general inspeksi bila PDF-nya sudah tercatat namun SS-nya belum ada.
- **Skema Database & API Backend (`inspection_proofs`)**:
  - Menambahkan tabel database `inspection_proofs` dengan indexing `week` dan `nik` untuk menyimpan arsip bukti tangkapan layar inspeksi.
  - Menambahkan endpoint `POST /api/inspection-proofs`, `GET /api/inspection-proofs`, dan `DELETE /api/inspection-proofs/:id`.
  - Memperbarui algoritma kalkulasi `/api/rekap-inspeksi` agar memadukan data DB `inspections` (PDF) dan `inspection_proofs` (SS) secara presisi.

### 📸 Penamaan File Dokumentasi Inspeksi & Fitur Unduh Massal (Bulk ZIP Download)

- **Format Nama File Standar Inspeksi (`ticket-screen.tsx`)**:
  - Nama file dokumentasi foto inspeksi disesuaikan menjadi format ringkas dan terstandar: `Week XX_Nama Form_Area.jpg` tanpa nama inspektor dan tanggal (contoh: `Week 37_Kepatuhan APD_Laboratory (Shift B).jpg`).
  - Label nama file tersebut ditampilkan langsung pada setiap kartu foto dokumentasi di galeri inspeksi.
- **Unduh Massal Seluruh Foto per Minggu (Bulk ZIP)**:
  - Menambahkan tombol **`[Unduh Semua Foto (ZIP)]`** pada banner galeri dan header halaman inspeksi.
  - Sistem mengemas seluruh foto dokumentasi minggu berjalan ke dalam satu berkas `.zip` (misal: `Dokumentasi_Inspeksi_Minggu_ke_37__2026_.zip`) untuk memudahkan perekapan mingguan QA / Safety.
  - Dilengkapi indikator progres proses kompresi dan pengunduhan realtime.
- **Tombol Unduh Per Foto (`Unduh`)**:
  - Tombol aksi pada setiap kartu foto diperkaya dengan tombol **`[Unduh]`** individual bersanding dengan tombol **`[Salin Link]`** dan **`[Drive]`**.
- **Backend Image Proxy (`server/routes/misc.ts`)**:
  - Menambahkan endpoint `/api/gallery/image-proxy` dan routing `/api/drive/view/:fileId` guna mengunduh aset gambar resolusi tinggi tanpa kendala Cross-Origin (CORS).

### ⚡ Restrukturisasi Tampilan Pelaporan Hazard Report Safety & Proporsionalitas Filter

- **Pembersihan Header & Pemulihan Judul (`GroupReportScreen.tsx`)**:
  - Menghapus tombol upload bukti dari header atas agar judul **"Pelaporan Hazard Report Safety"** tampil utuh dan tidak terpotong (*"Pe..."*).
- **Proporsionalitas Filter Kategori Segmen (Grid 3 Kolom Seimbang)**:
  - Mengubah segmen filter kategori feed menjadi tata letak grid 3 kolom yang seimbang dan proporsional: **`[Semua (xx)]`**, **`[Inspeksi K3 (xx)]`**, dan **`[KTA/TTA (xx)]`**.
- **Aksi Kontekstual Upload Bukti KTA/TTA**:
  - Tombol **`[Upload Bukti]`** diletakkan secara kontekstual di dalam tampilan tab KTA/TTA, menyederhanakan alur unggah tangkapan layar form KTA/TTA 1 langkah (otomatis tanggal dan minggu aktif berjalan).
- **Penyesuaian Istilah & Proporsi Drawer**:
  - Mengubah label tab dari yang semula **"Rekap Kepatuhan"** menjadi **"Rekap Status Laporan"** agar terdengar lebih profesional dan cocok dengan alur kerja departemen.
  - Merapikan proporsi dan dimensi jendela popup laci (*floating drawer widget*) menjadi `440px` dengan tinggi dinamis `max-h-[82vh]` agar tata letak feed dan rekap tidak terasa sesak.

### 🔄 Rekonsiliasi Otomatis Data Karyawan & Roster Sinkronisasi Google Sheets

- **Latar Belakang Masalah**:
  - Total personil di Roster Admin sebelumnya masih menampilkan 199 (atau ~196) personil, padahal di Google Spreadsheet terbaru hanya ada **188 personil** aktif (63 Staff + 125 Crew).
  - Mekanisme sinkronisasi sebelumnya hanya melakukan *UPSERT* (memperbarui/menambah personil yang ada di Sheet), tetapi **tidak menandai personil yang sudah dihapus dari Sheet sebagai `Resign`**, dan jadwal lama mereka di tabel database `roster` tidak terhapus.
  - Akibatnya, 11 personil (termasuk Faisal Bakri, M Tarmizi, Taufik Mulyadi, Nazar, Darwan Alimudin, Fasrul La Udi, Salim Hi. Hasan, dll.) yang sudah tidak lagi berada di spreadsheet tetap berstatus `Active` dan terhitung di tabel Roster Admin.
- **Solusi & Perbaikan (`src/syncRoster.ts`)**:
  - Menambahkan mekanisme rekonsiliasi otomatis: Setiap kali sinkronisasi dijalankan, sistem mengumpulkan seluruh NIK yang aktif dari sheet Staff dan Crew.
  - Setiap personil di database yang tidak lagi terdaftar di Google Spreadsheet secara otomatis diperbarui statusnya menjadi `statusKaryawan = 'Resign'`.
  - Entri tanggal jadwal lama di tabel `roster` untuk personil yang telah keluar tersebut otomatis dibersihkan.
  - Total personil di Roster Admin kini **tepat 188 orang**, sesuai 100% dengan Google Spreadsheet.

### 🛡️ Integrasi Pelaporan KTA / TTA & Perekapan Otomatis Mingguan via Portal

- **Latar Belakang & Tujuan**:
  - Mengurangi ketergantungan pada pengiriman bukti laporan ke grup WhatsApp (*"Pelaporan Hazard Report Safety Prep & Lab"*).
  - Mengintegrasikan alur pelaporan **KTA (Kondisi Tidak Aman)** dan **TTA (Tindakan Tidak Aman)** langsung ke dalam portal dengan bukti tangkapan layar (*screenshot*) formulir, yang secara otomatis terekap ke dalam laporan kepatuhan keselamatan kerja mingguan (seperti halnya inspeksi terpadu).
- **Skema Database & Persistence (`src/db/schema.ts` & `server.ts`)**:
  - Menambahkan tabel PostgreSQL `kta_reports` lengkap dengan indeks `week` dan `nik` yang menyimpan: NIK pelapor, nama, section, jenis laporan (`KTA` atau `TTA`), tanggal temuan, tag minggu ISO (misal: `W36`), tautan gambar screenshot bukti (`image_url`), deskripsi temuan bahaya, lokasi area kerja, dan status verifikasi.
  - Auto-initialization skema database melalui query DDL di `initDbSchema()`.
- **Backend API Routes (`server/routes/misc.ts`)**:
  - `POST /api/kta-reports`: Endpoint pengiriman bukti screenshot formulir KTA/TTA personil yang secara otomatis tersimpan ke database dan mempublikasikan notifikasi laporan langsung ke feed grup keselamatan kerja.
  - `GET /api/kta-reports?week=...`: Mengambil daftar laporan KTA/TTA tersimpan per minggu.
  - `DELETE /api/kta-reports/:id`: Fitur penghapusan laporan KTA/TTA bagi Admin / Developer.
  - `GET /api/rekap-kta?week=...`: Kalkulasi otomatis kepatuhan KTA/TTA mingguan seluruh personil aktif (dengan proteksi ketat menyaring personil resign, pensiun, `#N/A`, dan personil yang sedang cuti berdasarkan jadwal roster aktif). Menghasilkan ringkasan KPI: Total Wajib, Sudah Lapor KTA/TTA, Belum Lapor, Sedang Cuti, serta % Capaian Kepatuhan.
  - `POST /api/rekap-kta/override-status`: Fitur verifikasi manual status KTA personil oleh Admin/Pengawas (Set Sudah / Reset).
  - `fetchAllGroupReports`: Menggabungkan laporan inspeksi PDF dan kiriman bukti screenshot KTA/TTA ke dalam satu aliran feed terpadu dengan identifikasi kategori `inspeksi` dan `kta_tta`.
- **Perekapan Kepatuhan Terpadu (Dua Sub-Tab Rekap)**:
  - **`[📋 Rekap Inspeksi]`**: Menampilkan rekapan kepatuhan inspeksi K3 mingguan (persentase capaian, status Sudah/Belum/Cuti, tombol pratinjau PDF, dan pengingat).
  - **`[⚠️ Rekap KTA / TTA]`**: Menampilkan rekapan kepatuhan KTA/TTA mingguan secara terpisah lengkap dengan indikator ceklis pemenuhan kewajiban berbasis jabatan:
    - **`🎯 1 KTA/TTA`**: Wajib 1 laporan bebas (KTA atau TTA) untuk jabatan `Preparation & Laboratory Manager`, `Laboratory Superintendent`, `Preparation Superintendent`.
    - **`🎯 1 KTA & 1 TTA`**: Wajib minimal 1 KTA dan 1 TTA untuk jabatan `Laboratory Supervisor`, `Preparation Supervisor`, `Laboratory Foreman`, `Dry Preparation Foreman`, `Wet Preparation Foreman`, `Preparation Foreman, Wet`.
    - **`🎯 2 TTA`**: Wajib 2 laporan TTA untuk jabatan `Laboratory Maintenance Supervisor`, `Quality Assurance Supervisor`, `Laboratory Maintenance Foreman`, `Quality Assurance Officer`, `Admin, Preparation & Laboratory`, `Admin, Inventory Control`, serta **revisi khusus untuk NIK `02D24000043` (Muhamad Alvin Febriansyah) dan `M0403190701` (Murti Tamisari Harun)**.
    - **Ceklis Interaktif & Integritas Pilihan Karyawan (Tanpa Auto-Ceklis 2)**:
      - Modal kirim bukti KTA/TTA secara default hanya memilih 1 butir ceklis yang belum terpenuhi (misal `TTA 1`), memberikan kontrol penuh kepada karyawan.
      - Memperbaiki deduplikasi data backend (`server/routes/misc.ts` dengan `seenReportDbIds`) sehingga pengunggahan 1 laporan tidak pernah lagi dihitung ganda atau otomatis menceklis 2 butir kewajiban.
      - Jika karyawan hanya memilih 1 ceklis, tombol kirim secara transparan menampilkan label `[Kirim Bukti (1 Ceklis: ...)]`, dan hanya 1 rekaman laporan yang diterbitkan ke database dan rekapitulasi.
      - Karyawan tetap dapat mencentang 2 ceklis sekaligus jika ingin memenuhi kedua kewajiban dengan 1 foto yang sama.
      - **Popup Peringatan Global Saat Refresh Halaman (`GlobalKtaPartialReminderModal`)**:
        - Saat personil dengan kewajiban 2 laporan membuka atau me-refresh halaman portal, sistem secara otomatis mengecek status kepatuhan KTA/TTA mingguan.
        - Jika baru mengunggah 1x (status `1/2`), popup dialog pengingat interaktif beranimasi langsung muncul di layar utama: *"Halo [Nama], Anda baru mengunggah 1x dari total kewajiban [label] pada minggu [week]. Status kepatuhan Anda saat ini masih 1/2 (Kurang [laporan ke-2]). Mohon segera melengkapi 1 bukti laporan lagi sebelum batas waktu minggu ini berakhir."*
        - Tombol **`[Upload Laporan ke-2 (TTA 2 / KTA)]`** langsung mengarahkan dan membuka modal kirim bukti dengan ceklis yang belum terpenuhi otomatis tercentang.
        - **Penyelarasan Tema Desain Portal**: Desain modal diselaraskan 100% dengan tema visual portal PrepLab (menggunakan token CSS `var(--card-bg)`, `var(--border-main)`, `var(--text-main)`, dan `var(--text-muted)`, kartu detail target dan progres 1/2 kontras tinggi, glowing amber accent, serta animasi motion spring yang halus dan elegan).
      - **Popup Dialog Peringatan Langsung Setelah Submit (`SingleUploadReminderModal`)**: Jika karyawan hanya mengunggah 1 laporan dari kewajiban 2 laporannya, sistem langsung memunculkan popup dialog peringatan dengan tombol aksi **`[Upload 1 Laporan Lagi Sekarang]`**.
      - **Toast Peringatan Langsung**: Begitu karyawan dengan kewajiban 2 laporan mengunggah laporan pertamanya, sistem juga menampilkan notifikasi toast peringatan di pojok layar.
      - **Banner Peringatan di Dalam Modal**: Saat membuka kembali modal unggah bukti, ditampilkan banner pengingat kuning di bagian atas formulir yang memberitahukan bahwa personil baru mengunggah 1x dan mengingatkan untuk melengkapi 1 laporan lagi pada minggu berjalan.
      - **Badge & Tombol Notifikasi pada Rekap KTA**: Pada tabel rekapitulasi KTA, personil yang baru mengunggah 1x ditandai dengan badge khusus `[⚠️ Baru 1x (Kurang 1)]` serta tombol aksi `[🔔 Ingatkan (Baru 1x)]`.
      - **Modal Popup Notifikasi Pengingat (`ReminderNotificationModal.tsx`)**: Mengintegrasikan tipe notifikasi `REMINDER_KTA` pada popup global portal sehingga ketika personil diingatkan oleh pengawas, modal interaktif bertema keselamatan kerja akan muncul di layar mereka dan menyediakan tombol pintas `[Unggah Bukti KTA / TTA Sekarang]`.
      - **Pengecualian Manager & Superintendent**: Seluruh pengingat *"baru 1x"* ini secara otomatis **dikecualikan** untuk Manager dan Superintendent, karena kewajiban mereka memang hanya 1x KTA/TTA (langsung tercatat berstatus Lengkap / Sudah).
- **Integrasi Menu Beranda (`home-screen.tsx`)**:
  - Memperbarui dialog kartu menu **KTA / TTA** pada halaman utama sehingga menyediakan dua pilihan aksi langsung:
    1. **`Kirim Bukti SS ke Portal (Terekap)`** (mengarahkan langsung ke Pelaporan Hazard Report Safety).
    2. **`Buka Form KTA/TTA Safety ↗`** (membuka Google Form resmi).

### 📐 Perbaikan Tampilan Kartu Bertumpuk & Logika Status Rekap KTA (`GroupReportScreen.tsx` & `server/routes/misc.ts`)

- **Penyebab Elemen Bertumpuk (*Overlap*)**:
  - Pada popup drawer laci floating widget (`w-[440px]`), breakpoint Tailwind `sm:flex-row` pada kartu personil tetap aktif di layar desktop karena membaca ukuran layar monitor (`window.innerWidth > 640px`), bukan lebar kontainer drawer.
  - Akibatnya, kelompok tombol aksi kanan (`Set Sudah`, `Baru 1x`, `Ingatkan`) yang membutuhkan lebar ~360px memadatkan kolom profil kiri personil sehingga nama karyawan terpotong per baris dan badge target `🎯 1 KTA/TTA` saling bertumpuk langsung di atas tombol `✅ Set Sudah`.
- **Solusi Tata Letak (*Layout Separation*)**:
  - Menghapus paksaan `sm:flex-row` saat mode floating widget (`isFloating ? '' : 'sm:flex-row'`) sehingga kartu selalu mempertahankan tata letak kolom bersih yang proporsional di dalam drawer.
  - Memisahkan baris tombol aksi ke bagian bawah kartu dengan garis pembatas halus (`pt-2 border-t border-[var(--border-main)]/40 w-full`), memberi ruang 100% penuh untuk nama, jabatan, golongan, dan badge ceklis pemenuhan laporan.
- **Koreksi Logika Kepatuhan Manager & Superintendent**:
  - Memperbaiki bug backend di mana personil `1_KTA_OR_TTA` (Manager & Superintendent) memiliki `check2Done = true` secara default, sehingga memicu kondisi `isPartial = true` dan secara keliru menampilkan badge `[⚠️ Baru 1x (Kurang 1)]` serta tombol `[🔔 Ingatkan (Baru 1x)]` padahal mereka belum mengunggah laporan sama sekali (0/1).
  - `check2Done` kini dipastikan `false` dan `isPartial` secara tegas dinonaktifkan untuk kategori `1_KTA_OR_TTA` (Manager & Superintendent hanya berstatus `Belum (0/1)` atau `Sudah (1/1)`).
- **Pencegahan Pemotongan Sub-Tab Header Drawer**:
  - Menambahkan `z-10`, `border-b`, dan `shrink-0` pada kartu sub-tab pemilih rekapitulasi agar saat daftar kartu discroll, judul dan tab sub-menu tidak terpotong atau terselip di bawah bilah tab navigasi.

### 🚫 Pembersihan Personil Resign dari Rekapitulasi Pelaporan Hazard Safety

- **Penyebab Masalah**:
  - Personil yang telah berstatus *Resign* (seperti Fikri Lisantri Fahmi, Kevin Gibran Mamoto, M. Bagus Ihza Ai Rizki, dan Kevin Murheza) sebelumnya masih muncul pada tab **Belum** dan **Semua** di modal Pelaporan Hazard Safety dengan identitas `• #N/A • Gol II`.
  - Hal ini terjadi karena rumus VLOOKUP pada Google Spreadsheet *Rooster_Staff* menghasilkan `#N/A` pada kolom Section/Department saat personil dihapus dari master aktif, namun sistem backend sebelumnya hanya memfilter kolom NIK/Name sehingga baris tersebut tetap lolos dan menggelembungkan total target inspeksi serta menurunkan persentase capaian.
- **Penyelesaian & Filter Berlapis**:
  - **Scanner Backend (`server/routes/misc.ts`)**: Menambahkan fungsi proteksi `isResignedOrInactive()` pada endpoint `/api/rekap-inspeksi` yang secara ketat menyaring personil berstatus `Resign`, `PHK`, `Keluar`, `Inactive`, serta baris yang memiliki nilai `#N/A` pada Section, Department, atau Jabatan.
  - **Sinkronisasi Roster Otomatis (`src/syncRoster.ts`)**: Mendeteksi baris dengan Section `#N/A` saat mengambil data dari spreadsheet dan secara otomatis menandai status personil sebagai `Resign`.
  - **Database Update**: Memperbarui status personil yang telah resign pada tabel database `employees` menjadi `Resign`.
  - **Filter Frontend Tambahan (`GroupReportScreen.tsx`)**: Menerapkan filter defensif pada `filteredRekap` agar personil resign maupun personil dengan section `#N/A` tidak pernah dirender ke daftar personil wajib inspeksi.
  - **Penyesuaian Roster & Master Karyawan (`server/routes/roster.ts` & `server/routes/employees.ts`)**: Memastikan personil yang sudah resign tidak lagi dimasukkan ke dalam perhitungan roster aktif maupun daftar karyawan aktif.

### 🔢 Pembatasan Input Nilai Point Aktual Inspeksi Hanya 1 Digit (0-4)

- **Masalah**:
  - Pada formulir inspeksi (seperti *Inspeksi Perkakas Tangan Portabel* dan *Inspeksi Tangga*), input poin aktual sebelumnya menggunakan `<input type="number">` standar tanpa pembatasan jumlah digit.
  - Hal ini menyebabkan kesalahan input pengguna saat mengetik (misalnya mengetik angka `44` yang seharusnya bernilai `4`), sehingga laporan PDF mencatat poin aktual `44` dari maksimal `4`.
- **Solusi & Validasi Berlapis**:
  - **Formulir Frontend (`FormPerkakas.tsx` & `FormTangga.tsx`)**:
    - Mengubah input menjadi `maxLength={1}`, `inputMode="numeric"`, dan `pattern="[0-9]*"`.
    - Menambahkan filter otomatis pada handler `onChange` yang hanya mengambil 1 digit angka terakhir dan secara otomatis membatasi nilai agar tidak dapat melebihi nilai poin maksimal (`maxP`). Jika pengguna mengetik dua kali atau paste angka berlebih, nilai otomatis disanitasi menjadi 1 digit yang valid.
  - **Sanitasi Backend (`server/routes/inspections.ts`)**:
    - Menambahkan validasi dan sanitasi pada handler `/api/inspections/universal` sehingga data yang dikirim ke Google Apps Script / cetak PDF selalu dipastikan hanya 1 digit dan bernilai $\le$ poin maksimal.

### 🔕 Supresi Cerdas Popup Pengingat Bagi yang Sudah Melaksanakan Inspeksi

- **Optimasi Modal Pengingat**:
  - Memperbarui `enrichSchedulesWithCompletion` pada endpoint `/api/inspection-schedule` agar mengenali penyelesaian inspeksi apa pun yang telah dilakukan personil pada minggu berjalan (`isPersonMatch`), bukan hanya jika judul area sama persis.
  - Menambahkan pengecekan silang ke endpoint `/api/rekap-inspeksi` pada `InspectionNotificationModal`, `ReminderNotificationModal`, dan `SapDashboard`. Jika personil telah berstatus `SUDAH`, modal pengingat tidak akan ditampilkan lagi.
  - Pada halaman form mingguan (`weekly-inspection-screen.tsx`), jika personil telah selesai melaksanakan inspeksi, banner jadwal mingguan menampilkan badge *"✓ Sudah Selesai"* (beserta nama formulir yang terlaksana) dan menghilangkan animasi kedip (*ping dot*) serta tidak lagi memaksa auto-select form.

### 🛠️ Koreksi Nilai Poin Aktual Inspeksi Pak Roy Marten Bobrikit

- Memperbaiki data nilai `aktual: "44"` menjadi `aktual: "4"` pada riwayat inspeksi perkakas portabel (ID 162, 163, 164) tanggal 9 September 2026 oleh Pak Roy Marten Bobrikit pada database sistem.

### 🎨 Standarisasi Istilah "Screenshot" & Penyelarasan Tema UI Inspeksi (`GroupReportScreen.tsx`)

- **Penggantian Istilah "SS" Menjadi "Screenshot"**:
  - Mengubah seluruh penyebutan singkatan `SS` menjadi istilah formal `Screenshot` pada tombol (`Upload Bukti Screenshot`, `Upload Screenshot`), badge (`KURANG SCREENSHOT (1/2)`, `Screenshot Form`, `Screenshot Belum`), label dropzone, dan modal unggah.
- **Penyederhanaan Info Personil & Tata Letak Tombol Sejajar**:
  - Menghapus informasi NIK, section, dan golongan di bawah nama personil sehingga hanya menampilkan nama dan jabatan secara ringkas dan bersih.
  - Menata ulang posisi tombol aksi (`Set Sudah`, `Set Cuti`, `Ingatkan`, `PDF`, `Screenshot`) agar berada langsung di sisi kanan sejajar di samping nama karyawan tanpa pemisah garis bawah.


---

## [2.8.21] - 2026-09-09

### 🔔 Sistem Pengingat Temuan K3 Terbuka (Open Action Items) Berbasis 29 Agenda Inspeksi

- **Pemetaan Komprehensif 29 Agenda Inspeksi ke 4 PIC Supervisor**:
  - Memetakan 100% dari 29 agenda inspeksi terencana laboratorium & preparasi secara presisi:
    - **Laboratory Maintenance Supervisor** (4 Agenda): *Area Maintenance & Workshop, APD Maintenance, Perkakas Tangan Portabel, Tangga Portabel*.
    - **Inventory Control Supervisor** (5 Agenda): *Gudang Chemical, Gudang Laboratorium, Gudang Kontainer A, Gudang Kontainer B, Gudang Preparasi A & B*.
    - **Laboratory Supervisor** (9 Agenda): *R. Chiller/UPS/XRF, R. Fusion/Timbang/Scrubber, R. Office-QAIC-Admin-Manager-Meeting, APD Shift A Lab, APD Shift B Lab, R. Press/Koridor Lab, Checklist P3K Lab, Kelengkapan Saranaprasarana Unit, Pra Pakai Tabung Gas Bertekanan*.
    - **Preparation Supervisor (Wet & Dry)** (11 Agenda): *Preparasi Basah (Area Kerja), Preparasi Basah (Office/Toilet/Loker), Preparasi Kering (Area Kerja/Halte/Parkir), Preparasi Kering (Office/Dust Collector/Kompresor), APD Shift A Prep, APD Shift B Prep, Gudang Arsip, Gudang Transit & Pantry, Koridor & Area Carpenter, Checklist P3K Prep Kering, Checklist P3K Prep Basah*.
- **Modul Deteksi Temuan Cerdas (`inspection-pic-matcher.ts`)**:
  - Mengklasifikasikan tiket temuan K3 ke PIC Supervisor yang tepat secara otomatis berdasarkan prioritas nama area spesifik, judul formulir, dan kata kunci temuan.
- **Komponen Popup Pengingat Temuan K3 (`OpenFindingsReminderModal.tsx`)**:
  - Menampilkan modal peringatan interaktif saat supervisor login atau membuka dashboard: detail PIC yang bertugas, jumlah temuan belum ditutup, rincian mini-card tiket temuan, dan tombol *"Lihat & Tangani Temuan Sekarang"* yang mengarahkan langsung ke tabel temuan.
  - Dilengkapi kontrol penutupan berbasis `sessionStorage` per sesi agar tidak mengganggu aktivitas rutin pengguna.
- **Integrasi Menyeluruh di Portal (`App.tsx` & `sap-dashboard.tsx`)**:
  - Terintegrasi baik di level global aplikasi (begitu login di halaman utama) maupun di modul SAP Dashboard.

### 🛠️ Pemurnian Data Tiket & Pemisahan WO Permintaan dari Temuan Inspeksi

- **Pemisahan Sumber Tiket Internal dari Temuan Inspeksi K3**:
  - Memperbaiki klasifikasi tiket `RWO-1788573371183` dan `RWO-1787636647332` dari `source: 'inspeksi'` menjadi `source: 'internal'`.
  - Memperbarui filter `getTickets()` dan endpoint `/api/tickets` agar tiket WO Permintaan (RWO) tidak lagi tercampur masuk ke dalam Daftar Temuan Inspeksi K3 di SAP Dashboard.

---

## [2.8.21] - 2026-09-04

### 📸 Modul Pencatatan Keuangan & Pemindaian Struk AI Vision (`FinanceScreen.tsx` & `/api/finance`)

- **Fitur Scan Struk Belanjaan & Mutasi dengan AI Gemini Vision**:
  - Mengintegrasikan SDK Gemini AI (`@google/genai`) dengan model `gemini-1.5-flash` (beserta fallback multi-model) untuk memindai foto struk belanjaan / screenshot mutasi dan menguraikan setiap item produk secara terpisah (nama produk, toko, kategori, metode pembayaran, dan harga).
  - Tampilan pratinjau hasil scan bergaya WhatsApp dengan generator kode transaksi unik (`#LUEBOBA`, `#LUEBU1U`, dll.).
- **Dashboard Ringkasan Keuangan & Input Manual**:
  - Kartu statistik *Total Pengeluaran*, *Jumlah Transaksi*, dan *Kategori Terbesar*.
  - Form pencatatan manual serta riwayat transaksi lengkap dengan filter kategori & pencarian instan.
- **Tabel Database `finance_transactions`**:
  - Menambahkan skema tabel transaksi keuangan di PostgreSQL.

---

## [2.8.20] - 2026-09-02

### 🔓 Penyederhanaan Alur Setup Password Akun Awal (`/api/auth/setup` & `App.tsx`)

- **Penghapusan Verifikasi Tanggal Lahir pada Setup Akun**:
  - Menghapus input dan validasi tanggal lahir pada proses inisialisasi password akun baru.
  - Personil kini dapat langsung mengaktifkan akun dan membuat password baru secara cepat hanya dengan NIK, Email, dan Password Baru tanpa hambatan kecocokan format tanggal lahir HR.


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
