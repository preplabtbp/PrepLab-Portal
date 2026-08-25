import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrateDb() {
  console.log('Running DB migration for community quotes & theme likes...');
  
  // 1. Add likes_count and liked_by to user_themes if not exists
  await pool.query(`
    ALTER TABLE user_themes 
    ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS liked_by TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS liked_by_users TEXT DEFAULT '[]';
  `);
  console.log('✅ user_themes updated with likes columns');

  // 2. Create community_quotes table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS community_quotes (
      id SERIAL PRIMARY KEY,
      quote TEXT NOT NULL,
      author_nik TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_role TEXT,
      author_section TEXT,
      category TEXT DEFAULT 'Motivasi & Skena',
      likes_count INTEGER DEFAULT 0,
      liked_by TEXT[] DEFAULT '{}',
      liked_by_users TEXT DEFAULT '[]',
      is_approved BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('✅ community_quotes table ready');

  // 3. Seed starter quotes from SKENA_QUOTES if table is empty
  const countRes = await pool.query('SELECT COUNT(*) FROM community_quotes');
  const count = parseInt(countRes.rows[0].count, 10);
  console.log(`Current community_quotes count: ${count}`);

  if (count === 0) {
    const starterQuotes = [
      { quote: "Kopi pagi udah masuk, playlist indie udah jalan. Waktunya gas shift hari ini tanpa overthinking.", authorName: "Tim Preparasi", authorRole: "Preparasi Crew" },
      { quote: "Kerja rapi, APD komplit, vibes tetap estetik. Safety bukan beban, tapi lifestyle.", authorName: "Tim Safety K3", authorRole: "Safety Officer" },
      { quote: "Hidup itu kayak titrasi: butuh ketelitian, kesabaran, dan jangan sampai kelewatan titik ekuivalen.", authorName: "Analis Laboratorium", authorRole: "Chemist Lab" },
      { quote: "Prep sample setulus hati, rezeki dan masa depan cerah insyaAllah pasti mengikuti.", authorName: "Operator Crusher", authorRole: "Prep Operator" },
      { quote: "Jangan biarkan mood swing mengalahkan precision grinding. Fokus satu-satu, kelar semua.", authorName: "Foreman Preparasi", authorRole: "Foreman Shift" },
      { quote: "Outfit lapangan boleh berdebu, tapi masa depan dan rezeki harus tetap glowing.", authorName: "Staff Administrasi", authorRole: "Admin PrepLab" },
      { quote: "Lebih baik lelah karena berjuang di lapangan daripada lelah karena overthinking masa depan.", authorName: "Supervisor Lab", authorRole: "Lab Supervisor" },
      { quote: "Shift pagi ceria, shift malam tenang. Apapun giliranmu hari ini, nikmati prosesnya.", authorName: "Crew Malam", authorRole: "Shift Night Crew" },
      { quote: "Komunikasi dua arah di tim itu kunci, biar gak ada silent treatment di area operasional.", authorName: "Foreman Lab", authorRole: "Foreman Analis" },
      { quote: "Ingat tujuan awal pas merantau ke sini. Setiap gram sample yang diprep adalah langkah menuju impianmu.", authorName: "Tim Perantau PrepLab", authorRole: "Prep Operator" },
      { quote: "Tetap chill walau load sampel lagi rame. Tarik napas, minum air putih, lalu taklukkan!", authorName: "Quality Assurance", authorRole: "QA Specialist" },
      { quote: "Kerapian area kerja mencerminkan ketenangan pikiran. 5R jalan, hati pun lapang.", authorName: "Staff 5R", authorRole: "Maintenance Team" },
      { quote: "Tiap hari adalah lembaran baru. Kesalahan kemarin adalah modul pembelajaran hari ini.", authorName: "Superintendent", authorRole: "Superintendent Prep & Lab" },
      { quote: "Gak perlu validasi semua orang, yang penting kerjaanmu tuntas, presisi, dan selamat sampai rumah.", authorName: "Analis Instrument", authorRole: "XRF Analyst" },
      { quote: "Safety helm terpasang, earplug rapat, masker siap. Siap guncang dunia lab hari ini!", authorName: "Safety Champion", authorRole: "Safety Officer" },
      { quote: "Kualitas hasil analisa bukan sekadar angka di kertas, tapi dedikasi dan integritas kita bersama.", authorName: "QA Specialist", authorRole: "QA Officer" },
      { quote: "Di balik data recovery yang akurat, ada kerja keras personil hebat yang gak kenal menyerah.", authorName: "Lab Manager", authorRole: "Manager Prep & Lab" },
      { quote: "Jangan lupa senyum ke rekan satu shift. Senyumanmu bisa jadi booster semangat mereka.", authorName: "Staff Administrasi", authorRole: "Admin Support" },
      { quote: "Slow living boleh, tapi kalau urusan SOP dan keselamatan tetap harus agile dan responsif.", authorName: "Safety Officer", authorRole: "K3 Prep & Lab" },
      { quote: "Pekerjaan hari ini mungkin berat, tapi kopi sore dan istirahat malam nanti bakal terasa nikmat.", authorName: "Foreman Shift A", authorRole: "Foreman Prep" },
      { quote: "Hidup ini dinamis seperti shaker sample, nikmati ritmenya dan tetap jaga keseimbangan.", authorName: "Operator Shaker", authorRole: "Preparasi Crew" },
      { quote: "Hasil maksimal lahir dari rutinitas yang konsisten. Terus melangkah, kamu sudah di jalur yang benar.", authorName: "Superintendent", authorRole: "Superintendent" },
      { quote: "Jangan bandingkan progresmu dengan orang lain. Kecepatan tiap orang beda, yang penting terus maju.", authorName: "Analis Kimia Basah", authorRole: "Wet Chemist" },
      { quote: "Semangat menjemput rezeki berkah hari ini. Keluarga di rumah menanti senyum kepulanganmu.", authorName: "Tim PrepLab", authorRole: "Personil All" },
      { quote: "Akurasi tinggi dimulai dari fokus yang terjaga. Singkirkan distraksi, hadapi tantangan!", authorName: "Analis AAS", authorRole: "Instrument Analyst" },
      { quote: "Jadikan setiap tantangan operasional sebagai panggung untuk membuktikan keahlian terbaikmu.", authorName: "Teknisi Maintenance", authorRole: "Maintenance PrepLab" },
      { quote: "Alat boleh canggih, tapi ketelitian manusia yang memegang kendali mutu sesungguhnya.", authorName: "QA Specialist", authorRole: "QA Leader" },
      { quote: "Awali shift dengan bismillah dan niat baik, akhiri dengan rasa syukur dan kebanggaan.", authorName: "Pimpinan Shift", authorRole: "Shift Leader" },
      { quote: "Kerja kompak, komunikasi lancar, target harian tercapai tanpa drama.", authorName: "Crew Shift B", authorRole: "Operator Crew" },
      { quote: "Waktu istirahat gunakan sebaik mungkin. Jaga kesehatan fisik dan mental untuk perjalanan panjang.", authorName: "Dokter / Medic On-Site", authorRole: "Occupational Health" }
    ];

    for (const q of starterQuotes) {
      await pool.query(
        `INSERT INTO community_quotes (quote, author_nik, author_name, author_role, author_section, category)
         VALUES ($1, '00000000000', $2, $3, 'Prep & Lab', 'Motivasi & Skena')`,
        [q.quote, q.authorName, q.authorRole]
      );
    }
    console.log(`✅ Seeded ${starterQuotes.length} starter quotes into community_quotes`);
  }

  await pool.end();
}

await migrateDb();
