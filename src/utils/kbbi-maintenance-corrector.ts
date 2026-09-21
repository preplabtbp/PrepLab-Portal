/**
 * KBBI & Industrial Maintenance Text Corrector & Standardizer
 * Khusus dirancang untuk portal PrepLab (Preparation & Laboratory Nikel)
 * Membantu pengawas di lapangan menghasilkan laporan kerusakan yang baku, presisi, 
 * dan selaras dengan terminologi resmi industri preparasi sampel dan laboratorium nikel.
 */

export interface WordCorrection {
  word: string;
  suggestion: string;
  explanation: string;
}

// Kamus Typo & Bahasa Lapangan ke Bahasa Baku KBBI & Istilah Resmi Preparation & Laboratory Nikel
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
  'bocor': { standard: 'bocor', explanation: 'Kebocoran fluida / oli / udara tekan' },
  'bocorr': { standard: 'bocor', explanation: 'Kebocoran' },
  'rembes': { standard: 'rembesan', explanation: 'Ada tetesan / rembesan fluida' },
  'mbrebes': { standard: 'rembesan', explanation: 'Rembesan cairan / oli' },
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
  'copot': { standard: 'terlepas', explanation: 'Komponen terlepas dari dudukannya' },
  'lepas': { standard: 'terlepas', explanation: 'Komponen terlepas' },
  'tumpah': { standard: 'tumpah', explanation: 'Tumpahan material / sampel / cairan' },
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
  'houskeeping': { standard: 'housekeeping (kebersihan)', explanation: 'Kegiatan pembersihan dan kerapian area kerja' },

  // --- Kelistrikan & Elektronik PrepLab ---
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

  // --- Komponen Mekanikal Umum PrepLab ---
  'dinamu': { standard: 'motor dinamo', explanation: 'KBBI: dinamo / motor penggerak' },
  'denamo': { standard: 'motor dinamo', explanation: 'Motor dinamo' },
  'laher': { standard: 'bantalan (bearing)', explanation: 'KBBI: bantalan poros (bearing)' },
  'klahar': { standard: 'bantalan (bearing)', explanation: 'Bantalan roda/poros (bearing)' },
  'klaher': { standard: 'bantalan (bearing)', explanation: 'Bearing' },
  'bearing': { standard: 'bearing (bantalan)', explanation: 'Bantalan poros putar' },
  'vbelt': { standard: 'v-belt (tali kipas)', explanation: 'Sabuk pemindah tenaga (v-belt)' },
  'vanbelt': { standard: 'v-belt (tali kipas)', explanation: 'Sabuk pemindah tenaga (v-belt)' },
  'van belt': { standard: 'v-belt (tali kipas)', explanation: 'V-Belt' },
  'fanbelt': { standard: 'v-belt (tali kipas)', explanation: 'V-Belt' },
  'slang': { standard: 'selang', explanation: 'KBBI: selang' },
  'stempet': { standard: 'pelumas gemuk (grease)', explanation: 'Grease pelumas' },
  'gemuk': { standard: 'pelumas gemuk (grease)', explanation: 'Grease' },
  'oli': { standard: 'pelumas (oli)', explanation: 'Oli pelumas mesin' },
  'martil': { standard: 'palu / martil', explanation: 'Alat pemukul sampel' },
  'pacul': { standard: 'cangkul', explanation: 'KBBI: cangkul' },
  'bloer': { standard: 'blower', explanation: 'Blower hisap/tiup exhaust' },

  // =========================================================================
  // --- ISTILAH KHUSUS PREPARATION & LABORATORY NIKEL (PREPLAB) ---
  // =========================================================================

  // 1. Manhole & Utilitas Kompresor, Dust Collector, Tangki Udara
  'manhole': { standard: 'manhole (lubang inspeksi)', explanation: 'Lubang inspeksi / akses orang pada tabung tangki udara kompresor, bejana tekan, atau ducting' },
  'menhol': { standard: 'manhole (lubang inspeksi)', explanation: 'Lubang inspeksi / perawatan tangki kompresor atau bejana tekan (manhole)' },
  'manhol': { standard: 'manhole (lubang inspeksi)', explanation: 'Lubang inspeksi / lubang orang (manhole)' },
  'menhaul': { standard: 'manhole (lubang inspeksi)', explanation: 'Lubang inspeksi bejana tangki (manhole)' },
  'kompreser': { standard: 'kompresor', explanation: 'KBBI: kompresor udara' },
  'kompresur': { standard: 'kompresor', explanation: 'KBBI: kompresor' },
  'air compressor': { standard: 'kompresor udara (air compressor)', explanation: 'Kompresor pensuplai udara bertekanan PrepLab' },
  'air gun': { standard: 'air gun (peniup debu)', explanation: 'Pistol semprotan udara bertekanan kompresor' },
  'tembakan angin': { standard: 'air gun (peniup debu)', explanation: 'Pistol peniup debu kompresor' },
  'safety valve': { standard: 'safety valve (katup pengaman)', explanation: 'Katup pelepas tekanan berlebih tangki kompresor' },
  'pressure switch': { standard: 'pressure switch (sakelar tekanan)', explanation: 'Sakelar otomatis kontrol tekanan tangki angin' },
  'presur switch': { standard: 'pressure switch', explanation: 'Pressure switch kompresor' },
  'pressure gauge': { standard: 'manometer (pressure gauge)', explanation: 'Alat ukur jarum tekanan udara kompresor' },
  'manometer': { standard: 'manometer (pengukur tekanan)', explanation: 'Pengukur tekanan fluida/angin' },
  'dast kolektor': { standard: 'dust collector', explanation: 'Sistem penangkap / penghisap debu preparasi (dust collector)' },
  'dustkolektor': { standard: 'dust collector', explanation: 'Sistem penghisap debu nikel' },
  'dust collector': { standard: 'dust collector', explanation: 'Penghisap debu preparasi nikel' },
  'filter bag': { standard: 'filter bag (kantong saring debu)', explanation: 'Kantong saring debu pada dust collector' },
  'kantung debu': { standard: 'filter bag', explanation: 'Filter bag dust collector' },
  'solenoid valve': { standard: 'solenoid valve (katup pulsa debu)', explanation: 'Katup solenoid pembersih filter dust collector' },
  'selenoid': { standard: 'solenoid valve', explanation: 'Katup solenoid' },
  'ducting': { standard: 'ducting (pipa saluran hisap debu)', explanation: 'Saluran pipa hisap debu preparasi nikel' },
  'cerobong': { standard: 'ducting / cerobong hisap', explanation: 'Saluran buang debu atau uap' },

  // 2. Peralatan Preparasi Sampel Batuan Nikel (Crushing, Milling, Sizing)
  'jaw crusher': { standard: 'jaw crusher', explanation: 'Mesin peremuk primer batuan sampel nikel' },
  'jawcrusher': { standard: 'jaw crusher', explanation: 'Mesin jaw crusher' },
  'jawcrawser': { standard: 'jaw crusher', explanation: 'Mesin peremuk sampel (jaw crusher)' },
  'kraser': { standard: 'jaw crusher', explanation: 'Mesin peremuk sampel (jaw crusher)' },
  'krusher': { standard: 'jaw crusher', explanation: 'Mesin jaw crusher' },
  'crasher': { standard: 'jaw crusher', explanation: 'Jaw crusher' },
  'jaw plate': { standard: 'jaw plate (pelat rahang crusher)', explanation: 'Pelat rahang baja peremuk batuan sampel nikel' },
  'rahang crusher': { standard: 'jaw plate (pelat rahang)', explanation: 'Pelat rahang peremuk sampel' },
  'toggle plate': { standard: 'toggle plate crusher', explanation: 'Pelat penahan beban lebih jaw crusher' },
  'flywheel': { standard: 'flywheel (roda gila crusher)', explanation: 'Roda penerus putaran peremuk' },
  'roll crusher': { standard: 'roll crusher (peremuk sekunder)', explanation: 'Mesin peremuk rol sampel nikel' },
  'rol craser': { standard: 'roll crusher', explanation: 'Roll crusher' },
  'pulverizer': { standard: 'pulverizer', explanation: 'Mesin penghalus / penggiling sampel nikel' },
  'pulve': { standard: 'pulverizer', explanation: 'Mesin penghalus sampel (pulverizer)' },
  'pulfe': { standard: 'pulverizer', explanation: 'Pulverizer' },
  'pulveizer': { standard: 'pulverizer', explanation: 'Pulverizer' },
  'pulveraiser': { standard: 'pulverizer', explanation: 'Pulverizer' },
  'polperiser': { standard: 'pulverizer', explanation: 'Pulverizer' },
  'mangkuk pulve': { standard: 'mangkuk pulverizer (bowl mill)', explanation: 'Mangkuk baja penggiling sampel nikel' },
  'mangkok pulve': { standard: 'mangkuk pulverizer (bowl mill)', explanation: 'Mangkuk penggiling sampel' },
  'bowl mill': { standard: 'mangkuk pulverizer (bowl mill)', explanation: 'Mangkuk pulverizer' },
  'puck': { standard: 'cincin puck pulverizer', explanation: 'Cakram baja pemukul halus sampel nikel' },
  'ring puck': { standard: 'cincin puck pulverizer', explanation: 'Cincin giling pulverizer' },
  'cakram giling': { standard: 'cincin puck pulverizer', explanation: 'Cakram giling pulverizer' },
  'riffle splitter': { standard: 'riffle splitter (pembagi sampel)', explanation: 'Alat pembagi sampel representatif' },
  'riffle': { standard: 'riffle splitter (pembagi sampel)', explanation: 'Alat pembagi sampel nikel' },
  'splitter': { standard: 'riffle splitter (pembagi sampel)', explanation: 'Alat pembagi sampel' },
  'spiliter': { standard: 'riffle splitter (pembagi sampel)', explanation: 'Riffle splitter pembagi sampel' },
  'rotary splitter': { standard: 'rotary sample divider (RSD)', explanation: 'Pembagi sampel otomatis putar' },
  'rsd': { standard: 'rotary sample divider (RSD)', explanation: 'Rotary sample divider' },
  'sieve shaker': { standard: 'sieve shaker (mesin ayakan getar)', explanation: 'Mesin pengayak getar sampel batuan nikel' },
  'shaker': { standard: 'sieve shaker (mesin ayakan)', explanation: 'Mesin pengayak' },
  'wiremesh': { standard: 'kawat ayakan (wiremesh)', explanation: 'Anyaman kawat saringan mesh' },
  'saringan mesh': { standard: 'ayakan mesh (sieve)', explanation: 'Saringan sampel berstandar mesh' },
  'ayakan': { standard: 'ayakan mesh', explanation: 'Saringan sampel (sieve mesh)' },
  'mesh': { standard: 'ayakan mesh', explanation: 'Ukuran kehalusan saringan sampel nikel (cth: 200 mesh)' },
  'oven dryer': { standard: 'oven dryer (pengering sampel nikel)', explanation: 'Oven pemanas pengering kadar air sampel (105°C)' },
  'ovendryer': { standard: 'oven dryer', explanation: 'Oven pengering laboratorium' },
  'draier': { standard: 'oven dryer', explanation: 'Oven dryer pengering sampel' },
  'dryer': { standard: 'oven dryer', explanation: 'Oven dryer pengering' },
  'baki sampel': { standard: 'baki pengering sampel (drying tray)', explanation: 'Nampan sampel nikel tahan karat' },
  'tray': { standard: 'baki pengering sampel (drying tray)', explanation: 'Baki nampan pengering sampel nikel' },
  'loyang sampel': { standard: 'baki pengering sampel', explanation: 'Baki sampel' },
  'skop': { standard: 'sekop', explanation: 'KBBI: sekop (bukan skop)' },
  'zis': { standard: 'sekop JIS', explanation: 'Standar Industri Jepang (Japanese Industrial Standards)' },
  'zis 30': { standard: 'sekop JIS 30D', explanation: 'Sekop JIS ukuran 30D' },
  'zis 30d': { standard: 'sekop JIS 30D', explanation: 'Sekop JIS 30D' },
  'altag': { standard: 'label barcode / tag sampel', explanation: 'Label identitas kantong sampel nikel' },
  'tropol': { standard: 'troli sampel (trolley)', explanation: 'Kereta dorong angkut sampel nikel' },
  'troly': { standard: 'troli sampel (trolley)', explanation: 'Troli angkut sampel' },
  'arco': { standard: 'gerobak dorong sampel (arco)', explanation: 'Gerobak angkut batuan sampel preparasi' },
  'arko': { standard: 'gerobak dorong sampel (arco)', explanation: 'Gerobak dorong sampel' },
  'artco': { standard: 'gerobak dorong sampel (arco)', explanation: 'Gerobak dorong sampel' },

  // 3. Instrumen Laboratorium Analitis (XRF, Spektrometri, Fusi & Wet Chemistry)
  'xrf': { standard: 'spektrometer XRF (X-Ray Fluorescence)', explanation: 'Instrumen penetapan kadar unsur utama nikel (Ni, Fe, Co, SiO2, MgO, dll)' },
  'spektrometer': { standard: 'spektrometer XRF', explanation: 'Spektrometer analisis laboratorium' },
  'zetium': { standard: 'spektrometer XRF Zetium', explanation: 'Spektrometer XRF Malvern Panalytical' },
  'press pellet': { standard: 'mesin pres pelet (pellet press)', explanation: 'Mesin hidrolik pencetak pelet sampel XRF' },
  'press pelet': { standard: 'mesin pres pelet (pellet press)', explanation: 'Mesin pencetak pelet XRF' },
  'die set': { standard: 'die set (cetakan pelet XRF)', explanation: 'Matras cetakan baja pembentuk pelet sampel' },
  'cup aluminium': { standard: 'cup aluminium pelet XRF', explanation: 'Wadah aluminium pelapis pelet sampel XRF' },
  'asam borat': { standard: 'asam borat (binder pelet XRF)', explanation: 'Bahan pengikat (binder) serbuk sampel nikel' },
  'binder': { standard: 'binder perekat pelet XRF', explanation: 'Zat pengikat serbuk sampel' },
  'fluxer': { standard: 'mesin fusi (fluxer XRF)', explanation: 'Alat pelebur manik kaca fusi XRF suhu tinggi' },
  'flukser': { standard: 'mesin fusi (fluxer XRF)', explanation: 'Mesin fluxer pelebur manik kaca' },
  'autofluxer': { standard: 'mesin fusi (fluxer XRF)', explanation: 'Mesin fusi otomatis' },
  'fusion machine': { standard: 'mesin fusi (fluxer XRF)', explanation: 'Mesin fusi manik kaca XRF' },
  'cawan platina': { standard: 'cawan platina (platinum crucible)', explanation: 'Krus tahan suhu tinggi (Pt-Au 95/5) untuk fusi XRF' },
  'crucible platina': { standard: 'cawan platina (platinum crucible)', explanation: 'Cawan platina fusi' },
  'krus platina': { standard: 'cawan platina (platinum crucible)', explanation: 'Cawan platina fusi' },
  'cetakan platina': { standard: 'cetakan platina (platinum mould)', explanation: 'Cetakan manik kaca platina fusi XRF' },
  'flux borat': { standard: 'flux borat (lithium borate)', explanation: 'Bahan pelebur fusi manik kaca XRF' },
  'fluks borat': { standard: 'flux borat', explanation: 'Fluks fusi borat' },
  'furnace': { standard: 'tanur muffle (muffle furnace)', explanation: 'Tanur pemanas suhu tinggi (1000°C) penentuan LOI' },
  'muffle furnace': { standard: 'tanur muffle (muffle furnace)', explanation: 'Tanur suhu tinggi laboratorium' },
  'furnis': { standard: 'tanur muffle (furnace)', explanation: 'Tanur muffle' },
  'tanur': { standard: 'tanur muffle (furnace)', explanation: 'Tanur pemanas laboratorium' },
  'pernis': { standard: 'tanur muffle (furnace)', explanation: 'Tanur laboratorium (muffle furnace)' },
  'loi': { standard: 'LOI (Loss on Ignition / hilang pijar)', explanation: 'Pengujian kehilangan massa batuan nikel pada suhu 1000°C' },
  'loss on ignition': { standard: 'LOI (Loss on Ignition / hilang pijar)', explanation: 'Uji hilang pijar sampel nikel' },
  'hilang pijar': { standard: 'LOI (Loss on Ignition / hilang pijar)', explanation: 'Hilang pijar sampel nikel' },
  'lemari asam': { standard: 'lemari asam (fume hood)', explanation: 'Lemari hisap uap asam pekat pengujian kimia basah' },
  'fume hood': { standard: 'lemari asam (fume hood)', explanation: 'Lemari hisap uap asam' },
  'fumehood': { standard: 'lemari asam (fume hood)', explanation: 'Lemari asam laboratorium' },
  'fume hud': { standard: 'lemari asam (fume hood)', explanation: 'Lemari asam (fume hood)' },
  'fumehud': { standard: 'lemari asam (fume hood)', explanation: 'Lemari asam' },
  'scrubber': { standard: 'wet scrubber (penyerap uap asam)', explanation: 'Sistem penetralisir uap asam lemari asam' },
  'hot plate': { standard: 'pelat pemanas (hot plate)', explanation: 'Pemanas digesti sampel kimia basah' },
  'hotplate': { standard: 'pelat pemanas (hot plate)', explanation: 'Pelat pemanas laboratorium' },
  'penangas': { standard: 'pelat pemanas (hot plate)', explanation: 'Pelat pemanas digesti' },
  'water purifier': { standard: 'mesin pemurni air (water purifier)', explanation: 'Sistem penyedia air ultra murni / demineralisasi' },
  'aquadest': { standard: 'air akuades (aquadest)', explanation: 'Air murni hasil penyulingan laboratorium' },
  'akuades': { standard: 'air akuades (aquadest)', explanation: 'Air murni laboratorium' },
  'air demin': { standard: 'air demineralisasi (demin water)', explanation: 'Air bebas mineral untuk titrasi dan AAS' },
  'demin': { standard: 'air demineralisasi', explanation: 'Air demineralisasi' },
  'milli-q': { standard: 'air ultra murni (Milli-Q)', explanation: 'Air ultra murni untuk instrumen presisi' },
  'buret': { standard: 'buret titrasi analitik', explanation: 'Tabung ukur kaca berkeran untuk penetapan volumetri' },
  'titrasi': { standard: 'titrasi kimia analitik', explanation: 'Metode kuantitatif penentuan kadar nikel' },
  'titrator': { standard: 'titrator otomatis', explanation: 'Alat titrasi otomatis' },
  'desikator': { standard: 'desikator kabinet pengering', explanation: 'Lemari kedap uap air penyimpan sampel kering' },
  'eksikator': { standard: 'desikator', explanation: 'Desikator' },
  'silica gel': { standard: 'silika gel pengering desikator', explanation: 'Butiran penyerap kelembapan udara' },
  'silika gel': { standard: 'silika gel pengering desikator', explanation: 'Penyerap kelembapan' },
  'timbangn': { standard: 'timbangan', explanation: 'KBBI: timbangan' },
  'timbaangan': { standard: 'timbangan', explanation: 'Timbangan' },
  'neraca analitik': { standard: 'neraca analitik (presisi 0.1 mg)', explanation: 'Timbangan analitik presisi tinggi 4 desimal' },
  'timbangan analitik': { standard: 'neraca analitik (presisi 0.1 mg)', explanation: 'Neraca analitik laboratorium' },
  'termokopel': { standard: 'termokopel (sensor suhu furnace/oven)', explanation: 'Sensor pengukur suhu tinggi furnace / oven' },
  'thermo couple': { standard: 'termokopel (sensor suhu)', explanation: 'Sensor thermocouple' },
  'thermocouple': { standard: 'termokopel (sensor suhu)', explanation: 'Sensor suhu tinggi' },
  'chiller': { standard: 'water chiller (pendingin sirkulasi XRF)', explanation: 'Mesin pendingin sirkulasi tabung XRF' },
  'water chiller': { standard: 'water chiller pendingin XRF', explanation: 'Water chiller sirkulasi instrumen' },
  'gas argon': { standard: 'gas argon ultra murni (UHP)', explanation: 'Gas pembawa instrumen spektrometer XRF / ICP' },
  'argon': { standard: 'gas argon ultra murni (UHP)', explanation: 'Gas pelindung / pembawa spektrometer' },
  'gas p10': { standard: 'gas P10 (detektor XRF)', explanation: 'Gas campuran argon-metana untuk detektor aliran XRF' },
  'pipet': { standard: 'pipet ukur / pipet volumetri', explanation: 'Alat pemindah cairan kimia presisi' },
  'labu takar': { standard: 'labu ukur analitik (volumetric flask)', explanation: 'Labu takar preparasi larutan standar' },
  'erlenmeyer': { standard: 'labu erlenmeyer', explanation: 'Wadah kaca titrasi dan pemanasan larutan' },
  'beaker': { standard: 'gelas piala (beaker glass)', explanation: 'Gelas piala pelarutan sampel nikel' },
  'beaker glass': { standard: 'gelas piala (beaker glass)', explanation: 'Gelas piala kimia' },

  // 4. Matriks Sampel Nikel & Kontrol Kualitas (QA/QC)
  'saprolit': { standard: 'sampel saprolit (kadar Ni tinggi)', explanation: 'Lapisan bijih nikel bagian bawah kaya Ni dan Mg' },
  'saprolite': { standard: 'sampel saprolit', explanation: 'Sampel batuan saprolit' },
  'sapro': { standard: 'sampel saprolit', explanation: 'Sampel saprolit nikel' },
  'limonit': { standard: 'sampel limonit (kadar Fe tinggi)', explanation: 'Lapisan bijih nikel bagian atas kaya Fe dan Co' },
  'limonite': { standard: 'sampel limonit', explanation: 'Sampel batuan limonit' },
  'limo': { standard: 'sampel limonit', explanation: 'Sampel limonit nikel' },
  'ore': { standard: 'sampel bijih nikel (nickel ore)', explanation: 'Batuan sampel nikel yang diuji' },
  'moisture': { standard: 'kadar air (moisture content)', explanation: 'Persentase air dalam sampel basah nikel' },
  'moisture content': { standard: 'kadar air (moisture content)', explanation: 'Kadar air sampel batuan nikel' },
  'mc': { standard: 'kadar air (moisture content)', explanation: 'Moisture content' },
  'coring': { standard: 'drill core (sampel inti bor nikel)', explanation: 'Sampel inti pemboran eksplorasi nikel' },
  'crm': { standard: 'CRM (Certified Reference Material)', explanation: 'Sampel standar acuan bersertifikat untuk kalibrasi instrumen' },
  'standard sample': { standard: 'sampel standar (CRM)', explanation: 'Sampel acuan verifikasi instrumen' },
  'duplikat': { standard: 'sampel duplikat (QC testing)', explanation: 'Sampel kembar untuk uji presisi pengujian' },
  'duplicate': { standard: 'sampel duplikat (QC testing)', explanation: 'Sampel duplikat' },
  'dup': { standard: 'sampel duplikat', explanation: 'Sampel duplikat' },
  'blangko': { standard: 'larutan blangko (blank)', explanation: 'Larutan tanpa analit untuk koreksi garis dasar pengujian' },
  'blank': { standard: 'larutan blangko (blank)', explanation: 'Larutan blangko kimia' },
  'reagen': { standard: 'reagen kimia analitis', explanation: 'Bahan kimia pereaksi pengujian nikel (HCl, HNO3, HF, dll)' },
  'reagent': { standard: 'reagen kimia analitis', explanation: 'Reagen analitis' },
  'loto': { standard: 'LOTO (Lockout / Tagout)', explanation: 'Prosedur keselamatan penguncian isolasi energi alat' },
  'kta': { standard: 'KTA (Kondisi Tidak Aman)', explanation: 'Temuan bahaya fisik tempat kerja di area PrepLab' },
  'tta': { standard: 'TTA (Tindakan Tidak Aman)', explanation: 'Perilaku kerja berbahaya tidak sesuai SOP PrepLab' },
  'nearmiss': { standard: 'nearmiss (nyaris celaka)', explanation: 'Insiden nyaris celaka tanpa cedera di area PrepLab' },

  // --- Kata Sambung / Singkatan Percakapan Lapangan ---
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

