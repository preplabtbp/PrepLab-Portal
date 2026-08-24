# Catatan Pembaruan (Changelog) - Prep & Lab Portal

Semua riwayat pembaruan, penambahan fitur, dan perbaikan sistem Prep & Lab Portal dicatat secara runtut dalam dokumen ini menggunakan bahasa yang jelas dan mudah dipahami.

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
