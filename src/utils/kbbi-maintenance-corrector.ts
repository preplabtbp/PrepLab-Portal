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
  'ruask': { standard: 'rusak', explanation: 'KBBI: rusak' },
  'ruska': { standard: 'rusak', explanation: 'KBBI: rusak' },
  'rusakk': { standard: 'rusak', explanation: 'KBBI: rusak' },
  'rusat': { standard: 'rusak', explanation: 'KBBI: rusak' },
  'rosak': { standard: 'rusak', explanation: 'KBBI: rusak' },
  'rsak': { standard: 'rusak', explanation: 'KBBI: rusak' },
  'rusk': { standard: 'rusak', explanation: 'KBBI: rusak' },
  'rsk': { standard: 'rusak', explanation: 'KBBI: rusak' },
  'fatah': { standard: 'patah', explanation: 'KBBI: patah (bukan fatah)' },
  'pata': { standard: 'patah', explanation: 'KBBI: patah' },
  'path': { standard: 'patah', explanation: 'KBBI: patah' },
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
  'bautnya': { standard: 'baut pengunci', explanation: 'Baut pengikat / pengunci' },
  'dol': { standard: 'aus (dol)', explanation: 'Ulir baut/mur aus atau dol' },
  'slek': { standard: 'aus (dol)', explanation: 'Ulir baut/mur aus' },
  'selek': { standard: 'aus (dol)', explanation: 'Ulir baut/mur aus' },
  'copot': { standard: 'terlepas', explanation: 'Komponen terlepas' },
  'lepas': { standard: 'terlepas', explanation: 'Komponen terlepas' },
  'tumpah': { standard: 'tumpah', explanation: 'Tumpahan material / cairan' },
  'karatan': { standard: 'berkarat (korosi)', explanation: 'Terjadi korosi logam' },
  'bolong': { standard: 'berlubang', explanation: 'Kondisi fisik berlubang / sobek' },
  'agin': { standard: 'angin', explanation: 'KBBI: angin (suplai udara kompresor)' },
  'sura': { standard: 'suara', explanation: 'KBBI: suara (bunyi mesin)' },
  'pasa': { standard: 'pada', explanation: 'Kata hubung: pada' },
  'prnggantian': { standard: 'penggantian', explanation: 'KBBI: penggantian komponen' },
  'pergantian': { standard: 'penggantian', explanation: 'KBBI: penggantian (proses mengganti unit/komponen)' },
  'prngelasan': { standard: 'pengelasan', explanation: 'KBBI: pengelasan (proses las)' },
  'prmasangan': { standard: 'pemasangan', explanation: 'KBBI: pemasangan' },
  'grinda': { standard: 'gerinda', explanation: 'KBBI: gerinda (bukan grinda)' },
  'kran': { standard: 'keran air', explanation: 'KBBI: keran (bukan kran)' },
  'pelapon': { standard: 'plafon', explanation: 'KBBI: plafon (langit-langit ruangan)' },
  'expaired': { standard: 'kedaluwarsa', explanation: 'KBBI: kedaluwarsa (expired)' },
  'kadarluarsa': { standard: 'kedaluwarsa', explanation: 'KBBI: kedaluwarsa (bukan kadaluarsa)' },
  'kadaluarsa': { standard: 'kedaluwarsa', explanation: 'KBBI: kedaluwarsa' },
  'swinger': { standard: 'swing kisi AC', explanation: 'Pengarah hembusan kisi AC' },
  'altag': { standard: 'tagging label sampel', explanation: 'Label identitas sampel nikel' },
  'tropol': { standard: 'troli sampel (trolley)', explanation: 'Gerobak dorong sampel bertingkat' },
  'troly': { standard: 'troli (trolley)', explanation: 'Troli angkut' },
  'zet': { standard: 'set', explanation: 'Satu set / kelengkapan komponen' },
  'zetium': { standard: 'Zetium XRF', explanation: 'Spektrometer XRF Malvern Panalytical' },
  'jawcrawser': { standard: 'jaw crusher', explanation: 'Mesin peremuk sampel (jaw crusher)' },
  'vbelt': { standard: 'v-belt (tali kipas)', explanation: 'Sabuk pemindah tenaga (v-belt)' },
  'wiremesh': { standard: 'kawat ayakan (wiremesh)', explanation: 'Anyaman kawat saringan mesh' },
  'houskeeping': { standard: 'housekeeping (kebersihan)', explanation: 'Kegiatan pembersihan dan kerapian area kerja' },
  'termokopel': { standard: 'termokopel (sensor suhu)', explanation: 'Sensor pengukur suhu furnace/oven' },
  'thermo couple': { standard: 'termokopel (sensor suhu)', explanation: 'Sensor suhu thermocouple' },
  'fumehood': { standard: 'fume hood (lemari asam)', explanation: 'Lemari penghisap uap kimia asam' },
  'desikator': { standard: 'desikator kabinet', explanation: 'Lemari kedap pengering kelembapan sampel' },

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

  // --- Istilah Pertambangan Nikel, Transportasi & Alat Berat ---
  'manhaul': { standard: 'manhaul (bus operasional tambang)', explanation: 'Bus angkutan personel tambang' },
  'man haul': { standard: 'manhaul (bus operasional tambang)', explanation: 'Bus angkutan personel tambang' },
  'menhol': { standard: 'manhaul', explanation: 'Bus angkutan personel tambang (manhaul)' },
  'manhol': { standard: 'manhaul', explanation: 'Bus angkutan personel tambang (manhaul)' },
  'menhaul': { standard: 'manhaul', explanation: 'Bus angkutan personel tambang (manhaul)' },
  'lv': { standard: 'LV (Light Vehicle)', explanation: 'Kendaraan operasional ringan lapangan' },
  'elvi': { standard: 'LV (Light Vehicle)', explanation: 'Light Vehicle (mobil operasional)' },
  'dt': { standard: 'Dump Truck (DT)', explanation: 'Truk pengangkut bijih tambang (dump truck)' },
  'dumptruck': { standard: 'Dump Truck (DT)', explanation: 'Dump truck pengangkut ore' },
  'dump truk': { standard: 'Dump Truck (DT)', explanation: 'Dump truck pengangkut ore' },
  'damp truk': { standard: 'Dump Truck (DT)', explanation: 'Dump truck' },
  'damtruk': { standard: 'Dump Truck (DT)', explanation: 'Dump truck' },
  'hauling': { standard: 'hauling (pengangkutan ore)', explanation: 'Aktivitas pengangkutan bijih tambang' },
  'holing': { standard: 'hauling', explanation: 'Pengangkutan bijih tambang (hauling)' },
  'haulling': { standard: 'hauling', explanation: 'Pengangkutan bijih tambang (hauling)' },
  'excavator': { standard: 'excavator (alat gali muat)', explanation: 'Alat berat penggali tambang' },
  'eksa': { standard: 'excavator', explanation: 'Alat berat excavator' },
  'heksa': { standard: 'excavator', explanation: 'Alat berat excavator' },
  'excav': { standard: 'excavator', explanation: 'Excavator' },
  'loader': { standard: 'wheel loader', explanation: 'Alat berat pemuat material' },
  'loder': { standard: 'wheel loader', explanation: 'Wheel loader' },
  'dozer': { standard: 'bulldozer', explanation: 'Alat berat perata / pendorong' },
  'duser': { standard: 'bulldozer', explanation: 'Bulldozer' },
  'bulldozer': { standard: 'bulldozer', explanation: 'Bulldozer' },
  'grader': { standard: 'motor grader', explanation: 'Alat berat perata jalan hauling' },
  'greder': { standard: 'motor grader', explanation: 'Motor grader' },
  'greader': { standard: 'motor grader', explanation: 'Motor grader' },
  'compactor': { standard: 'compactor / vibro', explanation: 'Alat pemadat jalan' },
  'kompektor': { standard: 'compactor / vibro', explanation: 'Compactor pemadat jalan' },
  'vibro': { standard: 'compactor / vibro', explanation: 'Vibratory roller' },
  'water truck': { standard: 'water truck (truk penyiram)', explanation: 'Truk tangki penyiram jalan debu' },
  'wt': { standard: 'water truck', explanation: 'Water truck' },
  'fuel truck': { standard: 'fuel truck (truk bahan bakar)', explanation: 'Truk tangki solar mobile' },
  'ft': { standard: 'fuel truck', explanation: 'Fuel truck' },
  'pit': { standard: 'front pit (area tambang)', explanation: 'Front penambangan aktif' },
  'rom': { standard: 'ROM stockpile', explanation: 'Run of Mine (area penumpukan bijih nikel)' },
  'stockpile': { standard: 'stockpile (penumpukan ore)', explanation: 'Area penumpukan material' },
  'stokpel': { standard: 'stockpile', explanation: 'Stockpile penumpukan bijih' },
  'jetty': { standard: 'jetty (pelabuhan pengapalan)', explanation: 'Dermaga pengapalan ore nikel' },
  'jeti': { standard: 'jetty', explanation: 'Dermaga pelabuhan tambang' },
  'smelter': { standard: 'pabrik smelter', explanation: 'Pabrik peleburan / pemurnian nikel' },
  'hpal': { standard: 'pabrik HPAL (High Pressure Acid Leach)', explanation: 'Pabrik pengolahan nikel sulfat HPAL' },
  'hpall': { standard: 'pabrik HPAL', explanation: 'Pabrik HPAL' },
  'rkef': { standard: 'pabrik RKEF (Rotary Kiln Electric Furnace)', explanation: 'Pabrik pengolahan feronikel RKEF' },
  'disposal': { standard: 'area disposal (buangan OB)', explanation: 'Area penimbunan tanah penutup' },
  'disposel': { standard: 'area disposal', explanation: 'Area penimbunan overburden' },
  'settling pond': { standard: 'settling pond (kolam endap)', explanation: 'Kolam pengendapan sedimen tambang' },
  'limonit': { standard: 'bijih limonit (low grade ore)', explanation: 'Lapisan bijih nikel kadar Fe tinggi' },
  'limonite': { standard: 'bijih limonit', explanation: 'Bijih limonit' },
  'saprolit': { standard: 'bijih saprolit (high grade ore)', explanation: 'Lapisan bijih nikel kadar Ni tinggi' },
  'saprolite': { standard: 'bijih saprolit', explanation: 'Bijih saprolit' },
  'ore': { standard: 'bijih nikel (nickel ore)', explanation: 'Batuan mengandung mineral nikel' },
  'overburden': { standard: 'overburden (tanah penutup)', explanation: 'Lapisan tanah penutup batuan berharga' },
  'ob': { standard: 'overburden (tanah penutup)', explanation: 'Overburden' },
  'slurry': { standard: 'slurry (lumpur bijih)', explanation: 'Campuran bijih nikel halus dan air' },
  'moisture': { standard: 'moisture content (kadar air)', explanation: 'Kandungan air dalam sampel nikel' },
  'coring': { standard: 'drill core (sampel bor)', explanation: 'Sampel inti pemboran eksplorasi' },
  'dryer': { standard: 'oven dryer (pengering sampel)', explanation: 'Oven pemanas pengering sampel nikel' },
  'ovendryer': { standard: 'oven dryer', explanation: 'Oven pengering laboratorium' },
  'riffle': { standard: 'riffle splitter (pembagi sampel)', explanation: 'Alat pembagi sampel representatif' },
  'splitter': { standard: 'riffle splitter (pembagi sampel)', explanation: 'Alat pembagi sampel' },
  'xrf': { standard: 'instrumen XRF (spektrometer kadar)', explanation: 'Spektrometer analisis kadar nikel' },
  'loto': { standard: 'LOTO (Lockout / Tagout)', explanation: 'Prosedur keselamatan penguncian isolasi energi' },
  'p2h': { standard: 'P2H (Pemeriksaan Harian Alat)', explanation: 'Pemeriksaan Harian sebelum unit beroperasi' },
  'kta': { standard: 'KTA (Kondisi Tidak Aman)', explanation: 'Temuan bahaya kondisi fisik tempat kerja' },
  'tta': { standard: 'TTA (Tindakan Tidak Aman)', explanation: 'Perilaku kerja berbahaya tidak sesuai SOP' },
  'nearmiss': { standard: 'nearmiss (hampir celaka)', explanation: 'Insiden nyaris celaka tanpa cedera' },
  'simper': { standard: 'SIMPER (Izin Mengemudi Perusahaan)', explanation: 'Izin mengoperasikan kendaraan/alat di tambang' },
  'breakdown': { standard: 'breakdown (rusak / mogok)', explanation: 'Unit mengalami kerusakan di lapangan' },
  'bd': { standard: 'breakdown (rusak)', explanation: 'Unit alat berat breakdown' },
  'standby': { standard: 'standby (siap operasi)', explanation: 'Unit siap namun menunggu giliran kerja' },
  'downtime': { standard: 'downtime (durasi alat mati)', explanation: 'Durasi waktu unit tidak dapat beroperasi' },

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
  [/\b(ga|gak|ngga|tdk)\s+(nyalah|menyalah)\b/gi, 'tidak menyala'],
  [/\b(ga|gak|ngga|tdk)\s+muter\b/gi, 'tidak berputar'],
  [/\bsuplai\s+agin\b/gi, 'suplai angin'],
  [/\bsura\s+mesin\b/gi, 'suara mesin tidak normal'],
  [/\bpasa\s+mesin\b/gi, 'pada mesin'],
  [/\b(karna|krn)\s+bolong\b/gi, 'karena berlubang'],
  [/\bac\s+diruang\b/gi, 'AC di ruang'],
  [/\bbercecer\s+dilantai\b/gi, 'berceceran di lantai'],
  [/\bmanhaul\s+(mogok|mati|rusak|bd)\b/gi, 'bus manhaul operasional mogok'],
  [/\bgagang\s+(patah|rusak)\b/gi, 'gagang pegangan patah'],
  [/\b(kabel\s+power|kabel\s+daya)\s+kendor\b/gi, 'kabel daya kendur pada soket'],
  [/\boli\s+bocor\b/gi, 'kebocoran oli pelumas'],
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
 * Damerau-Levenshtein distance untuk menghitung jarak perbedaan kata
 * Mendeteksi operasi: penambahan, penghapusan, penggantian, dan transposisi (dua huruf tertukar bersebelahan seperti ruask -> rusak)
 */
