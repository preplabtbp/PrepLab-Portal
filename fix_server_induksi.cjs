const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `      await db.insert(induksi).values({
        tipeInduksi: data.tipe_A === "✔" ? "Induksi Lengkap" : "Induksi Singkat",
        perusahaan: data.perusahaan,
        namaPeserta: data.namaPeserta,
        nikPeserta: data.nik,
        jabatanPeserta: data.jabatanPeserta,
        divisi: data.divisi,
        namaInduktor: data.namaInduktor,
        jabatanInduktor: data.jabatanInduktor,
        materiData: JSON.stringify(materiData),
        fotoDokumentasi: data.fotoDokumentasi ? "Ada" : "Tidak Ada",
        pdfUrl: pdfResult.pdfUrl
      });`;

const replacement = `      await db.insert(induksi).values({
        tipeInduksi: data.tipe_A === "✔" ? "Induksi Lengkap" : "Induksi Singkat",
        perusahaan: data.perusahaan,
        namaPeserta: data.namaPeserta,
        nikPeserta: data.nik,
        jabatanPeserta: data.jabatanPeserta,
        // divisi: data.divisi, // not in schema
        namaInduktor: data.namaInduktor,
        jabatanInduktor: data.jabatanInduktor,
        tanggal: dateString, // explicitly set tanggal to avoid null/default error if any
        materiData: materiData, // Pass the object directly for JSON column
        // fotoDokumentasi: data.fotoDokumentasi ? "Ada" : "Tidak Ada", // not in schema
        pdfUrl: pdfResult.pdfUrl,
        pdfId: pdfResult.pdfId
      });`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('server.ts', code);
    console.log("Patched induksi insert");
} else {
    console.log("Target not found");
}
