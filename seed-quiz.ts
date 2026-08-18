import { db } from './src/db';
import { quizQuestions } from './src/db/schema';

const questions = [
  {
    category: "Istilah Teknis",
    text: "Apa kepanjangan dari singkatan SOP dalam dunia kerja?",
    options: ["Standard Operating Process", "Standard Operating Procedure", "System Operation Procedure", "Standard Organization Policy", "Safe Operation Practice"],
    correctAnswerIndex: 1
  },
  {
    category: "Istilah Teknis",
    text: "Apa kepanjangan dari IBPR yang berkaitan dengan keselamatan dan kesehatan kerja (K3)?",
    options: ["Inspeksi Bahaya & Penilaian Risiko", "Identifikasi Bahaya & Pemantauan Risiko", "Identifikasi Bahaya & Penilaian Risiko", "Instruksi Bahaya & Prosedur Risiko", "Identifikasi Bobot & Penilaian Risiko"],
    correctAnswerIndex: 2
  },
  {
    category: "Istilah Teknis",
    text: "Apa kepanjangan dari IADL dalam konteks sistem manajemen lingkungan?",
    options: ["Identifikasi Analisis Dampak Lingkungan", "Inspeksi Aspek Dampak Lingkungan", "Informasi Awal Dampak Lingkungan", "Identifikasi Aspek Dampak Lingkungan", "Instruksi Aktivitas Dampak Lingkungan"],
    correctAnswerIndex: 3
  },
  {
    category: "Istilah Teknis",
    text: "Apa kepanjangan dari IK yang biasanya menjadi dokumen turunan yang lebih detail dari SOP?",
    options: ["Informasi Kerja", "Instruksi Kerja", "Inspeksi Karyawan", "Indikator Kinerja", "Isolasi Kontrol"],
    correctAnswerIndex: 1
  },
  {
    category: "Istilah Teknis",
    text: "Apa kepanjangan dari TSP dalam sistem manajemen atau perencanaan perusahaan?",
    options: ["Target Sasaran & Program", "Training Standard Procedure", "Total System Performance", "Target Sistem Perusahaan", "Tim Standardisasi & Pengukuran"],
    correctAnswerIndex: 0
  },
  {
    category: "Istilah Teknis",
    text: "Apa kepanjangan dari prosedur keselamatan kerja LOTO untuk isolasi energi berbahaya?",
    options: ["Link On Tag Out", "Lock On Tag Off", "Lock Out Tag Out", "Lock Over Tag On", "Line Operation Tag Out"],
    correctAnswerIndex: 2
  },
  {
    category: "Istilah Teknis",
    text: "Apa kepanjangan dari SPDK yang berkaitan dengan administrasi dan kepegawaian/disiplin kerja?",
    options: ["Surat Perintah Disiplin Karyawan", "Surat Peraturan Disiplin Kerja", "Surat Peringatan Disiplin Karyawan", "Surat Pernyataan Disiplin Karyawan", "Standar Prosedur Disiplin Kerja"],
    correctAnswerIndex: 3
  },

  {
    category: "Lingkungan",
    text: "Sisa makanan, sayuran, dan daun-daun kering di area mess atau kantin tambang harus dibuang ke tempat sampah jenis...",
    options: ["Sampah B3", "Sampah Organik", "Sampah Anorganik", "Sampah Logam"],
    correctAnswerIndex: 1
  },
  {
    category: "Lingkungan",
    text: "Botol air mineral kosong dan kaleng bekas minuman ringan di area kerja sebaiknya dibuang ke tempat sampah jenis...",
    options: ["Organik", "Limbah B3", "Anorganik", "Sisa makanan"],
    correctAnswerIndex: 2
  },
  {
    category: "Lingkungan",
    text: "Filter oli bekas, majun (kain) yang terkena ceceran oli, dan aki bekas dari workshop termasuk jenis limbah...",
    options: ["Sampah rumah tangga", "Sampah organik", "Limbah B3", "Sampah kertas biasa"],
    correctAnswerIndex: 2
  },
  {
    category: "Lingkungan",
    text: "Apa alat yang biasanya digunakan di jalan hauling (tambang) untuk mengurangi debu beterbangan akibat lalu-lalang truk besar?",
    options: ["Mobil tangki air (water truck)", "Mobil pemadam kebakaran untuk membakar debu", "Sapu ijuk manual", "Kipas angin raksasa"],
    correctAnswerIndex: 0
  },
  {
    category: "Lingkungan",
    text: "Jika terjadi tumpahan oli atau bahan bakar secara tidak sengaja di lantai workshop, alat apa yang harus segera digunakan oleh crew untuk membersihkannya?",
    options: ["Disiram dengan air sebanyak-banyaknya ke parit terdekat", "Dibiarkan menguap sendiri", "Menggunakan Spill Kit (absorbent/pasir khusus penyerap oli)", "Ditutup dengan daun kering"],
    correctAnswerIndex: 2
  },
  {
    category: "Lingkungan",
    text: "Kegiatan menanam kembali pohon di area bekas tambang disebut dengan...",
    options: ["Penebangan liar", "Revegetasi / Reklamasi", "Eksplorasi", "Land Clearing"],
    correctAnswerIndex: 1
  },
  {
    category: "Lingkungan",
    text: "Mengapa crew dilarang keras membuang puntung rokok atau sisa plastik sembarangan di area kerja tambang?",
    options: ["Karena bisa merusak pemandangan dan mencemari lingkungan kerja", "Karena membuat crew terlihat malas", "Karena aturan perusahaan saja", "Agar tidak dicatat oleh pengawas"],
    correctAnswerIndex: 0
  },
  {
    category: "Lingkungan",
    text: "Saat crew bekerja di area dengan tingkat kebisingan tinggi atau berdebu parah, APD apa yang wajib dipakai untuk melindungi diri?",
    options: ["Kacamata hitam dan topi pantai", "Masker (respirator) dan Earplug (pelindung telinga)", "Sarung tangan kain tipis", "Jas hujan tebal"],
    correctAnswerIndex: 1
  },
  {
    category: "Lingkungan",
    text: "Secara umum, tempat sampah berwarna hijau di area fasilitas perusahaan biasanya disediakan khusus untuk menampung sampah jenis apa?",
    options: ["Sampah Organik", "Sampah Plastik", "Limbah B3", "Kaca dan Logam"],
    correctAnswerIndex: 0
  },

  {
    category: "SPDK",
    text: "Sanksi berupa Surat Teguran akan diberikan kepada pekerja jika tidak menggunakan kartu tanda pengenal berupa ID Card dan/atau Mine Permit pada kondisi berikut, kecuali...",
    options: ["Selama jam kerja berlangsung", "Selama berada di lokasi tambang", "Saat sedang beristirahat di luar area kerja dan luar jam operasional tambang", "Selama berada di area yang diwajibkan"],
    correctAnswerIndex: 2
  },
  {
    category: "SPDK",
    text: "Berapa kali seorang pekerja tidak mengikuti briefing tanpa alasan yang dapat ditoleransi atau tanpa izin dalam sehinggga berakibat diterbitkannya Surat Teguran?",
    options: ["1 kali dalam 1 bulan", "2 kali dalam 1 bulan", "3 kali dalam 1 bulan", "4 kali dalam 1 bulan"],
    correctAnswerIndex: 2
  },
  {
    category: "SPDK",
    text: "Tindakan di bawah ini yang tidak termasuk dalam pelanggaran berkonsekuensi Surat Teguran berdasarkan aturan gambar adalah...",
    options: ["Dengan sengaja mengabaikan atau tidak mengikuti kegiatan induksi yang telah dijadwalkan", "Tidak mengikuti briefing 3 kali dalam 1 bulan tanpa alasan", "Tidak menghadiri undangan untuk mengikuti Safety Investigasi dan Safety Talk", "Mengikuti seluruh kegiatan induksi dan safety talk tepat waktu"],
    correctAnswerIndex: 3
  },
  {
    category: "SPDK",
    text: "Sanksi berupa Surat Peringatan Pertama & Terakhir akan diberikan kepada pekerja apabila melakukan pelanggaran dalam melaksanakan tugas, yaitu...",
    options: ["Menggunakan alat-alat/perlengkapan K3 yang sudah diberikan dengan baik", "Menolak menggunakan alat-alat/perlengkapan K3 yang sudah diberikan", "Merawat alat-alat/perlengkapan K3 secara berkala", "Melaporkan kerusakan alat K3 kepada pengawas"],
    correctAnswerIndex: 1
  },
  {
    category: "SPDK",
    text: "Berdasarkan aturan pada gambar, tindakan di bawah ini yang berkonsekuensi mendapatkan Surat Peringatan Pertama & Terakhir adalah...",
    options: ["Menyelesaikan seluruh tugas dan tanggung jawab pekerjaan tepat waktu", "Dengan sengaja mengganggu Pekerja lain yang sedang bekerja sehingga mengakibatkan kecelakaan kerja", "Membantu rekan kerja yang mengalami kesulitan di area tambang", "Mengikuti pemeriksaan kesehatan rutin sesuai jadwal"],
    correctAnswerIndex: 1
  },
  {
    category: "SPDK",
    text: "Sanksi Surat Peringatan Pertama & Terakhir juga dapat dijatuhkan kepada pekerja apabila...",
    options: ["Aktif berpartisipasi dalam program kesehatan perusahaan", "Menolak melakukan pemeriksaan kesehatan", "Meningkatkan keterampilan kerja secara mandiri", "Meminta kesempatan untuk melakukan perbaikan kerja"],
    correctAnswerIndex: 1
  },
  {
    category: "SPDK",
    text: "Sanksi berupa PHK akan dikenakan kepada pekerja apabila melakukan tindakan yang mengakibatkan cidera pada orang lain yang disebabkan oleh...",
    options: ["Kelalaian/kecerobohan", "Kesengajaan tingkat tinggi untuk mencelakai", "Perintah langsung dari pengawas lapangan", "Kegagalan fungsi alat berat secara total"],
    correctAnswerIndex: 0
  },
  {
    category: "SPDK",
    text: "Berdasarkan aturan pada gambar, tindakan pelanggaran terkait keselamatan kerja yang berkonsekuensi langsung terkena sanksi PHK adalah...",
    options: ["Memasang danger tag atau lock out sesuai dengan prosedur keselamatan", "Melepas danger tag atau lock out orang lain tanpa mengikuti prosedur atau mengabaikan danger tag", "Melaporkan kerusakan pada lock out kepada petugas berwenang", "Mengikuti pelatihan isolasi energi secara rutin"],
    correctAnswerIndex: 1
  },
  {
    category: "SPDK",
    text: "Sanksi PHK karena alasan mendesak dapat dijatuhkan kepada pekerja apabila melakukan pelanggaran yang diatur dalam...",
    options: ["Catatan buku harian sesama rekan crew", "Memo dan/atau kebijakan dan/atau SK Direksi dengan sanksi PHK karena alasan mendesak", "Saran lisan dari pengawas saat jam istirahat", "Kesepakatan tidak tertulis antar pekerja di lapangan"],
    correctAnswerIndex: 1
  }
];

async function seed() {
  console.log('Seeding quiz questions...');
  await db.insert(quizQuestions).values(questions);
  console.log('Done!');
  process.exit(0);
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
});
