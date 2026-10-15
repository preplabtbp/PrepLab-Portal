import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

interface Item {
  num: number;
  title: string;
  critique: string;
  demand: string;
}

const items: Item[] = [
  {
    num: 1,
    title: "Arsitektur Deployment: Skema Shortcut & File Sharing (SMB)",
    critique: "Aplikasi dan database disimpan di 1 PC lokal lalu shortcut disebar via network folder share Windows. Mengeksekusi binary dan database melalui protokol SMB memicu beban I/O tinggi pada jaringan lokal, performa drop, dan sangat rentan crash.",
    demand: "Migrasi penuh ke arsitektur Client-Server terpusat atau Web-based (Zero-Client). Database harus dikelola oleh dedicated DBMS engine mandiri di server lokal khusus, bukan direct file-share."
  },
  {
    num: 2,
    title: "Batasan Kapasitas User (Limitasi 20 Simultaneous User)",
    critique: "Sistem saat ini terbentur limitasi konkurensi 20 user bersamaan. Pada jam sibuk shift kerja, user ke-21 ke atas terkunci, terlempar, atau memicu latensi ekstrem bagi pengguna lainnya.",
    demand: "Hilangkan batasan 20 user simultan dan terapkan sistem manajemen koneksi (connection pooling) modern yang mampu melayani seluruh personel lab multi-shift secara paralel tanpa batasan lisensi kaku."
  },
  {
    num: 3,
    title: "Latensi & Kecepatan: Waktu Menunggu Loading Melebihi Waktu Operasi",
    critique: "Personel data management dan analis menghabiskan porsi waktu kerja lebih lama untuk menunggu layar loading / freeze daripada menginput data. Turnaround Time (TAT) sampel tambang terhambat sistem.",
    demand: "Optimasi indexing database, refactoring query, dan implementasi caching di sisi server agar proses transisi layar dan eksekusi data selesai dalam hitungan sub-detik (< 1s)."
  },
  {
    num: 4,
    title: "Kebutuhan Skema Dual-ID Sampel (External ID vs. Internal Lab ID)",
    critique: "Registrasi saat ini hanya mendukung 1 nama/ID sampel. Lab tidak bisa melakukan blind analysis, padahal standar QA/QC lab tambang mewajibkan pemisahan identitas demi mencegah bias pengujian.",
    demand: "Dukungan registrasi Dual-ID: External ID (ID Asli Klien/Mine) dipetakan ke Internal ID (ID Analisis Lab) selama proses prep & assay, lalu otomatis di-map kembali ke ID asli saat pelaporan/CoA."
  },
  {
    num: 5,
    title: "Ketiadaan Skema Verifikasi / Approval Berjenjang per Seksi",
    critique: "Tidak ada kontrol gatekeeping antar seksi kerja. Data dari seksi preparasi atau instrumen bisa langsung terdorong ke pelaporan tanpa mekanisme verifikasi resmi per tahap oleh pengawas terkait.",
    demand: "Penerapan Sequential Workflow Approval: Tahap Preparation Approval -> Instrument/Assay Approval -> QA/QC Review -> Section Head Final Sign-Off secara digital berjenjang."
  },
  {
    num: 6,
    title: "Ketidakstabilan Cetak Barcode (Posisi Meleset & Sering Error)",
    critique: "Sering terjadi error tiba-tiba pada pencetakan barcode di mana posisi cetak bergeser/meleset dari stiker label fisik, menyebabkan barcode tidak terbaca oleh scanner genggam dan memicu salah identifikasi.",
    demand: "Perbaikan engine rendering printout barcode dengan kalibrasi margin presisi (offset millimeter control) dan penyediaan modul preview layout sebelum eksekusi cetak."
  },
  {
    num: 7,
    title: "Rigiditas Sistem Pencetakan: Ketiadaan Dukungan Multi-Printer",
    critique: "Modul pencetakan sangat kaku dan hanya mendukung konfigurasi hardware tertentu. Lab kesulitan menyesuaikan jika menggunakan tipe printer stiker yang berbeda di tiap workstation.",
    demand: "Sistem pencetakan harus fleksibel mendukung Thermal Roll Printer (Zebra/Xprinter ESC/POS) maupun Printer Biasa (Kertas Stiker Lembaran A4) dengan template layout yang dapat diatur."
  },
  {
    num: 8,
    title: "Kesulitan Ekstraksi Raw Data dengan Multi-Filter Kustom",
    critique: "Penarikan raw data sangat sulit saat ingin mengombinasikan berbagai filter kustom (rentang tanggal, kode klien, jenis analisa, status sampel). Query sering kali macet, berat, atau gagal.",
    demand: "Penyediaan fitur Advanced Data Exporter dengan filter multi-parameter dinamis dan kemampuan ekspor langsung ke format Microsoft Excel (.xlsx) atau CSV secara cepat dan stabil."
  },
  {
    num: 9,
    title: "Ketidakstabilan Sistem: Crash Mendadak (Sudden Force Close)",
    critique: "Aplikasi sering mengalami force close (keluar sendiri) atau tabel data tiba-tiba kosong di tengah operasional tanpa pesan error yang informatif, merusak flow kerja staf shift.",
    demand: "Audit dan perbaikan memory leak, implementasi structured exception handling, serta penyediaan file error log terpusat agar setiap insiden crash dapat dilacak akar masalahnya."
  },
  {
    num: 10,
    title: "Tingginya Risiko Kerusakan Database (Data Corruption & SPOF)",
    critique: "Menempatkan database di PC biasa yang diakses ramai-ramai via folder share sangat rentan korup jika terjadi lonjakan arus, PC mati mendadak, atau jaringan terputus saat transaksi data.",
    demand: "Gunakan Database Management System (DBMS) kelas enterprise yang menjamin prinsip ACID (Atomicity, Consistency, Isolation, Durability) dengan proteksi auto-rollback transaksi."
  },
  {
    num: 11,
    title: "Ketiadaan Skema Backup Otomatis & Disaster Recovery Terjadwal",
    critique: "Pencadangan data saat ini masih bersifat manual dan disimpan di storage fisik yang sama. Sangat rentan jika hardware host mengalami kerusakan fisik (disk failure) atau malware.",
    demand: "Implementasi Automated Scheduled Backup harian dan per shift ke storage sekunder/NAS terpisah, dilengkapi prosedur restore data teruji tanpa downtime berkepanjangan."
  },
  {
    num: 12,
    title: "Perluasan Otomatisasi Alat Uji: Dari Timbangan ke XRF / Spektrometri",
    critique: "Integrasi ke beberapa timbangan sudah ada, namun instrumen pembaca kadar utama (seperti XRF) belum terhubung otomatis secara end-to-end. Penarikan data masih manual/semi-manual.",
    demand: "Pembangunan integrasi otomatis (file watcher / direct instrument API) untuk membaca dan memetakan output hasil uji mesin XRF langsung ke nomor batch sampel di LIMS tanpa ketik manual."
  },
  {
    num: 13,
    title: "Antarmuka (UI/UX) Usang & Pemborosan Ruang Layar (Screen Waste)",
    critique: "Form Job Registration dan modul lainnya menyisakan 60–70% kanvas kosong abu-abu, tidak responsif terhadap resolusi monitor modern, dan menggunakan tata letak kaku era 2005.",
    demand: "Redesain layout antarmuka yang modern, padat informasi, adaptif terhadap layar Full HD/Wide, serta memprioritaskan kemudahan visual bagi operator laboratorium."
  },
  {
    num: 14,
    title: "Minimnya Dukungan Navigasi Keyboard (High-Speed Data Entry)",
    critique: "Operator dipaksa mengandalkan klik mouse secara konstan untuk navigasi antar kolom form dan tombol aksi, memperlambat kecepatan input saat menangani batch ratusan sampel.",
    demand: "Dukungan komprehensif alur keyboard: perpindahan kolom dengan Tab/Enter, shortcut tombol fungsi (F1-F12), dan mekanisme input cepat tanpa perlu melepas tangan dari keyboard."
  },
  {
    num: 15,
    title: "Dashboard Monitoring yang Terlalu Sederhana & Statis",
    critique: "Widget 24 Hours Job Status hanya menampilkan 4 kotak angka statis tanpa visualisasi alur batch. Manajemen lab tidak dapat melihat di mana titik kemacetan sampel berada.",
    demand: "Pengembangan visual status board berbasis alur proses (Kanban): Penerimaan -> Prep (Drying/Pulverizing) -> XRF -> Verifikasi, dengan indikator waktu tunggu per tahap."
  },
  {
    num: 16,
    title: "Ketiadaan Fitur Operasi Massal (Bulk Action / Multi-Select)",
    critique: "Pengubahan status, pemilihan metode pengujian, atau verifikasi data harus dilakukan baris per baris. Sangat tidak efisien untuk operasional tambang dengan volume tinggi.",
    demand: "Penyediaan fitur checkbox multi-select dan bulk actions (seperti Mass Status Change, Mass Print, Bulk Sample Assignment) pada tabel Job dan Data Entry."
  },
  {
    num: 17,
    title: "Kelemahan Audit Trail & Integritas Rekam Jejak (ISO 17025)",
    critique: "Modifikasi angka hasil pengujian atau pembatalan job belum terekam secara komprehensif bersama alasan perubahan (reason for change). Rentan saat audit eksternal.",
    demand: "Penerapan Audit Trail ketat berstandar ISO 17025 yang mencatat identitas user, timestamp, nilai sebelum vs sesudah, serta alasan perubahan secara permanen (immutable log)."
  },
  {
    num: 18,
    title: "Manajemen Hak Akses (Role-Based Access Control) yang Kurang Spesifik",
    critique: "Pengaturan wewenang pengguna masih sangat umum dan belum bisa dibatasi secara granular per seksi kerja (misal: personel prep tidak boleh memvalidasi hasil XRF).",
    demand: "Penyempurnaan manajemen otorisasi berbasis peran (RBAC) yang granular per divisi (Sampler, Prep, Analyst, QC, Foreman, Superintendent) untuk mencegah pelanggaran SOP."
  },
  {
    num: 19,
    title: "Ketiadaan Validasi Mutu Otomatis (QA/QC: Duplicate & CRM)",
    critique: "Pengecekan batas toleransi sampel duplikat (RPD) dan deviasi standar CRM (Certified Reference Material) masih dilakukan manual oleh analis, memperbesar risiko human error.",
    demand: "Sistem harus otomatis menghitung RPD dan mengevaluasi CRM terhadap batas kendali (2SD / 3SD) dengan indikator visual merah jika out-of-control sebelum job disahkan."
  },
  {
    num: 20,
    title: "Format Output Pelaporan & CoA yang Kaku dan Terbatas",
    critique: "Template Certificate of Analysis (CoA) dan summary report sangat kaku, sulit disesuaikan dengan kebutuhan format spesifik berbagai klien tambang (PT TBP, MSP, ONC, HPL).",
    demand: "Penyediaan Report Template Designer yang mendukung kustomisasi layout, ekspor PDF instan dengan QR-Code validasi keaslian dokumen, serta tanda tangan digital."
  }
];

