async function run() {
  const url = "https://script.google.com/macros/s/AKfycbxTj2I3U59JyfjqWzRMXQYIXsbnVVGb-KeQBmHJNL-U28X9Xq-d_Ae0Rw9K5cOr_klP/exec";
  const payloadToGas = {
      action: "submitInspeksiUniversal",
      finalData: {
          judulForm: "Inspeksi Umum Terencana Area Preparasi",
          lokasiUmum: "Preparasi Kering (Area Kerja-Halte-Parkiran)",
          insp1: "Muhamad Anugrah Ramadhan | Laboratory Foreman",
          tipe: "UMUM",
          catatanUmum: "-",
          temuanUmum: [],
          payload: [
            {
              kategori: "Kerapian",
              pertanyaan: "1. Area kerja bersih",
              jawaban: "YA",
              keterangan: "-"
            }
          ],
          devOptions: { isDev: true, db: true, pdf: true, verboseLog: true }
      },
      ttd1: "-", ttd2: "-", ttd3: "-", fotoTemuanArray: [], fotoProses: "-"
  };
  
  console.log("Sending payload...");
  try {
      const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify(payloadToGas)
      });
      const text = await res.text();
      console.log("GAS Response:", text);
      const json = JSON.parse(text);
      if(json.data && json.data.logDetails) {
        console.log("GAS LOGS:", JSON.stringify(json.data.logDetails, null, 2));
      } else if (json.logDetails) {
        console.log("GAS LOGS:", JSON.stringify(json.logDetails, null, 2));
      }
  } catch (err) {
      console.error(err);
  }
}
run();
