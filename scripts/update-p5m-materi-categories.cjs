const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME
});

function classifyTopic(title) {
  const t = title.toLowerCase();

  // Non-Teknis topics (Health, Mental, Ramadhan, Habits, Soft Skills, Admin/HR)
  if (
    t.includes("ramadhan") || t.includes("puasa") || t.includes("insomnia") ||
    t.includes("diare") || t.includes("osteoporosis") || t.includes("dehidrasi") ||
    t.includes("hiv") || t.includes("gula") || t.includes("batuk") || t.includes("gigi") ||
    t.includes("hipertensi") || t.includes("jantung") || t.includes("makan") ||
    t.includes("dyspepsia") || t.includes("mcu") || t.includes("tembakau") ||
    t.includes("mental") || t.includes("scabies") || t.includes("pancaroba") ||
    t.includes("nipah") || t.includes("faringitis") || t.includes("flu") ||
    t.includes("sengatan panas") || t.includes("gadget") || t.includes("bercanda") ||
    t.includes("izin & sakit") || t.includes("cuti") || t.includes("spdk") ||
    t.includes("headset") || t.includes("disiplin kerja") || t.includes("cuci sepatu") ||
    t.includes("alat makan") || t.includes("pelecehan")
  ) {
    return { kategori: "Non-Teknis", subKategori: "General", divisi: "All" };
  }

  // Inventory Control (IC)
  if (
    t.includes("inventory") || t.includes("gudang") || t.includes("warehouse") ||
    t.includes("sparepart") || t.includes("spare part") || t.includes("penyimpanan bahan kimia") ||
    t.includes("iadl penyimpanan") || t.includes("stock") || t.includes("stok") ||
    /\bic\b/.test(t)
  ) {
    return { kategori: "Teknis", subKategori: "IC", divisi: "IC" };
  }

  // Teknis Maintenance
  if (
    t.includes("pengelasan") || t.includes("welding") || t.includes("las") ||
    t.includes("gerinda") || t.includes("cutting plasma") || t.includes("plasma cutting") ||
    t.includes("pengerutan kayu") || t.includes("instalasi listrik") || t.includes("listrik") ||
    t.includes("kelistrikan") || t.includes("panel listrik") || t.includes("wiring") ||
    t.includes("dust collector") || t.includes("ducting") || t.includes("maintenance") ||
    t.includes("perawatan") || t.includes("lubrikasi") || t.includes("genset") ||
    t.includes("kompresor") || t.includes("kompressor") || t.includes("loto") ||
    t.includes("kegagalan rem") || t.includes("alat berat") || t.includes("dashcam") ||
    t.includes("parkir") || t.includes("unit") || t.includes("driving") ||
    t.includes("blind spot") || t.includes("manuver") || t.includes("bengkel") ||
    t.includes("workshop") || t.includes("pompa") || t.includes("bearing") ||
    t.includes("mekanik")
  ) {
    return { kategori: "Teknis", subKategori: "Maintenance", divisi: "Maintenance" };
  }

  // Teknis Laboratory (including QA)
  if (
    t.includes("laboratorium") || t.includes("lab") || t.includes("fusion") ||
    t.includes("fused bead") || t.includes("xrf") || t.includes("aas") ||
    t.includes("neraca") || t.includes("timbangan digital") || t.includes("titrasi") ||
    t.includes("loi") || t.includes("gravimetri") || t.includes("reagen") ||
    t.includes("asam") || t.includes("press powder") || t.includes("press/timbang") ||
    t.includes("analitik") || t.includes("kalibrasi") || t.includes("crm") ||
    t.includes("standar baku") || t.includes("quality") || t.includes("qa") ||
    t.includes("qc") || t.includes("chiller") || t.includes("radiasi") ||
    t.includes("desikator") || t.includes("muffle furnace") || t.includes("ultrasonic") ||
    t.includes("polishing mould") || t.includes("platinum ware") || t.includes("fume hood") ||
    t.includes("scrubber") || t.includes("ups emmerich") || t.includes("argon") ||
    t.includes("helium") || t.includes("sds buffer") || t.includes("buffer ph") ||
    t.includes("flux") || t.includes("iadl laboratory")
  ) {
    return { kategori: "Teknis", subKategori: "Laboratory", divisi: "Laboratory" };
  }

  // Teknis Preparation
  if (
    t.includes("preparasi") || t.includes("prep") || t.includes("jaw crusher") ||
    t.includes("pulverizer") || t.includes("cup mill") || t.includes("drying") ||
    t.includes("moisture") || t.includes("quartering") || t.includes("splitting") ||
    t.includes("double roll") || t.includes("remainder") || t.includes("sieve") ||
    t.includes("shaker") || t.includes("mixer") || t.includes("oven kontainer") ||
    t.includes("ayakan") || t.includes("sieving") || t.includes("artco") ||
    t.includes("kering") || t.includes("basah") || t.includes("sampel") ||
    t.includes("sample") || t.includes("screen test")
  ) {
    return { kategori: "Teknis", subKategori: "Preparation", divisi: "Preparation" };
  }

  // Teknis General (K3 Umum, APD, APAR, Golden Rules, Bahaya, Emergency)
  return { kategori: "Teknis", subKategori: "General", divisi: "All" };
}

async function updateDbBatch() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT id, judul FROM p5m_materi;');
    const updates = res.rows.map(r => {
      const c = classifyTopic(r.judul);
      return `(${r.id}, '${c.kategori.replace(/'/g, "''")}', '${c.subKategori.replace(/'/g, "''")}', '${c.divisi.replace(/'/g, "''")}')`;
    });

    const sqlQuery = `
      UPDATE p5m_materi AS m
      SET kategori = v.kategori,
          sub_kategori = v.sub_kategori,
          divisi = v.divisi
      FROM (VALUES ${updates.join(',\n')}) AS v(id, kategori, sub_kategori, divisi)
      WHERE m.id = v.id;
    `;

    await client.query(sqlQuery);
    console.log(`✓ Batch updated ${res.rows.length} rows successfully.`);

    const check = await client.query('SELECT kategori, sub_kategori, divisi, count(*) FROM p5m_materi GROUP BY kategori, sub_kategori, divisi ORDER BY count(*) DESC;');
    console.log(check.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

updateDbBatch().catch(console.error);