const outputPath = path.resolve(process.cwd(), 'REKAP_EVALUASI_LIMS_20_POIN.pdf');

// Create document with manual page management (zero margins to prevent auto-pagebreaks)
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 0, bottom: 0, left: 0, right: 0 },
  autoFirstPage: false,
  bufferPages: true
});

const writeStream = fs.createWriteStream(outputPath);
doc.pipe(writeStream);

const primaryColor = '#0F766E';    // Deep Teal
const darkSlate = '#0F172A';       // Navy / Slate 900
const textMuted = '#475569';       // Slate 600
const redCritique = '#B91C1C';     // Red 700
const borderGray = '#CBD5E1';      // Slate 300
const cardHeaderBg = '#F1F5F9';    // Slate 100
const colDivider = '#E2E8F0';

const pageWidth = 595.28;
const pageHeight = 841.89;
const leftMargin = 36;
const contentWidth = pageWidth - (leftMargin * 2); // 523.28

// Break items into pages:
// Page 1: 4 items (due to big header and intro box)
// Page 2: 5 items
// Page 3: 5 items
// Page 4: 6 items
const pageGroups = [
  items.slice(0, 4),   // Items 1-4
  items.slice(4, 9),   // Items 5-9
  items.slice(9, 14),  // Items 10-14
  items.slice(14, 20)  // Items 15-20
];