export function damerauLevenshteinDistance(source: string, target: string): number {
  const sLen = source.length;
  const tLen = target.length;
  if (sLen === 0) return tLen;
  if (tLen === 0) return sLen;

  const dist: number[][] = [];
  for (let i = 0; i <= sLen; i++) dist[i] = [i];
  for (let j = 0; j <= tLen; j++) dist[0][j] = j;

  for (let i = 1; i <= sLen; i++) {
    for (let j = 1; j <= tLen; j++) {
      const cost = source[i - 1] === target[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(
        dist[i - 1][j] + 1,       // deletion
        dist[i][j - 1] + 1,       // insertion
        dist[i - 1][j - 1] + cost // substitution
      );

      // Transposition (contoh: 'ruask' vs 'rusak')
      if (i > 1 && j > 1 && source[i - 1] === target[j - 2] && source[i - 2] === target[j - 1]) {
        dist[i][j] = Math.min(dist[i][j], dist[i - 2][j - 2] + 1);
      }
    }
  }

  return dist[sLen][tLen];
}

// Daftar kata baku standar industri untuk fuzzy matching (mendeteksi typo huruf tertukar / terselip)
export const CANONICAL_TERMS: { root: string; standard: string; explanation: string }[] = [
  { root: 'rusak', standard: 'rusak', explanation: 'Kondisi mesin/alat tidak berfungsi (rusak)' },
  { root: 'patah', standard: 'patah', explanation: 'KBBI: patah (terputus / patah fisik)' },
  { root: 'bocor', standard: 'bocor', explanation: 'Kebocoran fluida / oli / debu' },
  { root: 'hancur', standard: 'hancur', explanation: 'Kondisi fisik hancur' },
  { root: 'kendur', standard: 'kendur', explanation: 'KBBI: kendur (tidak tegang/kencang)' },
  { root: 'oblak', standard: 'oblak (longgar)', explanation: 'Toleransi bantalan poros longgar/goyang' },
  { root: 'aus', standard: 'aus', explanation: 'KBBI: aus terkikis karena gesekan' },
  { root: 'bengkok', standard: 'bengkok (deformasi)', explanation: 'Deformasi mekanis' },
  { root: 'rembes', standard: 'rembesan', explanation: 'Terdapat rembesan fluida' },
  { root: 'macet', standard: 'macet / tersangkut', explanation: 'Komponen tidak dapat berputar / bergerak' },
  { root: 'pecah', standard: 'pecah', explanation: 'Kondisi fisik pecah' },
  { root: 'retak', standard: 'retak', explanation: 'Kondisi fisik retak' },
  { root: 'lepas', standard: 'terlepas', explanation: 'Komponen terlepas dari dudukannya' },
  { root: 'mati', standard: 'mati (tidak ada daya)', explanation: 'Unit tidak menyala sama sekali' },
  { root: 'kabel', standard: 'kabel', explanation: 'Kabel kelistrikan' },
  { root: 'korslet', standard: 'korsleting listrik', explanation: 'Hubungan arus pendek' },
  { root: 'sakelar', standard: 'sakelar', explanation: 'KBBI: sakelar' },
  { root: 'sekring', standard: 'sekring (fuse)', explanation: 'Pengaman arus listrik' },
  { root: 'baterai', standard: 'baterai', explanation: 'KBBI: baterai' },
  { root: 'sekop', standard: 'sekop', explanation: 'KBBI: sekop' },
  { root: 'dinamo', standard: 'motor dinamo', explanation: 'Motor dinamo penggerak' },
  { root: 'bearing', standard: 'bearing (bantalan poros)', explanation: 'Bantalan poros putar' },
  { root: 'kompresor', standard: 'kompresor', explanation: 'Kompresor udara' },
  { root: 'selang', standard: 'selang', explanation: 'KBBI: selang' },
  { root: 'pelumas', standard: 'pelumas (oli/gemuk)', explanation: 'Pelumas mesin' },
  { root: 'pulverizer', standard: 'pulverizer', explanation: 'Mesin penghalus sampel' },
  { root: 'crusher', standard: 'jaw crusher', explanation: 'Mesin peremuk sampel' },
  { root: 'timbangan', standard: 'timbangan', explanation: 'Alat penimbang sampel' },
  { root: 'saringan', standard: 'ayakan mesh (sieve)', explanation: 'Ayakan sampel' },
  { root: 'komputer', standard: 'komputer (PC)', explanation: 'Perangkat komputer' },
  { root: 'monitor', standard: 'layar monitor', explanation: 'Monitor komputer' },
  { root: 'printer', standard: 'printer cetak', explanation: 'Mesin pencetak' },
  { root: 'manhaul', standard: 'manhaul (bus operasional tambang)', explanation: 'Bus angkutan karyawan tambang' },
  { root: 'hauling', standard: 'hauling (pengangkutan ore)', explanation: 'Aktivitas pengangkutan bijih tambang' },
  { root: 'excavator', standard: 'excavator (alat gali muat)', explanation: 'Alat berat penggali tambang' },
  { root: 'loader', standard: 'wheel loader', explanation: 'Alat berat pemuat material' },
  { root: 'dozer', standard: 'bulldozer', explanation: 'Alat berat perata / pendorong' },
  { root: 'grader', standard: 'motor grader', explanation: 'Alat berat perata jalan hauling' },
  { root: 'compactor', standard: 'compactor / vibro', explanation: 'Alat pemadat jalan' },
  { root: 'stockpile', standard: 'ROM stockpile', explanation: 'Area penumpukan bijih tambang' },
  { root: 'limonit', standard: 'bijih limonit (low grade ore)', explanation: 'Bijih nikel kadar Fe tinggi' },
  { root: 'saprolit', standard: 'bijih saprolit (high grade ore)', explanation: 'Bijih nikel kadar Ni tinggi' },
  { root: 'splitter', standard: 'riffle splitter (pembagi sampel)', explanation: 'Alat pembagi sampel representatif' },
  { root: 'breakdown', standard: 'breakdown (unit rusak / mogok)', explanation: 'Unit alat berat tidak beroperasi' },
  { root: 'downtime', standard: 'downtime (durasi alat mati)', explanation: 'Durasi waktu unit tidak beroperasi' }
];

/**
 * Mencari saran fuzzy bila kata tidak persis ada di kamus
 */
function findFuzzyMatch(cleanWord: string): { standard: string; explanation: string } | null {
  if (cleanWord.length < 4) return null;

  for (const c of CANONICAL_TERMS) {
    if (cleanWord === c.root) continue;
    const dist = damerauLevenshteinDistance(cleanWord, c.root);
    // Jika panjang kata 4-6, toleransi beda 1 huruf (termasuk huruf bertukar seperti ruask -> rusak)
    if (c.root.length <= 6 && dist === 1) {
      return {
        standard: c.standard,
        explanation: `Perbaikan ketik: ${cleanWord} ➔ ${c.standard}`
      };
    }
    // Jika kata panjang (>= 7), toleransi beda hingga 2 huruf
    if (c.root.length >= 7 && dist <= 2) {
      return {
        standard: c.standard,
        explanation: `Perbaikan ketik: ${cleanWord} ➔ ${c.standard}`
      };
    }
  }
  return null;
}

/**
 * Mendeteksi kata-kata tidak baku atau typo dalam teks
 */
export function detectTypos(text: string): WordCorrection[] {
  if (!text || !text.trim()) return [];

  const found: WordCorrection[] = [];
  const words = text.split(/[\s,.;:!?()]+/).filter(Boolean);

  for (const w of words) {
    const clean = w.toLowerCase().trim();
    if (!clean) continue;

    // 1. Exact Match Kamus
    if (KBBI_MAINTENANCE_DICTIONARY[clean]) {
      const entry = KBBI_MAINTENANCE_DICTIONARY[clean];
      if (!found.some(f => f.word.toLowerCase() === clean)) {
        found.push({
          word: w,
          suggestion: entry.standard,
          explanation: entry.explanation || `Standar KBBI: ${entry.standard}`
        });
      }
      continue;
    }

    // 2. Fuzzy Match (Damerau-Levenshtein) untuk typo seperti "ruask", "patah", "mecet"
    const fuzzy = findFuzzyMatch(clean);
    if (fuzzy && !found.some(f => f.word.toLowerCase() === clean)) {
      found.push({
        word: w,
        suggestion: fuzzy.standard,
        explanation: fuzzy.explanation
      });
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

  // 2. Ganti kata tunggal sesuai kamus dan fuzzy match
  const words = result.split(/(\s+|[.,;!?()]+)/);
  const newWords = words.map(w => {
    const clean = w.toLowerCase().trim();
    if (!clean) return w;

    let target = '';
    if (KBBI_MAINTENANCE_DICTIONARY[clean]) {
      target = KBBI_MAINTENANCE_DICTIONARY[clean].standard;
    } else {
      const fuzzy = findFuzzyMatch(clean);
      if (fuzzy) {
        target = fuzzy.standard;
      }
    }

    if (target) {
      count++;
      replaced.push(w);
      // Cocokkan kapitalisasi jika kata asli berhuruf kapital di awal
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
  },
  {
    category: 'Manhaul & Alat Berat Tambang',
    icon: 'Truck',
    color: 'indigo',
    items: [
      {
        label: 'Manhaul Mogok / Tidak Starter',
        snippet: 'Unit bus manhaul penjemputan shift tidak dapat distarter, terindikasi dinamo starter atau daya aki drop.'
      },
      {
        label: 'AC Manhaul / Kabin Mati',
        snippet: 'Sistem pendingin (AC) kabin manhaul tidak dingin dan hembusan blower mati, kabin panas dan berdebu.'
      },
      {
        label: 'Bocor Selang Hidrolik (Hose)',
        snippet: 'Terdapat kebocoran oli hidrolik pada selang (hydraulic hose) unit, berpotensi ceceran B3 di jalan tambang.'
      },
      {
        label: 'Ban Sobek / Robek Batuan Ore',
        snippet: 'Ban unit sobek pada dinding samping (sidewall) terkena batuan ore nikel keras di jalan hauling.'
      }
    ]
  },
  {
    category: 'Preparasi Sampel Nikel (PrepLab)',
    icon: 'Layers',
    color: 'rose',
    items: [
      {
        label: 'Jaw Crusher Macet Batuan Keras',
        snippet: 'Jaw crusher macet tersangkut batuan saprolit keras, flywheel tertahan dan belt selip.'
      },
      {
        label: 'Oven Dryer Suhu Tidak Tercapai',
        snippet: 'Oven dryer pengering sampel nikel tidak dapat mencapai suhu 105°C, analisis moisture content terhambat.'
      },
      {
        label: 'Mangkok Pulverizer Aus / Cincin Retak',
        snippet: 'Cincin puck / ring mill pada mangkuk pulverizer mengalami keretakan dan aus, hasil penggerusan tidak lolos mesh 200.'
      },
      {
        label: 'Dust Collector Daya Hisap Lemah',
        snippet: 'Sistem penghisap debu (dust collector) mengalami penurunan daya hisap, filter bag kotor dan perlu pembersihan berkala.'
      }
    ]
  }
];
