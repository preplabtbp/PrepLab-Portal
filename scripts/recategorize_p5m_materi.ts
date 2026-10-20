import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
});

export function classifyMateri(title: string): { jenis: string; section: string } {
  const t = title.toLowerCase().trim();

  // 1. Jenis Dokumen: Health, Safety, IK, JSA, SOP, Kebijakan, IBPR, IADL, Senam
  let jenis = 'Safety';

  if (/\bsenam\b/i.test(t)) {
    jenis = 'Senam';
  } else if (/\bibpr\b/i.test(t) || t.includes('identifikasi bahaya') || t.includes('penilaian risiko') || t.includes('hiradc')) {
    jenis = 'IBPR';
  } else if (/\biadl\b/i.test(t) || t.includes('aspek dampak lingkungan')) {
    jenis = 'IADL';
  } else if (/\bjsa\b/i.test(t) || t.includes('job safety analysis')) {
    jenis = 'JSA';
  } else if (/\bsop\b/i.test(t) || t.includes('standar operasional') || t.includes('prosedur operasi')) {
    jenis = 'SOP';
  } else if (/\bik\b/i.test(t) || t.includes('instruksi kerja') || t.includes('flow sheet') || t.includes('flowsheet')) {
    jenis = 'IK';
  } else if (t.includes('kebijakan') || t.includes('policy') || t.includes('peraturan perusahaan')) {
    jenis = 'Kebijakan';
  } else if (
    t.includes('ramadhan') || t.includes('puasa') || t.includes('insomnia') ||
    t.includes('diare') || t.includes('osteoporosis') || t.includes('dehidrasi') ||
    t.includes('hiv') || t.includes('gula') || t.includes('batuk') || t.includes('gigi') ||
    t.includes('hipertensi') || t.includes('jantung') || t.includes('makan') ||
    t.includes('dyspepsia') || t.includes('mcu') || t.includes('tembakau') ||
    t.includes('mental') || t.includes('scabies') || t.includes('pancaroba') ||
    t.includes('nipah') || t.includes('faringitis') || t.includes('flu') ||
    t.includes('sengatan panas') || t.includes('sehat') || t.includes('penyakit')
  ) {
    jenis = 'Health';
  } else {
    jenis = 'Safety';
  }

  // 2. Section: Preparation, Laboratory, Maintenance, Inventory Control, Quality Assurance, Administration, General
  let section = 'General';

  if (
    t.includes('inventory') || t.includes('gudang') || t.includes('warehouse') ||
    t.includes('sparepart') || t.includes('spare part') || t.includes('penyimpanan bahan kimia') ||
    /\bic\b/i.test(t)
  ) {
    section = 'Inventory Control';
  } else if (
    t.includes('pengelasan') || t.includes('welding') || t.includes('las') ||
    t.includes('gerinda') || t.includes('cutting plasma') || t.includes('plasma cutting') ||
    t.includes('pengerutan kayu') || t.includes('instalasi listrik') || t.includes('listrik') ||
    t.includes('kelistrikan') || t.includes('panel listrik') || t.includes('wiring') ||
    t.includes('dust collector') || t.includes('ducting') || t.includes('maintenance') ||
    t.includes('perawatan') || t.includes('lubrikasi') || t.includes('genset') ||
    t.includes('kompresor') || t.includes('kompressor') || t.includes('loto') ||
    t.includes('kegagalan rem') || t.includes('alat berat') || t.includes('dashcam') ||
    t.includes('parkir') || t.includes('unit') || t.includes('driving') ||
    t.includes('blind spot') || t.includes('manuver') || t.includes('bengkel') ||
    t.includes('workshop') || t.includes('pompa') || t.includes('bearing') ||
    t.includes('mekanik')
  ) {
    section = 'Maintenance';
  } else if (
    t.includes('laboratorium') || t.includes('lab') || t.includes('fusion') ||
    t.includes('fused bead') || t.includes('xrf') || t.includes('aas') ||
    t.includes('neraca') || t.includes('timbangan digital') || t.includes('titrasi') ||
    t.includes('loi') || t.includes('gravimetri') || t.includes('reagen') ||
    t.includes('asam') || t.includes('press powder') || t.includes('press/timbang') ||
    t.includes('analitik') || t.includes('kalibrasi') || t.includes('crm') ||
    t.includes('standar baku') || t.includes('chiller') || t.includes('radiasi') ||
    t.includes('desikator') || t.includes('muffle furnace') || t.includes('ultrasonic') ||
    t.includes('polishing mould') || t.includes('platinum ware') || t.includes('fume hood') ||
    t.includes('scrubber') || t.includes('ups emmerich') || t.includes('argon') ||
    t.includes('helium') || t.includes('sds buffer') || t.includes('buffer ph') ||
    t.includes('flux') || t.includes('iadl laboratory')
  ) {
    section = 'Laboratory';
  } else if (
    t.includes('preparasi') || t.includes('prep') || t.includes('jaw crusher') ||
    t.includes('pulverizer') || t.includes('cup mill') || t.includes('drying') ||
    t.includes('moisture') || t.includes('quartering') || t.includes('splitting') ||
    t.includes('double roll') || t.includes('remainder') || t.includes('sieve') ||
    t.includes('shaker') || t.includes('mixer') || t.includes('oven kontainer') ||
    t.includes('ayakan') || t.includes('sieving') || t.includes('artco') ||
    t.includes('sampel basah') || t.includes('sample basah') || t.includes('sampel kering') ||
    t.includes('sample kering') || t.includes('screen test') || t.includes('dump truck') ||
    t.includes('iadl preparation')
  ) {
    section = 'Preparation';
  } else if (
    t.includes('quality assurance') || t.includes('qa') || t.includes('qc') ||
    t.includes('audit mutu') || t.includes('verifikasi data')
  ) {
    section = 'Quality Assurance';
  } else if (
    t.includes('administrasi') || t.includes('admin') || t.includes('surat') ||
    t.includes('arsip') || t.includes('dokumen kontrol') || t.includes('cuti')
  ) {
    section = 'Administration';
  }

  return { jenis, section };
}

async function runMigration() {
  console.log('🔄 Starting P5M Materi Re-categorization migration...');
  const res = await pool.query('SELECT id, judul FROM p5m_materi ORDER BY id ASC');
  console.log(`Found ${res.rows.length} materials in database.`);

  let updatedCount = 0;
  for (const row of res.rows) {
    const { jenis, section } = classifyMateri(row.judul);
    await pool.query(
      `UPDATE p5m_materi 
       SET kategori = $1, sub_kategori = $2, divisi = $3 
       WHERE id = $4`,
      [jenis, section, section === 'General' ? 'All' : section, row.id]
    );
    updatedCount++;
  }

  console.log(`✅ Successfully re-categorized ${updatedCount} materials!`);

  // Verify breakdown
  const statsRes = await pool.query(`
    SELECT kategori as jenis_dokumen, sub_kategori as section, COUNT(*) as total 
    FROM p5m_materi 
    GROUP BY kategori, sub_kategori 
    ORDER BY kategori, sub_kategori
  `);
  console.log('📊 Current Re-categorized Breakdown:');
  console.table(statsRes.rows);

  await pool.end();
}

runMigration().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
