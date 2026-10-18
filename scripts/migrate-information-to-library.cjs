const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME
});

const cacheFile = path.join(__dirname, 'attachments-cache.json');
let cache = {};
if (fs.existsSync(cacheFile)) {
  cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
}

function getCachedFile(filename, fallbackUrl = '') {
  const clean = (filename || '').replace(/[^a-zA-Z0-9._\-]/g, '_').replace(/_+/g, '_').toLowerCase();
  if (cache[clean]?.driveId) {
    return {
      name: filename,
      driveId: cache[clean].driveId,
      viewUrl: cache[clean].driveViewUrl || `https://drive.google.com/file/d/${cache[clean].driveId}/view?usp=sharing`,
      downloadUrl: cache[clean].driveDownloadUrl || `https://drive.google.com/uc?id=${cache[clean].driveId}&export=download`,
      directUrl: cache[clean].directUrl || (cache[clean].mimeType?.startsWith('image/') ? `https://lh3.googleusercontent.com/d/${cache[clean].driveId}` : cache[clean].driveViewUrl)
    };
  }
  return {
    name: filename,
    driveId: '',
    viewUrl: fallbackUrl || '#',
    downloadUrl: fallbackUrl || '#',
    directUrl: fallbackUrl || '#'
  };
}

function cleanMarkdownUrls(content) {
  if (!content) return '';
  let updated = content;

  // Replace any S3 attachment link with cached Drive / local link
  for (const [key, item] of Object.entries(cache)) {
    if (item.driveId && item.fileName) {
      const escapedName = item.fileName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      // replace [item.fileName](https://...amazonaws.com...)
      const reg = new RegExp(`\\[([^\\]]*${escapedName}[^\\]]*)\\]\\(https?:\\/\\/[^\\)]*amazonaws\\.com[^\\)]*\\)`, 'gi');
      updated = updated.replace(reg, `[$1](${item.driveDownloadUrl || item.driveViewUrl})`);

      // Also replace bare S3 image links if any
      const imgReg = new RegExp(`!\\[([^\\]]*)\\]\\(https?:\\/\\/[^\\)]*amazonaws\\.com[^\\)]*\\)`, 'gi');
      if (item.mimeType?.startsWith('image/')) {
        updated = updated.replace(imgReg, `![$1](${item.driveDownloadUrl || item.driveViewUrl})`);
      }
    }
  }

  return updated;
}

