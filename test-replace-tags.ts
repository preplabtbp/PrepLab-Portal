import { drive, docs } from './google-services.ts';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const docId = '11tOGmxxLcnhE9WiHzI7O4Qya-iefb04at1ejXsIMPlI'; // TBP
  const copyResponse = await drive.files.copy({
    fileId: docId,
    supportsAllDrives: true,
    requestBody: { name: `Temp_test_replace` },
  });
  const tempDocId = copyResponse.data.id;
  
  // replace with same text
  await docs.documents.batchUpdate({
    documentId: tempDocId,
    requestBody: {
      requests: [{
        replaceAllText: {
          containsText: { text: '<<FOTOA>>', matchCase: true },
          replaceText: '<<FOTOA>>',
        }
      }]
    }
  });
  
  const res1 = await docs.documents.get({ documentId: tempDocId });
  let found = false;
  const search1 = (elements) => {
    for (const el of elements) {
      if (el.paragraph) {
        for (const pel of el.paragraph.elements) {
          if (pel.textRun && pel.textRun.content.includes('<<FOTOA>>')) found = true;
        }
      } else if (el.table) {
        for (const row of el.table.tableRows) {
          for (const cell of row.tableCells) {
             if (cell.content) search1(cell.content);
          }
        }
      }
    }
  };
  search1(res1.data.body?.content || []);
  console.log("Found <<FOTOA>> as single textRun:", found);

  await drive.files.delete({ fileId: tempDocId });
}
run();