// Frasa multi-kata yang sering disingkat / salah ketik di PrepLab
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
  [/\b(baut|tutup|paking)\s+(menhol|manhol)\b/gi, '$1 manhole'],
  [/\b(menhol|manhol)\s+(bocor|rembes)\b/gi, 'manhole tangki bocor / rembes'],
  [/\bmangkok\s+pulve\b/gi, 'mangkuk pulverizer'],
  [/\bcincin\s+pulve\b/gi, 'cincin puck pulverizer'],
  [/\bpuck\s+pulve\b/gi, 'puck pulverizer'],
  [/\bpelat\s+rahang\b/gi, 'jaw plate (pelat rahang)'],
  [/\bcawan\s+platina\b/gi, 'cawan platina (platinum crucible)'],
  [/\boven\s+(pengering|drayer|draier)\b/gi, 'oven dryer pengering sampel'],
  [/\blemari\s+asam\s+(mati|lemah|rusak)\b/gi, 'lemari asam (fume hood) daya hisap menurun'],
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

// Daftar kata baku standar Prep & Lab nikel untuk fuzzy matching (mendeteksi typo huruf tertukar / terselip)
export const CANONICAL_TERMS: { root: string; standard: string; explanation: string }[] = [
  { root: 'rusak', standard: 'rusak', explanation: 'Kondisi mesin/alat tidak berfungsi (rusak)' },
  { root: 'patah', standard: 'patah', explanation: 'KBBI: patah (terputus / patah fisik)' },
  { root: 'bocor', standard: 'bocor', explanation: 'Kebocoran fluida / oli / debu / udara tekan' },
  { root: 'hancur', standard: 'hancur', explanation: 'Kondisi fisik hancur' },
  { root: 'kendur', standard: 'kendur', explanation: 'KBBI: kendur (tidak tegang/kencang)' },
  { root: 'oblak', standard: 'oblak (longgar)', explanation: 'Toleransi bantalan poros longgar/goyang' },
  { root: 'aus', standard: 'aus', explanation: 'KBBI: aus terkikis karena gesekan' },
  { root: 'bengkok', standard: 'bengkok (deformasi)', explanation: 'Deformasi mekanis' },
  { root: 'rembes', standard: 'rembesan', explanation: 'Terdapat rembesan fluida / oli' },
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
  { root: 'pulverizer', standard: 'pulverizer', explanation: 'Mesin penghalus sampel nikel' },
  { root: 'crusher', standard: 'jaw crusher', explanation: 'Mesin peremuk sampel nikel' },
  { root: 'timbangan', standard: 'timbangan', explanation: 'Alat penimbang sampel' },
  { root: 'saringan', standard: 'ayakan mesh (sieve)', explanation: 'Ayakan sampel nikel' },
  { root: 'komputer', standard: 'komputer (PC)', explanation: 'Perangkat komputer' },
  { root: 'monitor', standard: 'layar monitor', explanation: 'Monitor komputer' },
  { root: 'printer', standard: 'printer cetak', explanation: 'Mesin pencetak' },
  { root: 'manhole', standard: 'manhole (lubang inspeksi)', explanation: 'Lubang inspeksi tangki udara kompresor / ducting' },
  { root: 'limonit', standard: 'sampel limonit (kadar Fe tinggi)', explanation: 'Sampel batuan nikel limonit' },
  { root: 'saprolit', standard: 'sampel saprolit (kadar Ni tinggi)', explanation: 'Sampel batuan nikel saprolit' },
  { root: 'splitter', standard: 'riffle splitter (pembagi sampel)', explanation: 'Alat pembagi sampel representatif' },
  { root: 'furnace', standard: 'tanur muffle (furnace)', explanation: 'Tanur muffle suhu tinggi uji LOI' },
  { root: 'platina', standard: 'cawan platina (platinum crucible)', explanation: 'Cawan platina fusi XRF' },
  { root: 'pelet', standard: 'pelet sampel XRF (pressed pellet)', explanation: 'Pelet padat sampel XRF' },
  { root: 'desikator', standard: 'desikator kabinet', explanation: 'Lemari kedap pengering kelembapan sampel' }
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
 * Khusus Lingkup Preparation & Laboratory Nikel (PrepLab)
 */
export const COMMON_DAMAGE_TEMPLATES = [
  {
    category: 'Preparasi Sampel Nikel (Prep)',
    icon: 'Layers',
    color: 'rose',
    items: [
      {
        label: 'Jaw Crusher Macet Batuan Saprolit',
        snippet: 'Jaw crusher macet tersangkut batuan saprolit keras, flywheel tertahan dan v-belt selip.'
      },
      {
        label: 'Pelat Rahang (Jaw Plate) Aus / Gumpil',
        snippet: 'Pelat rahang (jaw plate) jaw crusher mengalami keausan dan retak serpih, hasil peremukan batuan tidak seragam.'
      },
      {
        label: 'Mangkuk Pulverizer Cincin Puck Aus',
        snippet: 'Cincin puck pada mangkuk pulverizer aus dan retak, hasil penggerusan sampel nikel tidak lolos ayakan 200 mesh.'
      },
      {
        label: 'Oven Dryer Suhu 105°C Tidak Tercapai',
        snippet: 'Oven dryer pengering sampel nikel tidak dapat mencapai suhu 105°C, proses analisis kadar air (moisture content) terhambat.'
      },
      {
        label: 'Riffle Splitter Saluran Tertutup / Penyok',
        snippet: 'Saluran pembagi pada riffle splitter penyok dan terhalang gumpalan sampel basah, pembagian sampel tidak representatif.'
      },
      {
        label: 'Sieve Shaker Vibrasi Lemah / Mesh Sobek',
        snippet: 'Sieve shaker mengalami getaran lemah tidak beraturan dan kawat ayakan mesh mengalami sobek pada bagian tepi.'
      }
    ]
  },
  {
    category: 'Laboratorium Kimia, XRF & Spektrometri',
    icon: 'Cpu',
    color: 'blue',
    items: [
      {
        label: 'XRF Error Vakum / Detektor Alarm',
        snippet: 'Spektrometer XRF mengalami penurunan tingkat vakum dan alarm detektor menyala, pengukuran kadar Ni dan Fe terhenti.'
      },
      {
        label: 'Mesin Press Pelet Hidrolik Bocor',
        snippet: 'Mesin pres pelet sampel XRF mengalami kebocoran oli hidrolik dan tekanan cetak turun di bawah batas standar.'
      },
      {
        label: 'Mesin Fusi (Fluxer) Suhu Tidak Tercapai',
        snippet: 'Mesin pelebur fusi manik kaca (fluxer XRF) burner gas tidak stabil dan suhu fusi tidak mencapai titik lebur manik kaca.'
      },
      {
        label: 'Tanur Muffle (Furnace LOI) Elemen Pemanas Putus',
        snippet: 'Tanur pemanas muffle furnace untuk penentuan Loss on Ignition (LOI) suhu 1000°C tidak naik, terindikasi elemen pemanas putus.'
      },
      {
        label: 'Lemari Asam (Fume Hood) Daya Hisap Lemah',
        snippet: 'Blower hisap lemari asam (fume hood) berputar lambat, uap asam pekat hasil digesti kimia basah terjebak di dalam ruang kabinet.'
      },
      {
        label: 'Neraca Analitik Timbangan Tidak Stabil',
        snippet: 'Timbangan neraca analitik mengalami angka melayang (drift) tidak stabil dan pintu kaca geser penutup angin seret.'
      }
    ]
  },
  {
    category: 'Utilitas PrepLab (Kompresor & Dust Collector)',
    icon: 'AlertTriangle',
    color: 'amber',
    items: [
      {
        label: 'Kompresor Angin / Manhole Tangki Rembes',
        snippet: 'Tangki kompresor udara mengalami rembesan pada paking manhole dan tekanan udara kerja turun cepat di bawah 6 bar.'
      },
      {
        label: 'Dust Collector Daya Hisap Lemah / Filter Bag Buntu',
        snippet: 'Sistem penghisap debu (dust collector) preparasi mengalami penurunan daya hisap, kantong filter bag buntu debu nikel.'
      },
      {
        label: 'Selang Angin / Air Gun Bocor Sambungan Nepel',
        snippet: 'Selang spiral air gun pembersih alat preparasi mengalami kebocoran angin pada sambungan quick coupler / nepel.'
      },
      {
        label: 'Water Purifier / Filter Air Demin Mampet',
        snippet: 'Sistem pemurni air laboratorium (water purifier) debit air demineralisasi sangat kecil dan nilai konduktivitas tinggi.'
      },
      {
        label: 'Saluran Pembuangan Wastafel Kimia Bocor',
        snippet: 'Pipa pembuangan wastafel laboratorium kimia mengalami rembesan asam pada sambungan pipa PVC di bawah meja.'
      }
    ]
  },
  {
    category: 'Kelistrikan, Motor & Penggerak Mesin',
    icon: 'Cpu',
    color: 'indigo',
    items: [
      {
        label: 'Motor Dinamo Cepat Panas (Overheat) & Trip',
        snippet: 'Motor dinamo penggerak mesin preparasi cepat mengalami panas berlebih (overheating) dan overload trip setelah beberapa menit.'
      },
      {
        label: 'Korsleting / Bau Hangus Pada Panel Listrik',
        snippet: 'Tercium bau hangus terbakar pada panel kendali kelistrikan mesin preparasi, terindikasi kontaktor / kabel meleleh.'
      },
      {
        label: 'Kabel Daya Terkelupas / Soket Longgar',
        snippet: 'Kabel daya utama terkelupas pada bagian pelindung luar dekat steker, membahayakan keselamatan operator.'
      },
      {
        label: 'Sensor Suhu / Termokopel Pembacaan Error',
        snippet: 'Sensor suhu termokopel pada oven / furnace memberikan pembacaan fluktuatif tidak normal atau bernilai tak terhingga (open loop).'
      }
    ]
  },
  {
    category: 'Mekanikal, Baut & Pelumasan',
    icon: 'Hammer',
    color: 'emerald',
    items: [
      {
        label: 'Baut Pengunci Mesin Kendur Akibat Getaran',
        snippet: 'Baut pengikat pondasi mesin getar kendur dan sebagian baut aus (dol) akibat getaran mekanis tinggi saat beroperasi.'
      },
      {
        label: 'Suara Bising / Kasar Pada Bearing Poros',
        snippet: 'Terdengar suara bising dan getaran kasar tidak wajar pada rumah bearing poros penggerak, bearing aus dan perlu pelumasan.'
      },
      {
        label: 'V-Belt Pemindah Tenaga Kendur / Selip',
        snippet: 'V-belt penghubung motor dinamo ke puli mesin kendur dan mengalami selip saat memproses sampel batuan berat.'
      },
      {
        label: 'Gagang Alat Sampling Patah / Rusak',
        snippet: 'Gagang sekop JIS / martil sampling patah pada bagian sambungan las, perlu penggantian gagang baru.'
      }
    ]
  }
];
