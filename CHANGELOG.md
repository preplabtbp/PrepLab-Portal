# Catatan Pembaruan (Changelog) - Prep & Lab Portal

Semua riwayat pembaruan, penambahan fitur, dan perbaikan sistem Prep & Lab Portal dicatat secara runtut dalam dokumen ini menggunakan bahasa yang jelas dan mudah dipahami.

## [2.8.34] - 2026-09-16 (Baru Teraplikasi di Staging)

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
