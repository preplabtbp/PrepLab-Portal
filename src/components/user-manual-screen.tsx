import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronDown, BookOpen, ShieldCheck, Wrench, ThermometerSun, 
  MessageSquare, FileText, ChevronLeft, Cloud, CheckSquare, 
  Settings, Layers, Home, Info, HelpCircle, UserCheck, Package, LayoutDashboard
} from 'lucide-react';

const sections = [
  {
    id: 'intro',
    title: 'Pengenalan & Dashboard',
    icon: <Home className="w-5 h-5 text-blue-500" />,
    content: (
      <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
        <p>
          Selamat datang di <strong>PrepLab All-In-One Portal</strong>. Sistem ini dirancang untuk mendigitalisasi seluruh aktivitas operasional, observasi K3, hingga administrasi HR.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Home Screen:</strong> Pusat navigasi utama. Menu yang muncul akan disesuaikan dengan jabatan dan hak akses departemen Anda.</li>
          <li><strong>Dashboard Administrasi:</strong> Menampilkan ringkasan kehadiran personel harian.</li>
          <li><strong>Dashboard Pelanggaran:</strong> Menampilkan status SP (Surat Peringatan) dan sesi konseling yang sedang aktif.</li>
          <li><strong>SAP Dashboard & Monitoring:</strong> Menampilkan grafik penyelesaian Work Order, jumlah kerusakan alat, dan pemantauan suhu lingkungan.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'roles',
    title: 'Hak Akses & Menu Khusus Jabatan',
    icon: <UserCheck className="w-5 h-5 text-purple-500" />,
    content: (
      <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
        <p>Aplikasi ini memiliki sistem <strong>Role-Based Access Control</strong>. Anda hanya akan melihat menu yang relevan dengan pekerjaan Anda:</p>
        <div className="space-y-3">
          <div className="bg-white border rounded-lg p-3">
            <h4 className="font-semibold text-teal-700 mb-1">🧪 Tim Laboratory</h4>
            <p className="text-xs text-slate-600">Akses khusus ke menu <strong>Pantau Parameter</strong> untuk mencatat suhu, kelembapan, dan flow gas harian.</p>
          </div>
          <div className="bg-white border rounded-lg p-3">
            <h4 className="font-semibold text-blue-700 mb-1">🔧 Tim Maintenance</h4>
            <p className="text-xs text-slate-600">Akses eksklusif ke <strong>Daftar Work Order</strong> untuk mengubah status WO dari In Progress menjadi Closed, serta mengisi detail <em>Action Taken</em> dan lama perbaikan (<em>downtime</em>).</p>
          </div>
          <div className="bg-white border rounded-lg p-3">
            <h4 className="font-semibold text-purple-700 mb-1">📦 Inventory Control</h4>
            <p className="text-xs text-slate-600">Membuka menu <strong>Inventory Control (APD)</strong>. Memungkinkan distribusi APD ke pekerja, pengecekan status tanda tangan digital (Monitoring Dokumen), dan pengaturan siklus usia APD.</p>
          </div>
          <div className="bg-white border rounded-lg p-3">
            <h4 className="font-semibold text-slate-700 mb-1">✔️ QA (Quality Assurance)</h4>
            <p className="text-xs text-slate-600">Membuka akses ke <strong>Manajemen Quiz</strong> untuk menambah, menghapus, atau mengubah soal-soal ujian SOP dan K3.</p>
          </div>
          <div className="bg-white border rounded-lg p-3">
            <h4 className="font-semibold text-orange-700 mb-1">👷 Crew / Operator Dasar</h4>
            <p className="text-xs text-slate-600">Tampilan disederhanakan. Hanya menampilkan menu esensial seperti <strong>Quiz Safety</strong>, <strong>Lapor Makan</strong>, dan <strong>Buku Panduan</strong>.</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'inspeksi',
    title: 'Inspeksi & Observasi K3',
    icon: <CheckSquare className="w-5 h-5 text-emerald-500" />,
    content: (
      <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
        <p>Modul pelaporan keselamatan dan kelayakan lingkungan kerja.</p>
        <ul className="list-disc pl-5 space-y-3">
          <li>
            <strong>Inspeksi Harian & Mingguan:</strong> Pilih form sesuai aset/area (Contoh: Inspeksi P3K, Alat Berat). Wajib memilih opsi (YA/TIDAK), melampirkan foto bukti, dan menandatangani secara digital (Insp. 1 & Insp. 2). Jika ada temuan <em>Unsafe Condition</em>, laporannya akan masuk ke Rekapan Temuan.
          </li>
          <li>
            <strong>KTA / TTA (Kondisi Tidak Aman):</strong> Menu pintas untuk segera melaporkan temuan bahaya ke form TBP/GPS secara langsung.
          </li>
          <li>
            <strong>Rekapan Temuan (Ticket):</strong> Daftar semua masalah yang ditemukan selama inspeksi yang butuh perbaikan cepat namun belum menjadi Work Order penuh.
          </li>
        </ul>
      </div>
    )
  },
  {
    id: 'wo',
    title: 'Work Order (Perbaikan Aset)',
    icon: <Wrench className="w-5 h-5 text-blue-500" />,
    content: (
      <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
        <p>Siklus pembuatan hingga penutupan tiket perbaikan mesin/fasilitas:</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li><strong>Buka Tiket:</strong> Siapapun dapat masuk ke menu "Buat Work Order". Pilih aset yang rusak, unggah foto kerusakan, lalu kirim.</li>
          <li><strong>Notifikasi:</strong> Teknisi (Maintenance) akan mendapatkan notifikasi.</li>
          <li><strong>Pengerjaan (In Progress):</strong> Teknisi menekan tombol mulai pada "Daftar WO" untuk mencatat waktu perbaikan.</li>
          <li><strong>Penutupan (Closed):</strong> Setelah alat selesai diperbaiki, Teknisi wajib mengisi kolom tindakan perbaikan, pergantian sparepart (jika ada), durasi kerusakan, dan mengunggah foto alat yang sudah berfungsi. Sistem kemudian akan meng-generate file PDF secara otomatis.</li>
        </ol>
      </div>
    )
  },
  {
    id: 'inventory_apd',
    title: 'Manajemen APD & Dokumen',
    icon: <Package className="w-5 h-5 text-amber-600" />,
    content: (
      <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
        <p>Fitur untuk mencatat pembagian Alat Pelindung Diri (APD) agar dapat dilacak interval pergantiannya.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Distribusi APD:</strong> Tim Inventory memilih nama pekerja, memilih barang (contoh: Sepatu Safety), sistem akan mengecek apakah pekerja ini sudah boleh mendapatkan barang baru berdasarkan riwayat sebelumnya.</li>
          <li><strong>Tanda Tangan Digital:</strong> Penerima APD harus bertanda tangan di layar (atau HP) saat itu juga sebagai bukti serah terima.</li>
          <li><strong>Monitoring Dokumen:</strong> Melihat dokumen penyerahan APD mana yang masih menunggu tanda tangan Manager (Tertunda) dan mana yang sudah <em>Approved</em>.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'admin_hr',
    title: 'Administrasi & Kepegawaian (HR)',
    icon: <LayoutDashboard className="w-5 h-5 text-indigo-500" />,
    content: (
      <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
        <p>Fasilitas administrasi untuk karyawan sehari-hari:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Lapor Makan:</strong> Wajib diisi setiap shift. Berguna untuk mendata jumlah pesanan catering (katering) berdasarkan kehadiran.</li>
          <li><strong>Roster & Cuti:</strong> Melihat jadwal kerja harian, status kehadiran (Siang/Malam), dan pengajuan jadwal cuti.</li>
          <li><strong>Agenda Personal & P5M:</strong> Kalender interaktif untuk mencatat agenda rapat, jadwal pemeliharaan, serta materi P5M (Pembicaraan 5 Menit) sebelum shift dimulai.</li>
          <li><strong>Induksi Internal:</strong> Formulir pendaftaran bagi pekerja baru/tamu yang memerlukan orientasi K3 (Keselamatan Kerja) sebelum masuk ke area tambang/pabrik. Membutuhkan tanda tangan induktor.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'cloud_bulletin',
    title: 'Komunikasi & Dokumen (Cloud/Buletin)',
    icon: <MessageSquare className="w-5 h-5 text-sky-500" />,
    content: (
      <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
        <ul className="list-disc pl-5 space-y-3">
          <li>
            <strong>Buletin Board:</strong> Portal pengumuman antar departemen. Anda dapat membaca rilis info dari Dept. QA atau HR. Karyawan juga dapat memberikan komentar balasan atau menyertakan lampiran di setiap diskusi buletin.
          </li>
          <li>
            <strong>PrepLab Cloud:</strong> Pengganti Google Drive/SharePoint. Berguna untuk menyimpan file statis seperti prosedur perusahaan (SOP), panduan teknis alat (MSDS), dan arsip laporan tahunan yang bisa diakses kapan saja.
          </li>
          <li>
            <strong>Modul Quiz:</strong> Karyawan wajib mengikuti ujian rutin. Sistem akan mengkalkulasi persentase kelulusan K3/SOP, yang mana hasilnya akan dilaporkan ke manajemen.
          </li>
        </ul>
      </div>
    )
  }
];

function AccordionItem({ item, isOpen, onClick }: { item: any, isOpen: boolean, onClick: () => void }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm mb-3">
      <button 
        onClick={onClick}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            {item.icon}
          </div>
          <span className="font-semibold text-slate-800">{item.title}</span>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/50">
              <div className="mt-4">
                {item.content}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function UserManualScreen({ onBack }: { onBack: () => void }) {
  const [openSection, setOpenSection] = useState<string | null>('intro');

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-teal-600" />
              Buku Panduan Lengkap
            </h1>
            <p className="text-xs text-slate-500">Panduan Teknis & Akses Peran</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-6">
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex gap-3 mb-6 items-start">
          <HelpCircle className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
          <div className="text-sm text-teal-800 leading-relaxed">
            <span className="font-semibold block mb-1">Selamat Datang di Buku Panduan Interaktif!</span>
            <p className="opacity-90">
              Dokumen ini memuat instruksi menyeluruh tentang setiap modul di PrepLab Portal, mulai dari prosedur operasional, pelaporan K3, hingga rincian hak akses tiap divisi (Laboratory, Maintenance, Inventory).
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {sections.map(section => (
            <AccordionItem 
              key={section.id}
              item={section}
              isOpen={openSection === section.id}
              onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
            />
          ))}
        </div>
        
        <div className="mt-8 text-center text-xs text-slate-400 pb-4">
          <p>PrepLab All-In-One Portal &copy; {new Date().getFullYear()}</p>
          <p>Dokumen ini diperbarui secara dinamis sesuai fitur rilis terbaru.</p>
        </div>
      </div>
    </div>
  );
}
