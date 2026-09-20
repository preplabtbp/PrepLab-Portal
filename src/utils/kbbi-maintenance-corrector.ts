/**
 * KBBI & Industrial Maintenance Text Corrector & Standardizer
 * Khusus dirancang untuk portal PrepLab agar pengawas di lapangan yang awam/gaptek
 * dapat dengan mudah menghasilkan laporan kerusakan yang baku, jelas, dan mudah dipahami tim Maintenance.
 */

export interface WordCorrection {
  word: string;
  suggestion: string;
  explanation: string;
}

// Kamus Typo & Bahasa Gaul / Singkatan ke Bahasa Baku KBBI & Istilah Maintenance Resmi
export const KBBI_MAINTENANCE_DICTIONARY: Record<string, { standard: string; explanation?: string }> = {
  // --- Kerusakan Fisik & Mekanikal ---
  'fatah': { standard: 'patah', explanation: 'KBBI: patah (bukan fatah)' },
  'pata': { standard: 'patah', explanation: 'KBBI: patah' },
  'path': { standard: 'patah', explanation: 'KBBI: patah' },
  'rusat': { standard: 'rusak', explanation: 'KBBI: rusak' },
  'rosak': { standard: 'rusak', explanation: 'KBBI: rusak' },
  'ancur': { standard: 'hancur', explanation: 'KBBI: hancur' },
  'ancoor': { standard: 'hancur', explanation: 'KBBI: hancur' },
  'sompel': { standard: 'gumpil', explanation: 'Istilah baku: gumpil / rompal pada tepi' },
  'somplak': { standard: 'gumpil', explanation: 'Istilah baku: gumpil / rompal pada tepi' },
  'rompal': { standard: 'gumpil', explanation: 'Istilah baku: gumpil / retak serpih' },
  'kendor': { standard: 'kendur', explanation: 'KBBI: kendur (tidak tegang/kencang)' },
  'kendorr': { standard: 'kendur', explanation: 'KBBI: kendur' },
  'koplak': { standard: 'oblak', explanation: 'Istilah mekanik: oblak / longgar' },
  'oblak': { standard: 'oblak (longgar)', explanation: 'Toleransi bantalan longgar/goyang' },
  'goyang': { standard: 'goyang / tidak stabil', explanation: 'Stabilitas berkurang' },
  'haus': { standard: 'aus', explanation: 'KBBI: aus (terkikis karena gesekan)' },
  'aus': { standard: 'aus', explanation: 'KBBI: aus (aus terkikis)' },
  'bengkok': { standard: 'bengkok (deformasi)', explanation: 'Deformasi mekanis' },
  'melengkung': { standard: 'bengkok (deformasi)', explanation: 'Bentuk fisik melengkung' },
  'bocor': { standard: 'bocor', explanation: 'Kebocoran fluida/air' },
  'bocorr': { standard: 'bocor', explanation: 'Kebocoran' },
  'rembes': { standard: 'rembesan', explanation: 'Ada tetesan / rembesan fluida' },
  'mbrebes': { standard: 'rembesan', explanation: 'Rembesan cairan' },
  'berisik': { standard: 'suara bising / kasar', explanation: 'Suara kerja mesin tidak normal' },
  'glodak': { standard: 'suara bising / benturan', explanation: 'Suara benturan mekanikal' },
  'macet': { standard: 'macet / tersangkut', explanation: 'Komponen tidak dapat berputar / bergerak' },
  'nyangkut': { standard: 'tersangkut', explanation: 'Material/benda asing tersangkut' },
  'seret': { standard: 'seret / putaran berat', explanation: 'Hambatan friksi tinggi' },
  'pecah': { standard: 'pecah', explanation: 'Kondisi fisik pecah' },
  'retak': { standard: 'retak', explanation: 'Kondisi fisik retak' },
  'baut dol': { standard: 'ulir baut aus (dol)', explanation: 'Ulir baut aus / tidak mengikat' },
  'baut slek': { standard: 'ulir baut aus (dol)', explanation: 'Ulir baut aus' },
  'dol': { standard: 'aus (dol)', explanation: 'Ulir baut/mur aus atau dol' },
  'slek': { standard: 'aus (dol)', explanation: 'Ulir baut/mur aus' },
  'selek': { standard: 'aus (dol)', explanation: 'Ulir baut/mur aus' },
  'copot': { standard: 'terlepas', explanation: 'Komponen terlepas' },
  'lepas': { standard: 'terlepas', explanation: 'Komponen terlepas' },
  'tumpah': { standard: 'tumpah', explanation: 'Tumpahan material / cairan' },
  'karatan': { standard: 'berkarat (korosi)', explanation: 'Terjadi korosi logam' },

  // --- Kelistrikan & Elektronik ---
  'matot': { standard: 'mati total (tidak menyala)', explanation: 'Unit tidak menerima daya sama sekali' },
  'matii': { standard: 'mati (tidak ada daya)', explanation: 'Mati total' },
  'konslet': { standard: 'korsleting listrik', explanation: 'KBBI: korsleting (hubungan arus pendek)' },
  'korslet': { standard: 'korsleting listrik', explanation: 'KBBI: korsleting' },
  'konselet': { standard: 'korsleting listrik', explanation: 'KBBI: korsleting' },
  'bau gosong': { standard: 'bau hangus terbakar', explanation: 'Indikasi panas berlebih pada kabel/lilitan' },
  'bau sangit': { standard: 'bau hangus terbakar', explanation: 'Indikasi komponen elektrik terbakar' },
  'kebakar': { standard: 'terbakar', explanation: 'Komponen terbakar' },
  'panas bgt': { standard: 'panas berlebih (overheating)', explanation: 'Suhu kerja melebihi batas wajar' },
  'overheat': { standard: 'panas berlebih (overheating)', explanation: 'Suhu operasional terlalu panas' },
  'operhit': { standard: 'panas berlebih (overheating)', explanation: 'Overheating' },
  'anget bgt': { standard: 'suhu di atas normal', explanation: 'Suhu berlebih' },
  'kabel koyak': { standard: 'kabel terkelupas', explanation: 'Lapisan isolasi kabel rusak' },
  'kabel kelupas': { standard: 'kabel terkelupas', explanation: 'Isolasi kabel terkelupas membahayakan' },
  'kabel kegigit': { standard: 'kabel terkelupas / rusak', explanation: 'Kabel rusak fisik' },
  'sikring': { standard: 'sekring (fuse)', explanation: 'KBBI: sekring' },
  'sekring': { standard: 'sekring (fuse)', explanation: 'Komponen pengaman arus listrik' },
  'saklar': { standard: 'sakelar', explanation: 'KBBI: sakelar (switch pemutus/penghubung daya)' },
  'batre': { standard: 'baterai', explanation: 'KBBI: baterai' },
  'batere': { standard: 'baterai', explanation: 'KBBI: baterai' },
  'batrei': { standard: 'baterai', explanation: 'KBBI: baterai' },
  'cas': { standard: 'isi daya (charge)', explanation: 'Pengisian baterai' },
  'ngecas': { standard: 'mengisi daya', explanation: 'Charging' },

  // --- Nama Alat, Sparepart & Komponen Industri / PrepLab ---
  'skop': { standard: 'sekop', explanation: 'KBBI: sekop (bukan skop)' },
  'zis': { standard: 'JIS', explanation: 'Standar Industri Jepang (Japanese Industrial Standards)' },
  'zis 30': { standard: 'JIS 30D', explanation: 'Sekop JIS ukuran 30D' },
  'zis 30d': { standard: 'JIS 30D', explanation: 'Sekop JIS 30D' },
  'dinamu': { standard: 'motor dinamo', explanation: 'KBBI: dinamo / motor penggerak' },
  'denamo': { standard: 'motor dinamo', explanation: 'Motor dinamo' },
  'laher': { standard: 'bantalan (bearing)', explanation: 'KBBI: bantalan poros (bearing)' },
  'klahar': { standard: 'bantalan (bearing)', explanation: 'Bantalan roda/poros (bearing)' },
  'klaher': { standard: 'bantalan (bearing)', explanation: 'Bearing' },
  'bearing': { standard: 'bearing (bantalan)', explanation: 'Bantalan poros putar' },
  'vanbelt': { standard: 'v-belt (tali kipas)', explanation: 'Sabuk pemindah tenaga (v-belt)' },
  'van belt': { standard: 'v-belt (tali kipas)', explanation: 'V-Belt' },
  'fanbelt': { standard: 'v-belt (tali kipas)', explanation: 'V-Belt' },
  'kompreser': { standard: 'kompresor', explanation: 'KBBI: kompresor udara' },
  'kompresur': { standard: 'kompresor', explanation: 'KBBI: kompresor' },
  'slang': { standard: 'selang', explanation: 'KBBI: selang' },
  'stempet': { standard: 'pelumas gemuk (grease)', explanation: 'Grease pelumas' },
  'gemuk': { standard: 'pelumas gemuk (grease)', explanation: 'Grease' },
  'oli': { standard: 'pelumas (oli)', explanation: 'Oli pelumas mesin' },
  'pulve': { standard: 'pulverizer', explanation: 'Mesin penghalus sampel (pulverizer)' },
  'pulveizer': { standard: 'pulverizer', explanation: 'Pulverizer' },
  'pulveraiser': { standard: 'pulverizer', explanation: 'Pulverizer' },
  'kraser': { standard: 'jaw crusher', explanation: 'Mesin peremuk sampel (jaw crusher)' },
  'krusher': { standard: 'jaw crusher', explanation: 'Jaw crusher' },
  'crasher': { standard: 'jaw crusher', explanation: 'Jaw crusher' },
  'arco': { standard: 'gerobak dorong (arco)', explanation: 'Gerobak dorong sampel' },
  'arko': { standard: 'gerobak dorong (arco)', explanation: 'Gerobak dorong sampel' },
  'artco': { standard: 'gerobak dorong (arco)', explanation: 'Gerobak dorong arco' },
  'martil': { standard: 'palu / martil', explanation: 'Alat pemukul' },
  'pacul': { standard: 'cangkul', explanation: 'KBBI: cangkul' },
  'dast kolektor': { standard: 'dust collector', explanation: 'Penghisap debu (dust collector)' },
  'bloer': { standard: 'blower', explanation: 'Blower hisap/tiup' },
  'timbangn': { standard: 'timbangan', explanation: 'KBBI: timbangan' },
  'timbaangan': { standard: 'timbangan', explanation: 'Timbangan' },
  'ayakan': { standard: 'ayakan mesh', explanation: 'Saringan sampel (sieve mesh)' },

  // --- Kata Sambung / Singkatan Percakapan ---
  'ga': { standard: 'tidak', explanation: 'Baku: tidak' },
  'gak': { standard: 'tidak', explanation: 'Baku: tidak' },
  'ngga': { standard: 'tidak', explanation: 'Baku: tidak' },
  'ndak': { standard: 'tidak', explanation: 'Baku: tidak' },
  'tdk': { standard: 'tidak', explanation: 'Baku: tidak' },
  'bgt': { standard: 'sangat', explanation: 'Baku: sangat' },
  'banget': { standard: 'sangat', explanation: 'Baku: sangat' },
  'trus': { standard: 'lalu', explanation: 'Baku: kemudian / lalu' },
  'trs': { standard: 'lalu', explanation: 'Baku: kemudian' },
  'sdh': { standard: 'sudah', explanation: 'Baku: sudah' },
  'suda': { standard: 'sudah', explanation: 'Baku: sudah' },
  'blm': { standard: 'belum', explanation: 'Baku: belum' },
  'dgn': { standard: 'dengan', explanation: 'Baku: dengan' },
  'utk': { standard: 'untuk', explanation: 'Baku: untuk' },
  'untk': { standard: 'untuk', explanation: 'Baku: untuk' },
  'krn': { standard: 'karena', explanation: 'Baku: karena' },
  'karna': { standard: 'karena', explanation: 'Baku: karena' },
  'yg': { standard: 'yang', explanation: 'Baku: yang' },
  'pd': { standard: 'pada', explanation: 'Baku: pada' },
  'dr': { standard: 'dari', explanation: 'Baku: dari' },
  'bs': { standard: 'dapat', explanation: 'Baku: dapat' },
  'bisa': { standard: 'dapat', explanation: 'Baku: dapat' },
  'tlg': { standard: 'mohon', explanation: 'Baku: mohon' },
  'tlng': { standard: 'mohon', explanation: 'Baku: mohon' },
  'cpt': { standard: 'segera', explanation: 'Baku: segera' },
  'cepet': { standard: 'segera', explanation: 'Baku: segera' },
  'cepetan': { standard: 'segera', explanation: 'Baku: segera' }
};

