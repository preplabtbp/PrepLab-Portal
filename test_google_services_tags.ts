import { drive, docs, generatePdfFromTemplate } from './google-services.ts';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const docId = '11tOGmxxLcnhE9WiHzI7O4Qya-iefb04at1ejXsIMPlI'; // TBP
  const folderId = '1EbAb6E54BxU52K-lJ1uTS9lwd8l3p8m3';
  
  const replacements = {
    '<<Nama Peserta>>': 'Budi Test'
  };
  const images = {
    '<<FOTOA>>': 'https://iili.io/CgLO5Mb.png' 
  };
  
  // We'll just run generatePdfFromTemplate
  try {
      const res = await generatePdfFromTemplate(docId, folderId, replacements, "Test_Output", images);
      console.log("Success:", res);
  } catch(e) {
      console.error(e);
  }
}
run();
