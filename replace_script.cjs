const fs = require('fs');
let code = fs.readFileSync('server/routes/inspections.ts', 'utf8');

// Replace Universal logic
const gasUniversalBlock = code.substring(code.indexOf('const gasUrl ='), code.indexOf('// Save to Postgres'));

const universalReplacement = `
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '1_YOUR_FOLDER_ID_HERE';
      const TEMPLATE_UMUM = ['1BQ-zEfNQyeqO2VmNvjDGkV73AgDeXBZSALakp4erfvA', '16bL1aG7QEfp_1UF38RfjCKybGP-hzJ0Qu-hlaxfjamE'];
      
      const now = new Date();
      const tgl = now.toLocaleDateString('id-ID', { timeZone: 'Asia/Jayapura' });
      const jam = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jayapura' }) + ' WIT';
      
      let temuanStr = '';
      if (finalData.temuanUmum && finalData.temuanUmum.length > 0) {
        finalData.temuanUmum.forEach((t, i) => {
          temuanStr += \`\${i+1}. \${t.temuan || '-'} (Risiko: \${t.risiko || '-'})\nStatus: \${t.status || 'Open'}\nPengendalian: \${t.pengendalian || '-'}\n\n\`;
        });
      } else {
        temuanStr = 'Nihil';
      }

      let payloadStr = '';
      if (finalData.payload && finalData.payload.length > 0) {
        finalData.payload.forEach((p, i) => {
          payloadStr += \`\${i+1}. [\${p.kategori || '-'}] \${p.pertanyaan || '-'}\nJawaban: \${p.jawaban || '-'}\nKet: \${p.keterangan || '-'}\n\n\`;
        });
      }

      const replacements = {
        '<<Jam>>': jam,
        '<<Tanggal>>': tgl,
        '<<Area>>': finalData.lokasiUmum || finalData.judulForm || '-',
        '<<AREA>>': finalData.lokasiUmum || finalData.judulForm || '-',
        '<<No Dokumen>>': 'TBP-FR-SFT-05.07-XX',
        '<<NO DOKUMEN>>': 'TBP-FR-SFT-05.07-XX',
        '<<Judul Form>>': finalData.judulForm || '-',
        '<<Lokasi>>': finalData.lokasiUmum || '-',
        '<<DAFTAR_TEMUAN>>': temuanStr,
        '<<DATA_PAYLOAD>>': payloadStr
      };

      const images = {
        '<<TTD 1>>': ttd1 || '-',
        '<<TTD 2>>': ttd2 || '-',
        '<<TTD 3>>': ttd3 || '-',
        '<<Foto Proses Inspeksi>>': fotoProses || '-',
        '<<Foto Proses>>': fotoProses || '-'
      };
      
      if (fotoTemuanArray && fotoTemuanArray.length > 0) {
         images['<<FOTO_TEMUAN_1>>'] = fotoTemuanArray[0] || '-';
         images['<<FOTO_TEMUAN_2>>'] = fotoTemuanArray[1] || '-';
      }

      try {
          console.log('Generating PDF Universal TBP...');
          const res1 = await generatePdfFromTemplate(TEMPLATE_UMUM[0], folderId, replacements, 'W_INSPEKSI_TBP', images);
          if (res1.success) pdfUrl = res1.pdfUrl;
          
          console.log('Generating PDF Universal GPS...');
          replacements['<<No Dokumen>>'] = 'GPS-FR-SFT-05.07-XX';
          replacements['<<NO DOKUMEN>>'] = 'GPS-FR-SFT-05.07-XX';
          const res2 = await generatePdfFromTemplate(TEMPLATE_UMUM[1], folderId, replacements, 'W_INSPEKSI_GPS', images);
          if (res2.success) linkPdf2 = res2.pdfUrl;
      } catch (e) {
          console.error('Error generating universal PDF natively:', e);
      }
`;
code = code.replace(gasUniversalBlock, universalReplacement);


// Replace APD logic
const gasApdStart = code.indexOf('const gasUrl =', code.indexOf('/api/inspections\"'));
const gasApdEnd = code.indexOf('// Save to Postgres', gasApdStart);
const gasApdBlock = code.substring(gasApdStart, gasApdEnd);

const apdReplacement = `
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '1_YOUR_FOLDER_ID_HERE';
      const TEMPLATE_APD = ['14yUFPY64xH8GapL8NwSA2KM7HwdXd6k-vLh52pJ0HzQ', '1EJPapWAzQw71CFazi7qFZldVjpx9GNZwMGwevP35pBY'];
      
      let jamString = '-';
      let tglString = '-';
      let bagianString = '-';
      let header = [];
      
      if (dataF && dataF.length > 0) {
         header = dataF[0];
         jamString = header[0] || '-';
         tglString = header[1] || '-';
         bagianString = header[2] || '-';
      }
      
      let personilStr = '';
      if (dataF && dataF.length > 0) {
        dataF.forEach((r, idx) => {
          personilStr += \`\${idx+1}. Nama: \${r[6] || '-'} (\${r[7] || '-'})\nKehadiran: \${r[8] || '-'} | Seragam: \${r[9] || '-'} | Helm: \${r[10] || '-'}\nSepatu: \${r[11] || '-'} | Masker: \${r[12] || '-'} | Ear Plug: \${r[13] || '-'} | Kacamata: \${r[14] || '-'}\nKet: \${r[15] || '-'}\n\n\`;
        });
      }

      const replacements = {
        '<<Jam>>': jamString,
        '<<Tanggal>>': tglString,
        '<<Bagian>>': bagianString,
        '<<Waktu Shift>>': header[3] || '-',
        '<<Nama Insp 1>>': header[16] || '-',
        '<<Jabatan Insp 1>>': header[17] || '-',
        '<<Nama Insp 2>>': header[18] || '-',
        '<<Jabatan Insp 2>>': header[19] || '-',
        '<<Nama Insp 3>>': header[20] || '-',
        '<<Jabatan Insp 3>>': header[21] || '-',
        '<<DAFTAR_PERSONIL>>': personilStr
      };

      const images = {
        '<<TTD 1>>': ttd1 || '-',
        '<<TTD 2>>': ttd2 || '-',
        '<<TTD 3>>': ttd3 || '-',
        '<<Foto Proses Inspeksi>>': fotoProses || '-',
        '<<Foto Proses>>': fotoProses || '-'
      };
      
      try {
          console.log('Generating PDF APD TBP...');
          const res1 = await generatePdfFromTemplate(TEMPLATE_APD[0], folderId, replacements, 'W_APD_TBP', images);
          if (res1.success) pdfUrl = res1.pdfUrl;
          
          console.log('Generating PDF APD GPS...');
          const res2 = await generatePdfFromTemplate(TEMPLATE_APD[1], folderId, replacements, 'W_APD_GPS', images);
          if (res2.success) linkPdf2 = res2.pdfUrl;
      } catch (e) {
          console.error('Error generating APD PDF natively:', e);
      }
`;

code = code.replace(gasApdBlock, apdReplacement);

fs.writeFileSync('server/routes/inspections.ts', code);
console.log('Done!');