// Frasa multi-kata yang sering disingkat / salah ketik
export const MULTI_WORD_REPLACEMENTS: [RegExp, string][] = [
  [/\bskop\s+zis\s*30\s*d\b/gi, 'Sekop JIS 30D'],
  [/\bskop\s+zis\b/gi, 'Sekop JIS'],
  [/\bsekop\s+zis\b/gi, 'Sekop JIS'],
  [/\bsekop\s+jis\s*30\s*d\b/gi, 'Sekop JIS 30D'],
  [/\b(ga|gak|ngga|tdk)\s+(bisa|bs)\s+(nyala|idup|hidup)\b/gi, 'tidak dapat menyala'],
  [/\b(ga|gak|ngga|tdk)\s+(bisa|bs)\s+(muter|puter)\b/gi, 'tidak dapat berputar'],
  [/\b(ga|gak|ngga|tdk)\s+(bisa|bs)\s+(jalan|fungsi)\b/gi, 'tidak dapat berfungsi normal'],
  [/\b(ga|gak|ngga|tdk)\s+nyala\b/gi, 'tidak menyala'],
  [/\b(ga|gak|ngga|tdk)\s+muter\b/gi, 'tidak berputar'],
  [/\bmati\s+total\b/gi, 'mati total (tidak ada daya)'],
  [/\bbau\s+gosong\b/gi, 'tercium bau hangus terbakar'],
  [/\bbau\s+sangit\b/gi, 'tercium bau hangus terbakar'],
  [/\bpanas\s+(banget|bgt|parah)\b/gi, 'suhu panas berlebih (overheating)'],
  [/\bbunyi\s+(kasar|berisik|glodak)\b/gi, 'suara bising dan getaran kasar'],
  [/\bbaut\s+(dol|selek|slek)\b/gi, 'ulir baut aus / dol'],
  [/\bbaut\s+(lepas|copot|ilang)\b/gi, 'baut pengunci terlepas / hilang'],
  [/\bkabel\s+(koyak|kelupas|kegigit)\b/gi, 'isolasi kabel terkelupas'],
  [/\btali\s+(putus|lepas)\b/gi, 'tali / v-belt terputus'],
  [/\bmohon\s+di\s*bantu\s+cek\b/gi, 'mohon dilakukan pemeriksaan dan penanganan oleh tim maintenance'],
  [/\btolong\s+di\s*bantu\s+cek\b/gi, 'mohon dilakukan pemeriksaan teknis'],
  [/\bsegera\s+di\s*bantu\b/gi, 'mohon penanganan prioritas']
];