async function main() {
  const client = await pool.connect();
  console.log('🚀 MEMULAI MIGRASI INFORMASI KE KATEGORI LIBRARY LABNOTE...\n');

  try {
    // -------------------------------------------------------------
    // 1. UPDATE POSTS FROM NOTION INFORMATION TO LIBRARY CATEGORIES
    // -------------------------------------------------------------
    const POST_UPDATES = [
      // --- HSE & K3LH: JSA ---
      {
        notionId: '17bd00c5-c809-8168-8ba3-dbe8e2c5f8cc',
        id: 490,
        title: '[JSA-HSE-01] Golden Rules (7 Standar Kepatuhan K3 Utama Pertambangan)',
        category: 'LIBRARY_JSA',
        department: 'HSE & K3LH',
        tags: ['LIBRARY', 'JSA', 'HSE & K3LH', 'GOLDEN_RULES', 'K3']
      },
      {
        notionId: '21dd00c5-c809-805e-a9e3-f7ba66db1dcf',
        id: 491,
        title: '[JSA-HSE-02] Golden Rule 1: Keselamatan di Jalan Tambang & Hauling',
        category: 'LIBRARY_JSA',
        department: 'HSE & K3LH',
        tags: ['LIBRARY', 'JSA', 'HSE & K3LH', 'GOLDEN_RULES']
      },
      {
        notionId: '21dd00c5-c809-80b2-a396-d5acb416a383',
        id: 492,
        title: '[JSA-HSE-03] Golden Rule 2: Kepatuhan Peraturan Rambu Lalu Lintas & Marka',
        category: 'LIBRARY_JSA',
        department: 'HSE & K3LH',
        tags: ['LIBRARY', 'JSA', 'HSE & K3LH', 'GOLDEN_RULES']
      },
      {
        notionId: '21dd00c5-c809-8086-835e-fdea76ef1992',
        id: 494,
        title: '[JSA-HSE-04] Golden Rule 3: Pekerjaan Berisiko Tinggi (Working at Height, Panas, Listrik)',
        category: 'LIBRARY_JSA',
        department: 'HSE & K3LH',
        tags: ['LIBRARY', 'JSA', 'HSE & K3LH', 'GOLDEN_RULES']
      },
      {
        notionId: '223d00c5-c809-8007-8011-e60a4b43fc7c',
        id: 493,
        title: '[JSA-HSE-05] Golden Rule 4: Isolasi Energi, Lock Out Tag Out (LOTO) & Zero Energy',
        category: 'LIBRARY_JSA',
        department: 'HSE & K3LH',
        tags: ['LIBRARY', 'JSA', 'HSE & K3LH', 'GOLDEN_RULES', 'LOTO']
      },
      {
        notionId: '223d00c5-c809-80a8-9094-d0097330a4fe',
        id: 495,
        title: '[JSA-HSE-06] Golden Rule 5: Pengangkatan dan Penyanggaan Beban Berat (Lifting & Rigging)',
        category: 'LIBRARY_JSA',
        department: 'HSE & K3LH',
        tags: ['LIBRARY', 'JSA', 'HSE & K3LH', 'GOLDEN_RULES']
      },
      {
        notionId: '223d00c5-c809-80e5-84f8-da359d891708',
        id: 496,
        title: '[JSA-HSE-07] Golden Rule 6: Bekerja di Ruang Terbatas (Confined Space Entry)',
        category: 'LIBRARY_JSA',
        department: 'HSE & K3LH',
        tags: ['LIBRARY', 'JSA', 'HSE & K3LH', 'GOLDEN_RULES']
      },
      {
        notionId: '223d00c5-c809-807b-a06b-f0d4770a36a3',
        id: 497,
        title: '[JSA-HSE-08] Golden Rule 7: Kelayakan Peralatan dan Perlengkapan Kerja',
        category: 'LIBRARY_JSA',
        department: 'HSE & K3LH',
        tags: ['LIBRARY', 'JSA', 'HSE & K3LH', 'GOLDEN_RULES']
      },
      {
        notionId: '2a7d00c5-c809-80c3-9597-e136bbabcb91',
        id: 510,
        title: '[JSA-HSE-09] Identifikasi Bahaya dan Pengendalian Risiko (IBPR) Dept Prep & Lab 2025',
        category: 'LIBRARY_JSA',
        department: 'HSE & K3LH',
        tags: ['LIBRARY', 'JSA', 'HSE & K3LH', 'IBPR', 'RISK']
      },
      {
        notionId: '2a7d00c5-c809-809c-8082-e618556e8c33',
        id: 511,
        title: '[JSA-ENV-01] Identifikasi & Evaluasi Aspek Dampak Lingkungan (IADL) Dept Prep & Lab 2025',
        category: 'LIBRARY_JSA',
        department: 'HSE & K3LH',
        tags: ['LIBRARY', 'JSA', 'HSE & K3LH', 'IADL', 'ENVIRONMENT']
      },
      {
        notionId: '2a7d00c5-c809-80bf-b69c-cec3c55419ae',
        id: 512,
        title: '[JSA-SEC-01] Security Risk Assessment (SRA) & TUSASPRO Dept Prep & Lab',
        category: 'LIBRARY_JSA',
        department: 'HSE & K3LH',
        tags: ['LIBRARY', 'JSA', 'HSE & K3LH', 'SRA', 'SECURITY']
      },

      // --- HSE & K3LH: SAFETY FLASH & ALERT ---
      {
        notionId: '207d00c5-c809-800c-bf51-ea4e5111bf3f',
        id: 498,
        title: '[SAFETY FLASH] Materi Briefing & Pembahasan Keselamatan Pertambangan Harian (Safety Talk)',
        category: 'LIBRARY_SAFETY_FLASH',
        department: 'HSE & K3LH',
        tags: ['LIBRARY', 'SAFETY_FLASH', 'HSE & K3LH', 'SAFETY_TALK', 'BRIEFING']
      },
      {
        notionId: 'd9f70ace-bd4b-4ad6-9394-ad5075b8041e',
        id: 504,
        title: '[SAFETY FLASH] Internal Memo Safety HSE (MCU Berkala, Sanksi Fatigue, Induksi Cuti & Regulasi Insiden)',
        category: 'LIBRARY_SAFETY_FLASH',
        department: 'HSE & K3LH',
        tags: ['LIBRARY', 'SAFETY_FLASH', 'HSE & K3LH', 'FATIGUE', 'MEMO']
      },
      {
        notionId: '19fd00c5-c809-8073-acc9-e79b52d2b5a2',
        id: 505,
        title: '[SAFETY FLASH] Program Hari Sehat & Kampanye Bebas Tembakau TBP GPS',
        category: 'LIBRARY_SAFETY_FLASH',
        department: 'HSE & K3LH',
        tags: ['LIBRARY', 'SAFETY_FLASH', 'HSE & K3LH', 'HEALTH', 'PROMOSI']
      },
      {
        notionId: '207d00c5-c809-8002-b9fd-dce7e6413ff9',
        id: 499,
        title: '[SAFETY FLASH] Envormasi Comic: Media Edukasi Kesadaran Lingkungan & Pengelolaan Sampah',
        category: 'LIBRARY_SAFETY_FLASH',
        department: 'HSE & K3LH',
        tags: ['LIBRARY', 'SAFETY_FLASH', 'HSE & K3LH', 'ENVIRONMENT', 'COMIC']
      },

      // --- HSE & K3LH: SOP & KEBIJAKAN ---
      {
        notionId: '282d00c5-c809-801a-8cf3-d8c59b01557f',
        id: 507,
        title: '[SOP-POL-01] Kebijakan Terpadu Perusahaan (Kebijakan K3 R0.3, Lingkungan 2026, Keamanan Rev0.1)',
        category: 'LIBRARY_SOP',
        department: 'HSE & K3LH',
        tags: ['LIBRARY', 'SOP', 'HSE & K3LH', 'KEBIJAKAN']
      },
      {
        notionId: 'f9696bbb-95fd-4345-b208-4cf688eb49c3',
        id: 514,
        title: '[SOP-ISO-01] ISO 14001:2015 Sistem Manajemen Lingkungan Terstandarisasi',
        category: 'LIBRARY_SOP',
        department: 'HSE & K3LH',
        tags: ['LIBRARY', 'SOP', 'HSE & K3LH', 'ISO_14001', 'ENVIRONMENT']
      },
      {
        notionId: '4c4cc6f5-f7f0-4c36-b23e-8167092d613a',
        id: 515,
        title: '[SOP-ISO-02] ISO 45001:2018 Sistem Manajemen Keselamatan dan Kesehatan Kerja (SMK3)',
        category: 'LIBRARY_SOP',
        department: 'HSE & K3LH',
        tags: ['LIBRARY', 'SOP', 'HSE & K3LH', 'ISO_45001', 'SMK3']
      },

      // --- HSE & K3LH: IK (INSTRUKSI KERJA) ---
      {
        notionId: '26fd00c5-c809-80a2-bf17-f7d21544f477',
        id: 508,
        title: '[IK-HSE-01] Materi Induksi Keselamatan Internal (Karyawan Baru, Visitor & Balik Cuti)',
        category: 'LIBRARY_IK',
        department: 'HSE & K3LH',
        tags: ['LIBRARY', 'IK', 'HSE & K3LH', 'INDUKSI', 'TRAINING']
      },

      // --- ADMINISTRASI & UMUM: SOP ---
      {
        notionId: 'b6b91d56-118d-4acf-a542-64deed757549',
        id: 500,
        title: '[SOP-ADM-01] Surat Pernyataan Disiplin Kerja (SPDK Rev03) & Tata Tertib Karyawan',
        category: 'LIBRARY_SOP',
        department: 'Administrasi & Umum',
        tags: ['LIBRARY', 'SOP', 'Administrasi & Umum', 'SPDK', 'DISIPLIN']
      },
      {
        notionId: 'ca461296-4744-45aa-a425-805960a2f584',
        id: 503,
        title: '[SOP-HR-01] Kompendium Internal Memo HRGA (30+ Memo Cuti, Fingerprint, Ramadhan, Sanksi & Fasilitas)',
        category: 'LIBRARY_SOP',
        department: 'Administrasi & Umum',
        tags: ['LIBRARY', 'SOP', 'Administrasi & Umum', 'HR', 'INTERNAL_MEMO']
      },
      {
        notionId: 'b283d6e6-fcd6-4156-9139-5d2808d44863',
        id: 502,
        title: '[SOP-IT-01] Kebijakan & Prosedur IT (SOP IT, Akses CCTV, Larangan VPN & APK Bajakan)',
        category: 'LIBRARY_SOP',
        department: 'Administrasi & Umum',
        tags: ['LIBRARY', 'SOP', 'Administrasi & Umum', 'IT', 'CYBERSECURITY']
      },
      {
        notionId: '223d00c5-c809-80bd-b795-f679ffaa644f',
        id: 501,
        title: '[SOP-HR-02] Job Description Struktur Organisasi Prep & Lab (19 Uraian Jabatan & Wewenang)',
        category: 'LIBRARY_SOP',
        department: 'Administrasi & Umum',
        tags: ['LIBRARY', 'SOP', 'Administrasi & Umum', 'JOB_DESC', 'STRUKTUR']
      },
      {
        notionId: '221d00c5-c809-80fd-bddb-cf10771abb8e',
        id: 513,
        title: '[SOP-ADM-02] Hasil Meeting Koordinasi Internal Preparation & Laboratory',
        category: 'LIBRARY_SOP',
        department: 'Administrasi & Umum',
        tags: ['LIBRARY', 'SOP', 'Administrasi & Umum', 'MEETING', 'NOTULENSI']
      },
      {
        notionId: '90603168-9c35-481d-abd2-db3f6d2401cd',
        id: 484,
        title: '[SOP-CORP-01] Harita Core Values (Panduan Nilai Inti & Etika Kerja Harita Ways)',
        category: 'LIBRARY_SOP',
        department: 'Administrasi & Umum',
        tags: ['LIBRARY', 'SOP', 'Administrasi & Umum', 'CORE_VALUES', 'BUDAYA']
      },

      // --- ADMINISTRASI & UMUM: IK ---
      {
        notionId: '21ed00c5-c809-804d-b445-f99d1048ee4a',
        id: 509,
        title: '[IK-HR-01] Training Need Analysis (TNA) Matriks Kebutuhan & Pelatihan Kompetensi 2025',
        category: 'LIBRARY_IK',
        department: 'Administrasi & Umum',
        tags: ['LIBRARY', 'IK', 'Administrasi & Umum', 'TNA', 'TRAINING']
      },
      {
        notionId: '12ed00c5-c809-8053-a7bd-cc6b6d5af4be',
        id: 483,
        title: '[IK-IT-01] Informasi Layanan & Panduan Dukungan Akun IT Penempatan Site',
        category: 'LIBRARY_IK',
        department: 'Administrasi & Umum',
        tags: ['LIBRARY', 'IK', 'Administrasi & Umum', 'IT', 'SUPPORT']
      },
      {
        notionId: '5db2aeb0-4bf5-44de-aa1f-b4f57254e31b',
        id: 489,
        title: '[IK-IT-02] Direktori QR Code Akses Cepat Formulir & Dokumen Operasional',
        category: 'LIBRARY_IK',
        department: 'Administrasi & Umum',
        tags: ['LIBRARY', 'IK', 'Administrasi & Umum', 'QR_CODE']
      },

      // --- QUALITY ASSURANCE: SOP ---
      {
        notionId: '235d00c5-c809-80e4-8c30-d0bbf5a97235',
        id: 506,
        title: '[SOP-QA-01] Executive Memo QC: Kesepakatan Spesifikasi Kadar Ni Supply PT TBP ke PT ONC & HPL',
        category: 'LIBRARY_SOP',
        department: 'Quality Assurance',
        tags: ['LIBRARY', 'SOP', 'Quality Assurance', 'EM_QC', 'KADAR_NI']
      },

      // --- OPERASIONAL PREPARASI & LAB (Existing PROSEDUR posts) ---
      {
        notionId: '12bd00c5-c809-8060-a627-c02340d2da4c',
        id: 726,
        title: '[SOP-PREP-01] Standar Operasional Prosedur Preparasi Sampel Mineral Ore & Batuan',
        category: 'LIBRARY_SOP',
        department: 'Sample Preparation',
        tags: ['LIBRARY', 'SOP', 'Sample Preparation', 'ORE_PREP']
      },
      {
        notionId: '2cbd00c5-c809-80ae-b82f-c01cb27fd050',
        id: 729,
        title: '[JSA-PREP-01] Job Safety Analysis (JSA) Pengoperasian Alat & Mesin Preparasi',
        category: 'LIBRARY_JSA',
        department: 'Sample Preparation',
        tags: ['LIBRARY', 'JSA', 'Sample Preparation', 'SAFETY']
      },
      {
        notionId: '171d00c5-c809-80f4-88c7-d25724088711',
        id: 730,
        title: '[SOP-LAB-01] Standar Operasional Prosedur Pengujian Laboratorium Kimia & Fisik',
        category: 'LIBRARY_SOP',
        department: 'Wet Laboratory',
        tags: ['LIBRARY', 'SOP', 'Wet Laboratory', 'ANALISIS_KIMIA']
      },
      {
        notionId: '171d00c5-c809-8014-a587-dc9c7b0a124e',
        id: 731,
        title: '[SOP-QA-02] Standar Operasional Pengendalian Mutu & Pasokan Ore Smelter',
        category: 'LIBRARY_SOP',
        department: 'Quality Assurance',
        tags: ['LIBRARY', 'SOP', 'Quality Assurance', 'SMELTER']
      },
      {
        notionId: '12bd00c5-c809-8057-8957-f015eec446ea',
        id: 732,
        title: '[IK-PREP-01] Instruksi Kerja Teknis Tahapan Preparasi (Drying, Crushing, Pulverizing, Splitting)',
        category: 'LIBRARY_IK',
        department: 'Sample Preparation',
        tags: ['LIBRARY', 'IK', 'Sample Preparation', 'ALAT_PREP']
      },
      {
        notionId: '12bd00c5-c809-80ad-b7e2-f7f3da841425',
        id: 733,
        title: '[IK-LAB-01] Instruksi Kerja Teknis Pengujian Basah & Penimbangan Presisi Laboratorium',
        category: 'LIBRARY_IK',
        department: 'Wet Laboratory',
        tags: ['LIBRARY', 'IK', 'Wet Laboratory', 'WET_LAB']
      },
      {
        notionId: '12ed00c5-c809-800c-a5ff-e8fed2fc6c77',
        id: 734,
        title: '[IK-PREP-02] Diagram Alir (Flowchart) Proses Alur Kerja Preparasi Sampel',
        category: 'LIBRARY_IK',
        department: 'Sample Preparation',
        tags: ['LIBRARY', 'IK', 'Sample Preparation', 'FLOWCHART']
      },
      {
        notionId: '792a935a-f014-4de6-9139-415e59e109d4',
        id: 735,
        title: '[IK-QA-01] Petunjuk & Pedoman Teknis Verifikasi Mutu Laboratorium',
        category: 'LIBRARY_IK',
        department: 'Quality Assurance',
        tags: ['LIBRARY', 'IK', 'Quality Assurance', 'GUIDANCE']
      },

      // --- MASTER HUB ROOT INFORMATION (ID 479) ---
      {
        notionId: '12bd00c5-c809-8006-a5a8-fb55eb68f5d8',
        id: 479,
        title: 'Company Library Hub: Pusat Dokumen Resmi & K3 Perusahaan (Master Index)',
        category: 'LIBRARY_ALL',
        department: 'Administrasi & Umum',
        tags: ['LIBRARY', 'ALL', 'HUB', 'MASTER_INDEX']
      }
    ];

    console.log(`Mengupdate ${POST_UPDATES.length} dokumen utama ke standar Library...`);
    for (const item of POST_UPDATES) {
      // Fetch current content to clean S3 URLs
      const cur = await client.query('SELECT content FROM bulletin_posts WHERE id = $1 OR notion_id = $2', [item.id, item.notionId]);
      let content = cur.rows[0]?.content || '';

      // Enrich empty content for ISO standards if needed
      if (item.notionId === 'f9696bbb-95fd-4345-b208-4cf688eb49c3' && content.length < 50) {
        content = `
> [!NOTE]
> **DOKUMEN RESMI PREPLAB PERUSAHAAN**  
> **Status**: 🟢 Aktif / Berlaku | **Seksi Pemilik**: HSE & K3LH | **Jenis**: SOP Sistem Manajemen Lingkungan  
> **Standar Rujukan**: SNI ISO 14001:2015 Sistem Manajemen Lingkungan

### Ruang Lingkup & Kebijakan
Dokumen ini menetapkan persyaratan untuk sistem manajemen lingkungan yang diterapkan pada seluruh area operasional Departemen Preparation & Laboratorium PT. Trimegah Bangun Persada (TBP) dan PT. Gane Permai Sentosa (GPS).

### Prinsip Utama ISO 14001:
1. **Pencegahan Pencemaran**: Pengendalian emisi debu preparasi, pengelolaan limbah tailing/reject batuan ore, dan netralisasi air asam lab.
2. **Kepatuhan Regulasi**: Memenuhi seluruh baku mutu lingkungan hidup dan izin pembuangan limbah B3.
3. **Pengelolaan Bahan Kimia B3**: Penyimpanan, pelabelan, simbol bahaya, dan penanganan tumpahan reagen kimia cair/padat.
4. **Efisiensi Sumber Daya**: Penghematan konsumsi listrik oven pengering, air demineralisasi, dan pemilahan sampah organik/anorganik.

> 📥 **Dokumen Terkait**: Silakan rujuk ke Matriks [IADL Dept Prep & Lab](#) dan Kebijakan Lingkungan Perusahaan Tahun 2026.
        `.trim();
      } else if (item.notionId === '4c4cc6f5-f7f0-4c36-b23e-8167092d613a' && content.length < 50) {
        content = `
> [!NOTE]
> **DOKUMEN RESMI PREPLAB PERUSAHAAN**  
> **Status**: 🟢 Aktif / Berlaku | **Seksi Pemilik**: HSE & K3LH | **Jenis**: SOP Sistem Manajemen K3  
> **Standar Rujukan**: ISO 45001:2018 / SMK3 PP 50 Tahun 2012

### Ruang Lingkup & Kebijakan
Standar baku manajemen Keselamatan dan Kesehatan Kerja (K3) untuk memberikan tempat kerja yang aman dan sehat, mencegah cedera kerja, dan gangguan kesehatan kerja personil Preparasi dan Laboratorium.

### Prinsip Utama ISO 45001:
1. **Konsultasi & Partisipasi Pekerja**: Pelaksanaan P5M harian, safety briefing, pelaporan KTA/TTA, dan evaluasi komite K3.
2. **Hirarki Pengendalian Bahaya**: Eliminasi, Substitusi, Rekayasa Teknik (Dust Collector/Ventilasi), Administratif (SOP/JSA/LOTO), dan APD lengkap.
3. **Kesiapsiagaan Tanggap Darurat**: Prosedur evakuasi gempa/kebakaran, ketersediaan APAR, eye wash station, dan kotak P3K terkalibrasi.
4. **Pemeriksaan Kesehatan Kerja**: Medical Check-Up (MCU) berkala, pemantauan radiasi dosimeter TLD badge personil XRF, dan manajemen fatigue.

> 📥 **Dokumen Terkait**: Silakan rujuk ke Matriks [IBPR Dept Prep & Lab](#) dan [Golden Rules Keselamatan Tambang](#).
        `.trim();
      }

      // Add Official Document Header if not present
      if (!content.includes('DOKUMEN RESMI PREPLAB')) {
        const header = `> [!NOTE]\n> **DOKUMEN RESMI PREPLAB PERUSAHAAN**\n> **Status**: 🟢 Aktif / Berlaku | **Seksi Pemilik**: ${item.department} | **Kategori**: ${item.category.replace('LIBRARY_', '')}\n> **Akses File**: Dokumen asli & lampiran resmi terintegrasi di Google Drive\n\n---\n\n`;
        content = header + content;
      }

      content = cleanMarkdownUrls(content);

      await client.query(`
        UPDATE bulletin_posts 
        SET title = $1, 
            category = $2, 
            department = $3, 
            tags = $4, 
            content = $5,
            universe = 'TBP_GPS'
        WHERE id = $6 OR notion_id = $7;
      `, [item.title, item.category, item.department, item.tags, content, item.id, item.notionId]);

      console.log(`  ✓ Berhasil update ID #${item.id} -> "${item.title}" [${item.category} / ${item.department}]`);
    }

    // ----------------------------------------------------------------------
    // 2. CREATE DEDICATED LIBRARY POSTS FOR CHILD DATABASES
    // ----------------------------------------------------------------------
    console.log('\nMemproses pembuatan dokumen dedicated untuk Database Notion...\n');

    // A. CRM (Certified Reference Materials)
    const crmDbId = '15dd00c5-c809-80d1-9e6c-e5dd265875ab';
    const crmRows = [
      { code: 'OREAS 192', cert: 'OREAS 192 Certificate.pdf', data: 'OREAS 192 DataPack.xlsx', desc: 'Standar Matriks Nikel Laterit Kadar Tinggi' },
      { code: 'OREAS 191', cert: 'OREAS 191 Certificate.pdf', data: 'OREAS 191 DataPack.xlsx', desc: 'Standar Matriks Nikel Laterit Limonit' },
      { code: 'OREAS 190', cert: 'OREAS 190 Certificate.pdf', data: 'OREAS 190 DataPack.xlsx', desc: 'Standar Nikel Saprolit Akurasi Tinggi' },
      { code: 'OREAS 189', cert: 'OREAS 189 Certificate.pdf', data: 'OREAS 189 DataPack.xlsx', desc: 'Standar Ore Nikel Medium Grade' },
      { code: 'OREAS 187', cert: 'OREAS 187 Certificate.pdf', data: 'OREAS 187 DataPack.xlsx', desc: 'Standar Kalibrasi XRF Nikel' },
      { code: 'OREAS 186', cert: 'OREAS 186 Certificate.pdf', data: 'OREAS 186 DataPack.xlsx', desc: 'Standar Mutu QA Laboratorium' },
      { code: 'OREAS 185', cert: 'OREAS 185 Certificate.pdf', data: 'OREAS 185 DataPack.xlsx', desc: 'Standar Verifikasi Instrumen ED-XRF' },
      { code: 'OREAS 184', cert: 'OREAS 184 Certificate.pdf', data: 'OREAS 184 DataPack.xlsx', desc: 'Standar Kontrol Kualitas Laboratorium' },
      { code: 'OREAS 183', cert: 'OREAS 183 Certificate.pdf', data: 'OREAS 183 DataPack.xlsx', desc: 'Standar Presisi Pengujian Nikel' },
      { code: 'OREAS 182', cert: 'OREAS 182 Certificate.pdf', data: 'OREAS 182 DataPack.xlsx', desc: 'Standar Batuan Mineral Laterit' },
      { code: 'OREAS 181', cert: 'OREAS 181 Certificate.pdf', data: 'OREAS 181 DataPack.xlsx', desc: 'Standar Kalibrasi WD-XRF Zetium' },
      { code: 'OREAS 180', cert: 'OREAS 180 Certificate.pdf', data: 'OREAS 180 DataPack.xlsx', desc: 'Standar Acuan Baseline Analisis Kimia' }
    ];

    let crmMd = `> [!NOTE]\n> **DOKUMEN RESMI PREPLAB PERUSAHAAN**  \n> **Status**: 🟢 Aktif / Berlaku | **Seksi Pemilik**: Quality Assurance | **Kategori**: MSDS / Bahan Standar Acuan  \n> **Akses File**: Seluruh Sertifikat Resmi & DataPack Excel tersimpan permanen di Google Drive\n\n### 🧪 Repositori Certified Reference Materials (CRM)\nDatabase baku bahan acuan bersertifikat internasional (OREAS Australia) yang digunakan untuk kalibrasi instrumen XRF dan kontrol mutu analisis kadar (Ni, Fe, Co, SiO2, MgO, Al2O3) di Laboratorium PT TBP & GPS.\n\n---\n\n| No | Kode Standar CRM | Deskripsi Penggunaan | Sertifikat Analisis (PDF) | DataPack Lengkap (XLSX) |\n|---|---|---|---|---|\n`;

    crmRows.forEach((r, idx) => {
      const certFile = getCachedFile(r.cert);
      const dataFile = getCachedFile(r.data);
      const certLink = certFile.driveId ? `[📄 ${r.cert}](${certFile.downloadUrl})` : r.cert;
      const dataLink = dataFile.driveId ? `[📊 ${r.data}](${dataFile.downloadUrl})` : r.data;
      crmMd += `| ${idx + 1} | **${r.code}** | ${r.desc} | ${certLink} | ${dataLink} |\n`;
    });

    crmMd += `\n---\n\n> 💡 **Panduan QA**: Setiap pengujian batch harian wajib menyertakan minimal 1 CRM kontrol pada run analisis instrumen WD-XRF/ED-XRF.`;

    await client.query(`
      INSERT INTO bulletin_posts (title, notion_id, department, category, content, tags, pt, universe)
      VALUES ($1, $2, $3, $4, $5, $6, 'TBP', 'TBP_GPS')
      ON CONFLICT (notion_id) DO UPDATE SET
        title = EXCLUDED.title,
        department = EXCLUDED.department,
        category = EXCLUDED.category,
        content = EXCLUDED.content,
        tags = EXCLUDED.tags,
        universe = EXCLUDED.universe;
    `, [
      '[MSDS-QA-01] Certified Reference Materials (CRM) & Standar OREAS Database',
      crmDbId,
      'Quality Assurance',
      'LIBRARY_MSDS',
      crmMd,
      ['LIBRARY', 'MSDS', 'Quality Assurance', 'CRM', 'OREAS']
    ]);
    console.log('  ✓ Berhasil membuat post Library: [MSDS-QA-01] CRM OREAS Database');

    // B. INHOUSE (In-House Reference Standards)
    const inhouseDbId = '2b4d00c5-c809-80a0-bfaf-cd7919a04644';
    const inhouseRows = [
      { code: 'LIMESTONE 04', cert: 'Sertifikat LIMESTONE 04 Eng.docx', desc: 'Standar In-House Batu Kapur / Limestone Matriks 04' },
      { code: 'LIMESTONE 03', cert: 'Sertifikat LIMESTONE 03 Eng.docx', desc: 'Standar In-House Batu Kapur / Limestone Matriks 03' },
      { code: 'LIMESTONE 02', cert: 'Sertifikat LIMESTONE 02 Eng.docx', desc: 'Standar In-House Batu Kapur / Limestone Matriks 02' },
      { code: 'LIMESTONE 01', cert: 'Sertifikat LIMESTONE 01 Eng.docx', desc: 'Standar In-House Batu Kapur / Limestone Matriks 01' },
      { code: 'LIM 05', cert: 'Sertifikat LIM 05 Eng.docx', desc: 'Standar In-House Limonit Batch 05' },
      { code: 'LIM 04', cert: 'Sertifikat LIM 04 Eng.docx', desc: 'Standar In-House Limonit Batch 04' },
      { code: 'LIM 03', cert: 'Sertifikat LIM 03 Eng.docx', desc: 'Standar In-House Limonit Batch 03' },
      { code: 'LIM 02', cert: 'Sertifikat LIM 02 Eng.docx', desc: 'Standar In-House Limonit Batch 02' },
      { code: 'LIM 01', cert: 'Sertifikat LIM 01 Eng.docx', desc: 'Standar In-House Limonit Batch 01' }
    ];

    let inhouseMd = `> [!NOTE]\n> **DOKUMEN RESMI PREPLAB PERUSAHAAN**  \n> **Status**: 🟢 Aktif / Berlaku | **Seksi Pemilik**: Wet Laboratory | **Kategori**: MSDS / Standar In-House  \n> **Akses File**: Dokumen sertifikat DOCX tersimpan permanen di Google Drive\n\n### 🧪 Repositori Standar Acuan In-House (Limestone & LIM)\nStandar sekunder internal yang diverifikasi secara statistik melalui pengujian round-robin antar analis dan perbandingan dengan CRM primer untuk kontrol harian rutin analisis laboratorium basah dan preparasi.\n\n---\n\n| No | Kode Standar In-House | Deskripsi Matriks | Dokumen Sertifikasi Resmi (DOCX) |\n|---|---|---|---|\n`;

    inhouseRows.forEach((r, idx) => {
      const certFile = getCachedFile(r.cert);
      const certLink = certFile.driveId ? `[📄 ${r.cert}](${certFile.downloadUrl})` : r.cert;
      inhouseMd += `| ${idx + 1} | **${r.code}** | ${r.desc} | ${certLink} |\n`;
    });

    inhouseMd += `\n---\n\n> 💡 **Ketentuan Penggunaan**: Standar in-house disimpan dalam desikator kedap udara untuk menjaga kelembaban konstan.`;

    await client.query(`
      INSERT INTO bulletin_posts (title, notion_id, department, category, content, tags, pt, universe)
      VALUES ($1, $2, $3, $4, $5, $6, 'TBP', 'TBP_GPS')
      ON CONFLICT (notion_id) DO UPDATE SET
        title = EXCLUDED.title,
        department = EXCLUDED.department,
        category = EXCLUDED.category,
        content = EXCLUDED.content,
        tags = EXCLUDED.tags,
        universe = EXCLUDED.universe;
    `, [
      '[MSDS-LAB-01] In-House Reference Standards (Limestone & LIM Matrix) Database',
      inhouseDbId,
      'Wet Laboratory',
      'LIBRARY_MSDS',
      inhouseMd,
      ['LIBRARY', 'MSDS', 'Wet Laboratory', 'INHOUSE', 'STANDAR']
    ]);
    console.log('  ✓ Berhasil membuat post Library: [MSDS-LAB-01] Inhouse Standards Database');

    // C. STANDARD METHODS (SNI & ISO)
    const stdMethodsDbId = '158d00c5-c809-80e5-a634-de4274d7cee2';
    const iso17025File = getCachedFile('SNI ISO-IEC 17025-2017 (Penetapan 2018) Unlocked.pdf');

    let stdMd = `> [!NOTE]\n> **DOKUMEN RESMI PREPLAB PERUSAHAAN**  \n> **Status**: 🟢 Aktif / Berlaku | **Seksi Pemilik**: Quality Assurance | **Kategori**: Instruksi Kerja & Metode Standar  \n> **Akses File**: Dokumen PDF Standar Nasional & Internasional tersimpan di Google Drive\n\n### 📘 Standard Methods & Regulasi Teknis Pengujian Laboratorium\nKoleksi dokumen standar SNI dan ISO yang menjadi acuan validitas metode sampling, preparasi, penentuan kadar air, dan pengujian kimia di Laboratorium PT TBP & GPS.\n\n---\n\n| No | Kode Standar | Judul Metode Teknis | Seksi Terkait | Dokumen Resmi (PDF) |\n|---|---|---|---|---|\n| 1 | **SNI ISO/IEC 17025:2017** | Persyaratan Umum Kompetensi Laboratorium Pengujian dan Kalibrasi | QA & All Lab | [📄 Buka Dokumen SNI ISO/IEC 17025](${iso17025File.downloadUrl}) |\n| 2 | **SNI 9339:2024** | Metode Uji Kadar Nikel, Besi, Kobalt dalam Bijih Nikel Laterit secara XRF | XRF & Prep | Tersedia di Lab QA |\n| 3 | **SNI 9320:2024** | Tata Cara Pengambilan dan Preparasi Contoh Bijih Nikel Laterit | Preparasi | Mengacu ke SOP-PREP-01 |\n| 4 | **SNI 7574:2010** | Penentuan Kadar Air Bebas (Free Moisture) Batuan dan Mineral | Preparasi | Prosedur Drying Oven |\n| 5 | **SNI 3488:2008** | Analisis Kimia Mineral dan Batuan secara Spektrometri Emisi | Wet Lab | Prosedur Titrasi & AAS |\n\n---\n\n> 🏆 **Komitmen Mutu**: Laboratorium Prep & Lab PT TBP berkomitmen menjaga mutu pengujian dengan presisi, akurasi, dan ketertelusuran standar rujukan nasional & internasional.`;

    await client.query(`
      INSERT INTO bulletin_posts (title, notion_id, department, category, content, tags, pt, universe)
      VALUES ($1, $2, $3, $4, $5, $6, 'TBP', 'TBP_GPS')
      ON CONFLICT (notion_id) DO UPDATE SET
        title = EXCLUDED.title,
        department = EXCLUDED.department,
        category = EXCLUDED.category,
        content = EXCLUDED.content,
        tags = EXCLUDED.tags,
        universe = EXCLUDED.universe;
    `, [
      '[IK-QA-02] Standard Methods Pengujian Laboratorium & SNI ISO/IEC 17025',
      stdMethodsDbId,
      'Quality Assurance',
      'LIBRARY_IK',
      stdMd,
      ['LIBRARY', 'IK', 'Quality Assurance', 'STANDARD', 'SNI', 'ISO']
    ]);
    console.log('  ✓ Berhasil membuat post Library: [IK-QA-02] Standard Methods Database');

    // D. MANUAL BOOK INSTRUMENT DAN ALAT
    const manualDbId = '15bd00c5-c809-807a-902f-e34d3cf4f75d';
    const zetiumFile = getCachedFile('Brochure_Zetium_2022.pdf');

    let manualMd = `> [!NOTE]\n> **DOKUMEN RESMI PREPLAB PERUSAHAAN**  \n> **Status**: 🟢 Aktif / Berlaku | **Seksi Pemilik**: XRF & Instrumentasi | **Kategori**: Instruksi Kerja & Manual Alat  \n> **Akses File**: Dokumen Manual & Brosur Teknis tersimpan di Google Drive\n\n### ⚙️ Manual Book & Petunjuk Teknis Alat Instrumentasi\nPanduan operasional, instalasi, kalibrasi, perawatan preventif, dan troubleshooting alat-alat canggih laboratorium pengujian.\n\n---\n\n| No | Nama Alat / Instrument | Manufaktur / Model | Fungsi Utama | Dokumen Teknis / Manual |\n|---|---|---|---|---|\n| 1 | **WD-XRF ZETIUM** | Malvern Panalytical (Zetium 4kW) | Spektrometri X-Ray Fluoresensi dispersi panjang gelombang akurasi ultra-tinggi untuk Ni, Fe, Co, SiO2, MgO, Al2O3 | [📄 Buka Manual WD-XRF Zetium (PDF)](${zetiumFile.downloadUrl}) |\n| 2 | **ED-XRF EPSILON 4** | Malvern Panalytical (Epsilon 4) | Spektrometri X-Ray Fluoresensi dispersi energi untuk verifikasi dan screening cepat kadar ore | Mengacu ke IK-INST-EPSILON |\n| 3 | **Automatic Fusion Machine** | Claisse / Katanax | Peleburan bead kaca sampel ore laterit dengan fluks lithium tetraborat | Mengacu ke IK-LAB-FUSION |\n| 4 | **Hydraulic Press Pelletizer** | Herzog / Enerpac (40 Ton) | Pembentukan pellet tekan binder wax untuk analisis XRF | Mengacu ke IK-PREP-PRESS |\n| 5 | **Ring Mill Pulverizer** | Essa / Rocklabs (Pneumatic) | Penggerusan batuan ore hingga kehalusan -200 mesh (75 mikron) | Mengacu ke IK-PREP-PULVERIZER |\n\n---\n\n> ⚠️ **Peringatan Keselamatan Alat**: Hanya personil yang telah lulus induksi teknis dan mengantongi otorisasi alat yang diperkenankan mengoperasikan instrumen WD-XRF dan Automatic Fusion Machine.`;

    await client.query(`
      INSERT INTO bulletin_posts (title, notion_id, department, category, content, tags, pt, universe)
      VALUES ($1, $2, $3, $4, $5, $6, 'TBP', 'TBP_GPS')
      ON CONFLICT (notion_id) DO UPDATE SET
        title = EXCLUDED.title,
        department = EXCLUDED.department,
        category = EXCLUDED.category,
        content = EXCLUDED.content,
        tags = EXCLUDED.tags,
        universe = EXCLUDED.universe;
    `, [
      '[IK-XRF-01] Manual Book & Petunjuk Pengoperasian Alat Instrumentasi (WD-XRF Zetium & ED-XRF Epsilon 4)',
      manualDbId,
      'XRF & Instrumentasi',
      'LIBRARY_IK',
      manualMd,
      ['LIBRARY', 'IK', 'XRF & Instrumentasi', 'MANUAL_BOOK', 'ZETIUM']
    ]);
    console.log('  ✓ Berhasil membuat post Library: [IK-XRF-01] Manual Book Instruments');

    // E. SAFETY FLASH & ALERT DATABASE + STANDALONE HIGHLIGHTS
    const sfDbId = '21ed00c5-c809-80b4-88f6-cd96586a1b07';
    const sfItems = [
      {
        id: 'sf-licin-2025',
        title: '[SAFETY ALERT] Insiden Tabrakan Dump Truck Akibat Jalan Licin & Cuaca Ekstrem',
        img: 'WhatsApp Image 2025-06-26 at 13.14.54.jpeg',
        date: '2025-06-26',
        desc: 'Insiden tabrakan unit DT di jalan hauling tambang saat kondisi hujan lebat dan jalan licin berlumpur. Pengemudi kehilangan traksi akibat kecepatan tidak disesuaikan dengan kondisi jalan.',
        mitigation: '1. Selalu jaga jarak aman minimal 50 meter pada kondisi basah/licin.\n2. Kurangi kecepatan maksimal 30 km/jam saat hujan.\n3. Laporkan jalan licin (slippery condition) ke pengawas tambang untuk penaburan material.'
      },
      {
        id: 'sf-blindspot-2025',
        title: '[SAFETY ALERT] DT 400-3 Menabrak DT 082 DCM (Jarak Aman & Blind Spot Pengawasan)',
        img: 'WhatsApp Image 2025-06-24 at 11.49.28.jpeg',
        date: '2025-06-24',
        desc: 'Unit dump truck 400-3 menabrak bagian belakang DT 082 DCM di area antrian disposal akibat jarak antar unit terlalu rapat dan titik buta (blind spot) pengemudi.',
        mitigation: '1. Patuhi aturan jarak aman parkir dan antrian minimal 2 kali panjang kendaraan.\n2. Pastikan visual kontak dan gunakan klakson 1x sebelum maju, 2x sebelum mundur.\n3. Jangan bermanuver di area blind spot operator lain.'
      },
      {
        id: 'sf-kacamuka-2025',
        title: '[SAFETY FLASH] DT 066 (MSP) Menabrak DT 1320-3 (TBP) & Kerusakan Kabin Pengemudi',
        img: 'WhatsApp Image 2025-06-24 at 16.50.19.jpeg',
        date: '2025-06-24',
        desc: 'Tabrakan samping di persimpangan jalan hauling akibat tidak mematuhi prioritas hak jalan dan rambu lalu lintas simpang tiga.',
        mitigation: '1. Patuhi Golden Rule #2: Patuhi Peraturan Rambu-rambu Lalu Lintas.\n2. Kendaraan bermuatan penuh memiliki prioritas jalan dibandingkan kendaraan kosong.\n3. Selalu berhenti sejenak di rambu STOP sebelum memasuki jalan utama.'
      },
      {
        id: 'sf-excavator-2025',
        title: '[SAFETY ALERT] Excavator 267-3 Rebah Saat Manuver di Area Berlumpur Curam',
        img: 'WhatsApp Image 2025-06-25 at 08.49.57.jpeg',
        date: '2025-06-25',
        desc: 'Excavator mengalami kehilangan kestabilan dan tergelincir miring di lereng loading point lunak karena tidak dilakukan perataan dan pengetesan landasan kerja.',
        mitigation: '1. Periksa kestabilan lereng dan daya dukung tanah sebelum menempatkan excavator.\n2. Gunakan material keras untuk membuat bantalan track.\n3. Jangan bekerja melampaui sudut kemiringan maksimal alat.'
      },
      {
        id: 'sf-retak-2025',
        title: '[SAFETY FLASH] DT 521-3 Kaca Retak Akibat Terkena Lemparan Batu Material dari Ban Unit Lain',
        img: 'WhatsApp Image 2025-06-25 at 13.16.28.jpeg',
        date: '2025-06-25',
        desc: 'Batu terselip di antara roda ganda belakang terlempar dan mengenai kaca depan kabin unit di belakangnya saat melaju di jalan hauling.',
        mitigation: '1. Lakukan P2H dan bersihkan batu yang terjepit di antara ban ganda sebelum melaju.\n2. Jaga jarak iring aman di belakang kendaraan pengangkut ore.\n3. Pastikan kaca kabin terbuat dari laminated safety glass berstandar.'
      }
    ];

    // Master Safety Flash table post
    let sfMasterMd = `> [!NOTE]\n> **DOKUMEN RESMI PREPLAB PERUSAHAAN**  \n> **Status**: 🔴 Waspada & Evaluasi | **Seksi Pemilik**: HSE & K3LH | **Kategori**: Safety Flash & Alert  \n> **Tujuan**: Edukasi pencegahan insiden berulang (Lesson Learned) di seluruh area operasional\n\n### 🚨 Rekapitulasi Safety Alert & Memo Peringatan Keselamatan Tambang\nDaftar peringatan kilat (Safety Alert) dan memo insiden resmi yang diterbitkan oleh Departemen HSE PT TBP & GPS untuk pembelajaran bersama seluruh personil.\n\n---\n\n`;

    for (const item of sfItems) {
      const imgFile = getCachedFile(item.img);
      sfMasterMd += `#### ⚠️ ${item.title}\n`;
      sfMasterMd += `> **Tanggal Kejadian**: ${item.date} | **Kategori**: Accident / Hazard Report\n\n`;
      if (imgFile.driveId) {
        sfMasterMd += `![${item.title}](${imgFile.directUrl})\n\n`;
      }
      sfMasterMd += `**Uraian Kejadian**:\n${item.desc}\n\n`;
      sfMasterMd += `**Langkah Pengendalian & Mitigasi Wajib**:\n${item.mitigation}\n\n---\n\n`;
    }

    await client.query(`
      INSERT INTO bulletin_posts (title, notion_id, department, category, content, tags, pt, universe)
      VALUES ($1, $2, $3, $4, $5, $6, 'TBP', 'TBP_GPS')
      ON CONFLICT (notion_id) DO UPDATE SET
        title = EXCLUDED.title,
        department = EXCLUDED.department,
        category = EXCLUDED.category,
        content = EXCLUDED.content,
        tags = EXCLUDED.tags,
        universe = EXCLUDED.universe;
    `, [
      '[SAFETY FLASH] Rekapitulasi Safety Alert & Peringatan Keselamatan Tambang',
      sfDbId,
      'HSE & K3LH',
      'LIBRARY_SAFETY_FLASH',
      sfMasterMd,
      ['LIBRARY', 'SAFETY_FLASH', 'HSE & K3LH', 'ALERT', 'INCIDENT']
    ]);
    console.log('  ✓ Berhasil membuat post Library: [SAFETY FLASH] Master Rekapitulasi');

    // Standalone top safety flash posts for high-visibility cards
    for (const sf of sfItems.slice(0, 3)) {
      const imgFile = getCachedFile(sf.img);
      let singleMd = `> [!NOTE]\n> **PERINGATAN KESELAMATAN KILAT (SAFETY ALERT)**  \n> **Status**: 🔴 Alert Berlaku | **Seksi Pemilik**: HSE & K3LH | **Kategori**: Safety Flash\n\n### ${sf.title}\n\n`;
      if (imgFile.driveId) {
        singleMd += `![Dokumentasi Kejadian](${imgFile.directUrl})\n\n`;
      }
      singleMd += `### Kronologi & Uraian Kejadian\n${sf.desc}\n\n---\n\n### Tindakan Pencegahan & Pengendalian K3 Wajib\n${sf.mitigation}\n\n---\n\n> 🛡️ **Pesan K3**: Keselamatan kerja adalah tanggung jawab bersama. Utamakan keselamatan diri dan rekan kerja Anda sebelum memulai pekerjaan.`;

      await client.query(`
        INSERT INTO bulletin_posts (title, notion_id, department, category, content, tags, pt, universe)
        VALUES ($1, $2, $3, $4, $5, $6, 'TBP', 'TBP_GPS')
        ON CONFLICT (notion_id) DO UPDATE SET
          title = EXCLUDED.title,
          department = EXCLUDED.department,
          category = EXCLUDED.category,
          content = EXCLUDED.content,
          tags = EXCLUDED.tags,
          universe = EXCLUDED.universe;
      `, [
        sf.title,
        `notion_sf_${sf.id}`,
        'HSE & K3LH',
        'LIBRARY_SAFETY_FLASH',
        singleMd,
        ['LIBRARY', 'SAFETY_FLASH', 'HSE & K3LH', 'ALERT', 'HIGHLIGHT']
      ]);
      console.log(`  ✓ Berhasil membuat post Standalone Safety Flash: "${sf.title}"`);
    }

    console.log('\n🎉 SELURUH DOKUMEN BERHASIL DIMIGRASIKAN KE KATEGORI LIBRARY LABNOTE DENGAN LENGKAP!');
  } catch (err) {
    console.error('Error in migration:', err);
  } finally {
    client.release();
    pool.end();
  }
}

main().catch(console.error);