pageGroups.forEach((group, pageIndex) => {
  doc.addPage();
  let currentY = 32;

  if (pageIndex === 0) {
    // Top Badge
    doc.rect(leftMargin, currentY, 195, 14).fill(primaryColor);
    doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold')
       .text('DOKUMEN EVALUASI & AUDIT TEKNIS', leftMargin + 6, currentY + 3.5);

    // Metadata Right
    doc.fillColor(textMuted).fontSize(7.5).font('Helvetica')
       .text('Tanggal: 14 Oktober 2026', 360, currentY, { align: 'right', width: 199 })
       .text('Agenda: Vendor Technical Review', 360, currentY + 10, { align: 'right', width: 199 })
       .text('Aplikasi: HI-LIMS Solution', 360, currentY + 20, { align: 'right', width: 199 });

    // Main Title
    currentY += 26;
    doc.fillColor(primaryColor).fontSize(13.5).font('Helvetica-Bold')
       .text('REKAP 20 EVALUASI TEKNIS & DAFTAR TUNTUTAN VENDOR LIMS', leftMargin, currentY);

    // Subtitle
    currentY += 17;
    doc.fillColor(textMuted).fontSize(8.5).font('Helvetica')
       .text('Laboratorium Preparasi, Analisis & Pengujian Sampel Tambang/Smelter (Nikel Ore & Grade Control)', leftMargin, currentY);

    // Divider Line
    currentY += 15;
    doc.strokeColor(primaryColor).lineWidth(1.5).moveTo(leftMargin, currentY).lineTo(pageWidth - leftMargin, currentY).stroke();

    // Intro Box
    currentY += 6;
    doc.rect(leftMargin, currentY, contentWidth, 24).fill('#F8FAFC');
    doc.rect(leftMargin, currentY, 3, 24).fill(primaryColor);
    doc.fillColor('#334155').fontSize(7.5).font('Helvetica')
       .text('PANDUAN RAPAT: Dokumen ini merangkum 20 poin evaluasi kritis terkait arsitektur sistem, efisiensi kerja personil, stabilitas hardware/printer, dan integritas data untuk disampaikan secara terstruktur kepada tim teknis vendor.', leftMargin + 8, currentY + 4.5, { width: contentWidth - 16, lineGap: 1.5 });

    currentY += 32;
  } else {
    // Mini Running Header for Pages 2, 3, 4
    doc.rect(leftMargin, currentY, contentWidth, 18).fill('#F8FAFC');
    doc.rect(leftMargin, currentY, 3, 18).fill(primaryColor);
    doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold')
       .text('REKAP EVALUASI TEKNIS & TUNTUTAN LIMS', leftMargin + 8, currentY + 5);
    doc.fillColor(textMuted).fontSize(7.5).font('Helvetica')
       .text('Laboratorium Pengujian Sampel Tambang/Smelter', 300, currentY + 5, { align: 'right', width: 259 });

    currentY += 26;
  }

  // Draw cards on this page
  group.forEach((item) => {
    const cardStartY = currentY;
    const colWidth = (contentWidth - 24) / 2; // ~249pt
    const bodyStartY = cardStartY + 19;

    // Estimate text height
    const critiqueHeight = doc.heightOfString(item.critique, { width: colWidth, lineGap: 1.3 });
    const demandHeight = doc.heightOfString(item.demand, { width: colWidth, lineGap: 1.3 });
    const contentH = Math.max(critiqueHeight, demandHeight);
    const cardHeight = 22 + contentH + 7;

    // Card background & border
    doc.rect(leftMargin, cardStartY, contentWidth, cardHeight).fill('#FFFFFF');
    doc.rect(leftMargin, cardStartY, contentWidth, cardHeight).strokeColor(borderGray).lineWidth(0.7).stroke();

    // Card Header Bar
    doc.rect(leftMargin, cardStartY, contentWidth, 18).fill(cardHeaderBg);
    doc.rect(leftMargin, cardStartY, contentWidth, 18).strokeColor(borderGray).lineWidth(0.7).stroke();

    // Number Badge
    doc.rect(leftMargin + 4, cardStartY + 2.5, 16, 13).fill(primaryColor);
    doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold')
       .text(`${item.num}`, leftMargin + 4, cardStartY + 4.5, { width: 16, align: 'center' });

    // Item Title
    doc.fillColor(darkSlate).fontSize(8.5).font('Helvetica-Bold')
       .text(item.title, leftMargin + 25, cardStartY + 4.5, { width: contentWidth - 30 });

    // Left Column: Critique
    doc.fillColor(redCritique).fontSize(7.2).font('Helvetica-Bold')
       .text('FAKTA LAPANGAN & POIN KRITIK:', leftMargin + 8, bodyStartY);
    doc.fillColor('#334155').fontSize(7.3).font('Helvetica')
       .text(item.critique, leftMargin + 8, bodyStartY + 9.5, { width: colWidth, lineGap: 1.3 });

    // Middle Vertical Divider
    const rightColX = leftMargin + 8 + colWidth + 10;
    doc.strokeColor(colDivider).lineWidth(0.6)
       .moveTo(rightColX - 5, bodyStartY - 1)
       .lineTo(rightColX - 5, cardStartY + cardHeight - 4).stroke();

    // Right Column: Demand
    doc.fillColor(primaryColor).fontSize(7.2).font('Helvetica-Bold')
       .text('TUNTUTAN / SOLUSI TEKNIS:', rightColX, bodyStartY);
    doc.fillColor('#334155').fontSize(7.3).font('Helvetica')
       .text(item.demand, rightColX, bodyStartY + 9.5, { width: colWidth, lineGap: 1.3 });

    currentY += cardHeight + 7; // Gap between cards
  });
});

// Add Footer with exact page numbering
const totalPages = doc.bufferedPageRange().count;
for (let i = 0; i < totalPages; i++) {
  doc.switchToPage(i);
  
  // Footer rule
  doc.strokeColor(borderGray).lineWidth(0.5)
     .moveTo(leftMargin, pageHeight - 30).lineTo(pageWidth - leftMargin, pageHeight - 30).stroke();

  // Footer text
  doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica')
     .text('Dokumen Resmi Rapat Evaluasi Sistem LIMS Laboratorium - Evaluasi Teknis & Kestabilan', leftMargin, pageHeight - 22);

  doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold')
     .text(`Halaman ${i + 1} dari ${totalPages}`, 360, pageHeight - 22, { align: 'right', width: 199 });
}

doc.end();

writeStream.on('finish', () => {
  console.log(`PDF successfully generated with ${totalPages} pages at: ${outputPath}`);
});
