const sopTestCases = [
  "06. TBP-SOP-PL-PREP-04.06 Penentuan Kadar Air (Moisture Content)_R.06.pdf",
  "05. TBP-SOP-PL-PREP-04.05 Preparasi Sampel Eksplorasi_R.06.pdf",
  "04. TBP-SOP-PL-PREP-04.04 Preparasi Sampel Grade Control_R.06.pdf",
  "03. TBP-SOP-PL-PREP-04.03 Preparasi Kering Sampel Produksi_R.07.pdf",
  "01. TBP-SOP-PL-PREP-04.01 Preparasi Basah Sampel Produksi_R.08.pdf",
  "07. TBP-SOP-PL-PREP-04.07 Screen Test #200 Mesh_R.06.pdf",
  "06. TBP-SOP-PL-LAB-04.06 Penanganan Tumpahan B3 di Area Laboratorium R.01.pdf",
  "05. TBP-SOP-PL-LAB-04.05 Pengoperasian WD-XRF Zetium_R.03.pdf",
  "04. TBP-SOP-PL-LAB-04.04 Pembuatan Sampel Fused Bead_R.03.pdf",
  "03. TBP-SOP-PL-LAB-04.03 Pengujian LOI (Loss on Ignition)_R.03.pdf",
  "02. TBP-SOP-PL-LAB-04.02 Pengoperasian ED-XRF Epsilon_R.06.pdf",
  "01. TBP-SOP-PL-LAB-04.01 Pembuatan Sampel Press Powder_R.06.pdf"
];

function parseSOPTitle(fileName) {
  let base = fileName.replace(/\.pdf$/i, '').trim();
  base = base.replace(/^\d+[\.\-\s]+/, '').trim();
  base = base.replace(/^TBP-SOP-PL-[A-Za-z0-9\.\-_]+/i, '').trim();
  base = base.replace(/_?R\.?\d+(\.\d+)?/gi, '').trim();
  base = base.replace(/^[\d\.\-_\s]+/, '').trim();
  base = base.replace(/[\d\.\-_\s]+$/, '').trim();

  if (!base.toUpperCase().startsWith('SOP ')) {
    base = `SOP ${base}`;
  }

  return base;
}

sopTestCases.forEach(tc => {
  console.log(`"${tc}"\n -> "${parseSOPTitle(tc)}"\n`);
});
