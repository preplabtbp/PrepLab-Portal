async function test() {
  const payload = {
    finalData: {
      judulForm: "Test",
      lokasiUmum: "Area",
      insp1: "Inspector",
      catatanUmum: "Catatan",
      temuanUmum: []
    },
    ttd1: "",
    ttd2: "",
    ttd3: "",
    fotoTemuanArray: [],
    fotoProses: []
  };

  try {
    const res = await fetch('http://localhost:3000/api/inspections/universal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", data);
  } catch (e) {
    console.error(e);
  }
}
test();
