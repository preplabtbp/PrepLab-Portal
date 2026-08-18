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
    '<<FOTOA>>': 'https://drive.google.com/uc?export=download&id=1t3gqU1B15j7wR7F_2J9T6p5zN8W7G4uE' // just a dummy or real? Let's see
  };
  
  // We'll just run it and not delete tempDoc to see it.
  
  // 1. Duplikasi Template
  const copyResponse = await drive.files.copy({
    fileId: docId,
    supportsAllDrives: true,
    requestBody: {
      name: `Temp_test`,
    },
  });
  
  const tempDocId = copyResponse.data.id;
  console.log("Created temp doc:", tempDocId);
  
  const requests = Object.entries(replacements).map(([tag, value]) => ({
    replaceAllText: {
      containsText: { text: tag, matchCase: true },
      replaceText: value || '-',
    },
  }));
  
  Object.keys(images).forEach((tag) => {
    requests.push({
      replaceAllText: {
        containsText: { text: tag, matchCase: true },
        replaceText: tag,
      }
    });
  });
  
  await docs.documents.batchUpdate({
    documentId: tempDocId,
    requestBody: { requests },
  });
  
  const docRes = await docs.documents.get({ documentId: tempDocId });
  const content = docRes.data.body?.content || [];
  
  const foundTags = [];
  const search = (elements) => {
    for (const el of elements) {
      if (el.paragraph) {
        for (const pEl of el.paragraph.elements) {
          if (pEl.textRun && pEl.textRun.content) {
            const text = pEl.textRun.content;
            if (text.includes('FOTOA')) {
               console.log("Found text containing FOTOA:", JSON.stringify(text));
               const index = text.indexOf('<<FOTOA>>');
               if (index !== -1) {
                  foundTags.push({
                     tag: '<<FOTOA>>',
                     startIndex: pEl.startIndex! + index,
                     endIndex: pEl.startIndex! + index + '<<FOTOA>>'.length
                  });
               }
            }
          }
        }
      } else if (el.table) {
        for (const row of el.table.tableRows) {
          for (const cell of row.tableCells) {
             if (cell.content) search(cell.content);
          }
        }
      }
    }
  };
  search(content);
  console.log("foundTags:", foundTags);
  
  if (foundTags.length > 0) {
      const imgRequests = [];
      const item = foundTags[0];
      imgRequests.push({
         insertInlineImage: {
            uri: 'https://images.unsplash.com/photo-1575936123452-b67c3203c357?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aW1hZ2V8ZW58MHx8MHx8fDA%3D&w=1000&q=80',
            location: { index: item.startIndex },
            objectSize: { width: { magnitude: 200, unit: 'PT' } }
         }
      });
      imgRequests.push({
         deleteContentRange: {
            range: { startIndex: item.startIndex + 1, endIndex: item.endIndex + 1 }
         }
      });
      
      try {
        await docs.documents.batchUpdate({
          documentId: tempDocId,
          requestBody: { requests: imgRequests },
        });
        console.log("Successfully inserted image and deleted text.");
      } catch (err) {
        console.error("Batch update failed:", err.message);
      }
  }
}
run();