/**
 * Mendeteksi kata-kata tidak baku atau typo dalam teks
 */
export function detectTypos(text: string): WordCorrection[] {
  if (!text || !text.trim()) return [];

  const found: WordCorrection[] = [];
  const words = text.split(/[\s,.;:!?()]+/).filter(Boolean);

  for (const w of words) {
    const clean = w.toLowerCase().trim();
    if (KBBI_MAINTENANCE_DICTIONARY[clean]) {
      const entry = KBBI_MAINTENANCE_DICTIONARY[clean];
      if (!found.some(f => f.word.toLowerCase() === clean)) {
        found.push({
          word: w,
          suggestion: entry.standard,
          explanation: entry.explanation || `Standar KBBI: ${entry.standard}`
        });
      }
    }
  }

  return found;
}

/**
 * Melakukan auto-correct otomatis seluruh kalimat ke Bahasa Baku KBBI & Istilah Maintenance Resmi
 */
export function correctTextKBBI(text: string): {
  correctedText: string;
  changesCount: number;
  replacedWords: string[];
} {
  if (!text || !text.trim()) {
    return { correctedText: '', changesCount: 0, replacedWords: [] };
  }

  let result = text;
  let count = 0;
  const replaced: string[] = [];

  // 1. Ganti frasa multi-kata terlebih dahulu
  for (const [pattern, replacement] of MULTI_WORD_REPLACEMENTS) {
    if (pattern.test(result)) {
      result = result.replace(pattern, replacement);
      count++;
    }
  }

  // 2. Ganti kata tunggal sesuai kamus
  const words = result.split(/(\s+|[.,;!?()]+)/);
  const newWords = words.map(w => {
    const clean = w.toLowerCase().trim();
    if (clean && KBBI_MAINTENANCE_DICTIONARY[clean]) {
      count++;
      replaced.push(w);
      // Cocokkan kapitalisasi jika kata asli berhuruf kapital di awal
      const target = KBBI_MAINTENANCE_DICTIONARY[clean].standard;
      if (w[0] === w[0]?.toUpperCase() && w[1] !== w[1]?.toUpperCase()) {
        return target.charAt(0).toUpperCase() + target.slice(1);
      }
      return target;
    }
    return w;
  });

  result = newWords.join('');

  // 3. Bersihkan spasi ganda dan rapikan tanda baca
  result = result
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/([.,;:!?])(?=[^\s.,;:!?0-9])/g, '$1 ')
    .trim();

  // 4. Huruf besar di awal kalimat
  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }

  return {
    correctedText: result,
    changesCount: count,
    replacedWords: Array.from(new Set(replaced))
  };
}

