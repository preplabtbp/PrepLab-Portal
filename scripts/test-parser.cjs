const testCases = [
  "TBP-IK-PL-PREP-04.03-06_R0.0 Pengoprasian Dust Collector.pdf",
  "TBP-IK-PL-PREP-04.01-01_R0.2 Penggunaan Oven Kontainer.pdf",
  "TBP-IK-PL-PREP-04.03-01_R0.2 Pengoperasian Jaw Crusher.pdf",
  "TBP-IK-PL-PREP-04.03-02_R0.2 Pengoperasian Double Roll Crusher.pdf",
  "TBP-IK-PL-PREP-04.03-04_R0.2 Pengoperasian Mixer Type V.pdf",
  "TBP-IK-PL-PREP-04.03-05_R0.2 Pengoperasian Kompressor.pdf",
  "TBP-IK-PL-PREP-04.04-01 Penomoran ID Lab Sampel GC_R0.0.pdf",
  "TBP-IK-PL-LAB-04.05-02_R0.2 Pengoperasian Mesin Chiller.pdf",
  "TBP-IK-PL-LAB-04.01-01_R0.2 Penggunaan Timbangan Digital.pdf",
  "TBP-IK-PL-LAB-04.01-02_R0.2 Pengoperasian Mesin Press.pdf",
  "TBP-IK-PL-LAB-04.02-01_R0.2 Penggunaan TDL Badge.pdf",
  "TBP-IK-PL-LAB-04.02-02_R0.2 Penggantian Tabung Gas Helium.pdf",
  "TBP-IK-PL-LAB-04.03-01_R0.2 Penggunaan Drying Oven.pdf",
  "TBP-IK-PL-LAB-04.03-02_R0.2 Penggunaan Desikator.pdf",
  "TBP-IK-PL-LAB-04.03-03_R0.2 Penggunaan Muffle Furnace.pdf",
  "TBP-IK-PL-LAB-04.03-04_R0.2 Penggunaan Timbangan Analitik Digital.pdf",
  "TBP-IK-PL-LAB-04.04-01_R0.2 Pengoperasian Mesin Fusion.pdf",
  "TBP-IK-PL-LAB-04.04-02_R0.2 Pembuatan Asam Sitrat 20%.pdf",
  "TBP-IK-PL-LAB-04.04-03_R0.2 Penggunaan Digital Ultrasonic.pdf",
  "TBP-IK-PL-LAB-04.04-04_R0.2 Pengoperasian Mesin Polishing Mould.pdf",
  "TBP-IK-PL-LAB-04.04-05_R0.1 Pencucian Platinum Ware.pdf",
  "TBP-IK-PL-LAB-04.04-06_R0.0 Pengoprasian Fume Hood.pdf",
  "TBP-IK-PL-LAB-04.04-07_R0.0 Pengoprasian Exhaust Ducting.pdf",
  "TBP-IK-PL-LAB-04.04-08_R0.0 Pengoprasian Scrubber.pdf",
  "TBP-IK-PL-LAB-04.05-01_R0.2 Pengoperasian UPS Emmerich.pdf",
  "TBP-IK-PL-LAB-04.05-03_R0.2 Penggantian Tabung Gas Argon.pdf"
];

function parseIKTitle(fileName) {
  let base = fileName.replace(/\.pdf$/i, '').trim();
  base = base.replace(/^TBP-IK-PL-[A-Za-z0-9\.\-_]+/i, '').trim();
  base = base.replace(/_?R\d+(\.\d+)?/gi, '').trim();
  base = base.replace(/^[\d\.\-_\s]+/, '').trim();
  base = base.replace(/[\d\.\-_\s]+$/, '').trim();
  base = base.replace(/^Pengoprasian\b/i, 'Pengoperasian');

  if (!base.toUpperCase().startsWith('IK ')) {
    base = `IK ${base}`;
  }
  return base;
}

testCases.forEach(tc => {
  console.log(`"${tc}"\n -> "${parseIKTitle(tc)}"\n`);
});
