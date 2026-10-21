# Aturan Desain UI: Wajib Tema Terang (Light Mode), Dilarang Keras Tampilan Gelap

## 1. Larangan Mutlak: Dilarang Membuat Tampilan Gelap (Dark Mode / Black UI)
- **DILARANG KERAS** membuat modul, halaman, form, modal, grafik, widget, atau kartu dengan tampilan dasar gelap/hitam pekat (seperti `bg-slate-900`, `bg-slate-950`, `bg-black`, `bg-neutral-900`, atau tema cyberpunk/neon dark dashboard).
- **Alasan Mutlak**: Manajemen perusahaan (manajemen puncak, pimpinan seksi, dan stakeholder) **SANGAT TIDAK MENYUKAI tampilan gelap**. Modul sering dipresentasikan langsung di hadapan manajemen, rapat koordinasi, atau diproyeksikan ke layar proyektor ruang rapat di mana tampilan gelap terlihat buram, suram, tidak terbaca, dan tidak mencerminkan standar laporan resmi korporat.

## 2. Standar Desain Resmi: Clean Corporate Light Theme

### A. Latar Belakang & Layout
- **Halaman Utama / Canvas**: Wajib putih bersih (`bg-white`) atau abu-abu terang netral (`bg-slate-50`).
- Dilarang memasang background hitam/gelap pada kontainer utama modul.

### B. Kartu, Kontainer, & Tabel
- **Latar Kartu**: Wajib berlatar putih bersih (`bg-white`).
- **Border / Garis Tepi**: Menggunakan garis tepi tipis dan rapi (`border border-slate-200` atau `border-slate-100`).
- **Bayangan (Elevation)**: Bayangan halus dan lembut (`shadow-xs`, `shadow-sm`, atau `shadow-md border border-slate-100`). Hindari border neon atau glowing borders ala sci-fi/dark theme.

### C. Tipografi & Kontras Teks
- **Teks Utama & Angka Metrik**: Wajib sangat jelas terbaca dengan warna gelap kontras tinggi (`text-slate-900`, `text-slate-800`).
- **Teks Sekunder / Label**: Menggunakan `text-slate-500` atau `text-slate-600` yang terkesan elegan dan tidak silau.
- **Dilarang**: Menulis teks abu-abu pudar di atas background hitam atau teks putih di kotak gelap.

### D. Warna Aksen & Indikator Status
Gunakan palet warna laboratorium korporat yang segar, bersih, dan berwibawa:
- **Primary / Brand**: Teal/Toska (`teal-600`, `teal-700`), Emerald/Hijau (`emerald-600`, `emerald-700`), Indigo (`indigo-600`).
- **Status Sukses / Selesai**: Background hijau muda lembut (`bg-emerald-50 text-emerald-700 border-emerald-200`).
- **Status Perhatian / Backlog**: Background kuning/oranye muda lembut (`bg-amber-50 text-amber-700 border-amber-200`).
- **Status Kritis / Bottleneck**: Background merah muda lembut (`bg-rose-50 text-rose-700 border-rose-200`).
- **Status Netral / Standby**: Background biru muda lembut (`bg-blue-50 text-blue-700 border-blue-200`).

## 3. Penerapan Kelas Tailwind
- Jika menulis styling Tailwind, default styling WAJIB adalah varian terang (misal: `bg-white text-slate-900 border-slate-200`).
- Jangan pernah memaksakan elemen berlatar belakang gelap pekat (`bg-slate-900`, `bg-black`) sebagai tema utama modul.