/**
 * Daftar Template Cepat Deskripsi Kerusakan Standar
 * Memudahkan pengawas di lapangan agar langsung memilih tanpa bingung mengetik
 */
export const COMMON_DAMAGE_TEMPLATES = [
  {
    category: 'Mekanis / Fisik',
    icon: 'Hammer',
    color: 'emerald',
    items: [
      {
        label: 'Gagang Patah / Rusak',
        snippet: 'Gagang patah dan terlepas dari bilah, memerlukan penggantian atau pengelasan kembali.'
      },
      {
        label: 'Baut Kendur / Terlepas',
        snippet: 'Baut pengunci kendur dan sebagian terlepas akibat getaran, perlu pengencangan dan baut baru.'
      },
      {
        label: 'Suara Bising / Kasar',
        snippet: 'Terdengar suara bising dan getaran kasar tidak normal saat mesin beroperasi, terindikasi bearing aus.'
      },
      {
        label: 'Macet / Tersangkut',
        snippet: 'Mekanisme putaran macet dan tersangkut material, putaran poros tidak dapat berputar normal.'
      },
      {
        label: 'Pisau / Bilah Tumpul / Aus',
        snippet: 'Bagian bilah / pisau aus dan terkikis, performa pemotongan / peremukan sampel menurun drastis.'
      }
    ]
  },
  {
    category: 'Kelistrikan & Motor',
    icon: 'Cpu',
    color: 'blue',
    items: [
      {
        label: 'Mati Total (No Power)',
        snippet: 'Unit mati total dan lampu indikator tidak menyala sama sekali saat sakelar daya dihidupkan.'
      },
      {
        label: 'Korsleting / Bau Hangus',
        snippet: 'Terjadi indikasi korsleting listrik disertai bau hangus terbakar pada motor dinamo / panel.'
      },
      {
        label: 'Kabel Terkelupas / Putus',
        snippet: 'Kabel daya utama terkelupas pada bagian pembungkus luar, membahayakan keselamatan kerja.'
      },
      {
        label: 'Motor Panas Berlebih (Overheat)',
        snippet: 'Motor dinamo cepat mengalami panas berlebih (overheating) dan otomatis trip setelah menyala beberapa menit.'
      }
    ]
  },
  {
    category: 'Kebocoran & Utilitas',
    icon: 'AlertTriangle',
    color: 'amber',
    items: [
      {
        label: 'Kebocoran Oli / Pelumas',
        snippet: 'Terdapat rembesan dan tetesan oli pelumas pada seal rumah bearing / gearbox.'
      },
      {
        label: 'Selang Udara / Angin Bocor',
        snippet: 'Selang kompresor mengalami kebocoran udara bertekanan pada sambungan nepel.'
      },
      {
        label: 'Pipa / Keran Air Bocor',
        snippet: 'Keran air wastafel tidak dapat tertutup rapat dan terjadi rembesan pada instalasi pipa.'
      }
    ]
  }
];
