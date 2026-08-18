import { db } from './src/db/index.js';
import { questions } from './src/db/schema.js';

const mockQuestions = [
  // 1. UMUM (Area)
  {
    idForm: 'F01', judulForm: 'Inspeksi Area Preparasi', tipeInput: 'UMUM', kategori: 'Area Kerja',
    item: 'Apakah lantai bersih dan tidak licin?', info1: 'Preparasi,Kotor,Bersih', info2: ''
  },
  {
    idForm: 'F01', judulForm: 'Inspeksi Area Preparasi', tipeInput: 'UMUM', kategori: 'Area Kerja',
    item: 'Apakah ventilasi berfungsi dengan baik?', info1: 'Preparasi,Kipas,Exhaust', info2: ''
  },
  {
    idForm: 'F01', judulForm: 'Inspeksi Area Preparasi', tipeInput: 'UMUM', kategori: 'Penerangan',
    item: 'Penerangan area kerja memadai?', info1: 'ALL', info2: ''
  },
  
  // 2. KOTAK P3K
  {
    idForm: 'P01', judulForm: 'Inspeksi Kotak P3K Lab', tipeInput: 'P3K', kategori: 'Daftar Isi',
    item: 'Kasa Steril', info1: '40', info2: 'pcs'
  },
  {
    idForm: 'P01', judulForm: 'Inspeksi Kotak P3K Lab', tipeInput: 'P3K', kategori: 'Daftar Isi',
    item: 'Perban (lebar 5 cm)', info1: '6', info2: 'roll'
  },
  {
    idForm: 'P01', judulForm: 'Inspeksi Kotak P3K Lab', tipeInput: 'P3K', kategori: 'Daftar Isi',
    item: 'Betadine', info1: '1', info2: 'botol'
  },
  {
    idForm: 'P01', judulForm: 'Inspeksi Kotak P3K Lab', tipeInput: 'P3K', kategori: 'Daftar Isi',
    item: 'Gunting', info1: '1', info2: 'pcs'
  },

  // 3. PERKAKAS (Asset & Lainnya)
  {
    idForm: 'A01', judulForm: 'Inspeksi Perkakas Tangan', tipeInput: 'PERKAKAS', kategori: 'Checklist',
    item: 'Palu dalam kondisi baik?', info1: 'ALL', info2: ''
  },
  {
    idForm: 'A01', judulForm: 'Inspeksi Perkakas Tangan', tipeInput: 'PERKAKAS', kategori: 'Checklist',
    item: 'Kunci pas bebas retak?', info1: 'ALL', info2: ''
  },

  // 4. TABUNG / TABUNG_MINGGUAN
  {
    idForm: 'T01', judulForm: 'Inspeksi Tabung Gas', tipeInput: 'TABUNG', kategori: 'Tabung Gas',
    item: 'Tabung Argons (Laboratorium)', info1: 'Argon', info2: ''
  },
  {
    idForm: 'T01', judulForm: 'Inspeksi Tabung Gas', tipeInput: 'TABUNG', kategori: 'Tabung Gas',
    item: 'Tabung Oksigen', info1: 'Oksigen', info2: ''
  },

  // 5. SARANA
  {
    idForm: 'S01', judulForm: 'Inspeksi Sarana Kritis', tipeInput: 'SARANA', kategori: 'Sistem',
    item: 'Alarm kebakaran berfungsi?', info1: 'ALL', info2: ''
  },

  // 6. TANGGA
  {
    idForm: 'L01', judulForm: 'Inspeksi Tangga Portable', tipeInput: 'TANGGA', kategori: 'Kondisi Fisik',
    item: 'Bebas dari retak / bengkok?', info1: 'ALL', info2: ''
  },
];

async function seed() {
  await db.delete(questions);
  for (const q of mockQuestions) {
    await db.insert(questions).values(q);
  }
  console.log("Seeded questions table successfully!");
}
seed().catch(console.error);
