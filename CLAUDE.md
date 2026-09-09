# CLAUDE.md - PrepLab Portal Project Guide

## 1. Project Overview & Architecture
**PrepLab Portal** adalah sistem operasional terpadu untuk laboratorium preparasi & analisis kimia (Prep & Lab TBP).
- **Frontend**: React (Vite), TypeScript, Tailwind CSS, Lucide React, Chart.js, Sonner (toast), TanStack Query, Framer Motion.
- **Backend**: Node.js Express server (`server.ts` & `server/routes/*`), TypeScript dieksekusi via `tsx`.
- **Database**: PostgreSQL dikelola via Drizzle ORM (`src/db/schema.ts` & `src/db/index.ts`).
- **External Services**: Google Drive API & Google Sheets API untuk arsip foto, PDF laporan, dan sync roster.

## 2. Development Commands
- Run Dev Server: `npm run dev` (Menjalankan `tsx watch server.ts` yang melayani Express API + Vite HMR)
- Type Check / Lint: `npm run lint` (Menjalankan `tsc --noEmit`)
- Build Production: `npm run build`
- Run Tests: `npm test`

## 3. Critical Domain Rules & Conventions
1. **Pemisahan Tiket Temuan vs WO Permintaan**:
   - **Temuan Inspeksi K3**: `source: 'inspeksi'`, format ID `TKT-W<week>Y<yy>-<seq>`. Wajib memiliki atribut risiko K3 (`risk`) & saran pengendalian (`initialControl`). Ditampilkan di SAP Dashboard.
   - **Internal Work Order (WO Permintaan)**: `source: 'internal'`, format ID `RWO-<timestamp>` atau `RWO-YYMMDD-N`. Memiliki `targetDate`. Dikelola di modul Work Order (`/wo`).
   - **DILARANG** mencampurkan tiket internal ke dalam tiket temuan inspeksi.

2. **29 Agenda Inspeksi K3 Mingguan & PIC Supervisor**:
   Terdapat tepat 29 agenda inspeksi per minggu (target mingguan = 29) yang dipetakan ke 4 PIC:
   - **Laboratory Maintenance Supervisor (4 Agenda)**: Area Maintenance & Workshop, APD Maintenance, Perkakas Tangan Portabel, Tangga Portabel.
   - **Inventory Control Supervisor (5 Agenda)**: Gudang Chemical, Gudang Laboratorium, Gudang Kontainer A, Gudang Kontainer B, Gudang Preparasi A & B.
   - **Laboratory Supervisor (9 Agenda)**: R. Chiller/UPS/XRF, R. Fusion/Timbang/Scrubber, R. Office-QAIC-Admin-Manager-Meeting, APD Shift A Lab, APD Shift B Lab, R. Press/Koridor Lab, Checklist P3K Lab, Kelengkapan Saranaprasarana Unit, Pra Pakai Tabung Gas Bertekanan.
   - **Preparation Supervisor, Wet & Dry (11 Agenda)**: Preparasi Basah (Area Kerja), Preparasi Basah (Office/Toilet/Loker), Preparasi Kering (Area Kerja/Halte/Parkiran), Preparasi Kering (Office/Dust Collector/Kompresor), APD Shift A Prep, APD Shift B Prep, Gudang Arsip, Gudang Transit & Pantry, Koridor & Area Carpenter, Checklist P3K Prep Kering, Checklist P3K Prep Basah.
   - Gunakan selalu helper `src/utils/inspection-pic-matcher.ts` untuk pencocokan agenda & PIC.

3. **Perhitungan Minggu ISO (ISO Week)**:
   - Menggunakan standar ISO-8601 (Senin = hari pertama, W01-W52/53).
   - Selalu gunakan utility fungsi dari `src/utils/iso-week.ts`.

4. **Integritas Database**:
   - Skema tabel didefinisikan di `src/db/schema.ts`.
   - Jangan pernah menghapus kolom atau tabel yang sudah memiliki relasi data historis.

5. **Style & Komponen**:
   - Gunakan komponen dasar dari `src/components/ui.tsx` (Card, Button, Input, Select, Textarea).
   - Gunakan toast notifikasi dari `sonner` (`toast.success`, `toast.error`).
   - Gunakan Lucide icons secara konsisten.
   - Jalankan `npm run lint` setelah melakukan pengeditan TypeScript untuk memastikan 0 error.
