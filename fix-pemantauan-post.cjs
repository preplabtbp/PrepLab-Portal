const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const newPost = `  app.post("/api/pemantauan", async (req, res) => {
    try {
      const payload = req.body;
      const rowsToInsert = payload.items.map((item) => ({
        inspectorName: payload.inspektor,
        shift: payload.shift,
        notes: payload.catatan,
        photoUrl: payload.foto,
        lokasi: item.lokasi,
        kategori: item.kategori,
        suhu: item.suhu,
        kelembapan: item.kelembapan,
        flow: item.flow,
        tekananGas: item.tekananGas,
        kebocoran: item.kebocoran
      }));
      if (rowsToInsert.length > 0) {
        await db.insert(pemantauan).values(rowsToInsert);
      }
      res.status(201).json("Berhasil submit pemantauan!");
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to save pemantauan" });
    }
  });`;

code = code.replace(
  /app\.post\("\/api\/pemantauan", async \(req, res\) => \{[\s\S]*?\}\);/,
  newPost
);

fs.writeFileSync('server.ts', code);
