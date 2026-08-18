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
  
  try {
      // Modify generatePdfFromTemplate to NOT delete the temp doc so we can inspect it!
      // I will just copy the logic here to inspect it.
      const copyResponse = await drive.files.copy({
        fileId: docId,
        supportsAllDrives: true,
        requestBody: { name: `Temp_test_inspect` },
      });
      const tempDocId = copyResponse.data.id;
      
      const requests = [];
      const imageTagsMap = {};
      if (images && Object.keys(images).length > 0) {
        Object.keys(images).forEach((tag, idx) => {
          const uniqueTag = `IMGTAG${idx}`;
          imageTagsMap[uniqueTag] = { originalTag: tag, url: images[tag] };
          
          requests.push({
            replaceAllText: {
              containsText: { text: tag, matchCase: true },
              replaceText: uniqueTag,
            }
          });
        });
      }
      
      console.log("Requests:", JSON.stringify(requests, null, 2));
      
      if (requests.length > 0) {
        await docs.documents.batchUpdate({
          documentId: tempDocId,
          requestBody: { requests },
        });
      }
      
      const docRes = await docs.documents.get({ documentId: tempDocId });
      let hasImgTag = false;
      let hasFotoA = false;
      const content = docRes.data.body?.content || [];
      const searchElements = (elements) => {
        for (const el of elements) {
          if (el.paragraph) {
            for (const pEl of el.paragraph.elements) {
              if (pEl.textRun) {
                 if (pEl.textRun.content.includes('IMGTAG')) hasImgTag = true;
                 if (pEl.textRun.content.includes('FOTOA')) hasFotoA = true;
              }
            }
          } else if (el.table) {
            for (const row of el.table.tableRows) {
              for (const cell of row.tableCells) {
                if (cell.content) searchElements(cell.content);
              }
            }
          }
        }
      };
      searchElements(content);
      console.log("hasImgTag:", hasImgTag, "hasFotoA:", hasFotoA);
      
      await drive.files.delete({ fileId: tempDocId, supportsAllDrives: true });
  } catch(e) {
      console.error(e);
  }
}
run();
