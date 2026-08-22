const http = require('http');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Testing Bulletin API /api/bulletin?pt=TBP ...');
  const tbpRes = await fetchJson('http://localhost:3000/api/bulletin?pt=TBP');
  console.log(`TBP Posts Count: ${tbpRes.data.length}`);
  const tbpGtsCount = tbpRes.data.filter(p => p.notionId && p.notionId.startsWith('135d00c5')).length;
  console.log(`GTS Posts mixed into TBP: ${tbpGtsCount} (MUST BE 0)`);

  const tbpNonRoutineLab = tbpRes.data.find(p => p.title === 'Non Routine Laboratorium');
  console.log('TBP Non Routine Laboratorium Post found:', tbpNonRoutineLab ? {
    id: tbpNonRoutineLab.id,
    title: tbpNonRoutineLab.title,
    universe: tbpNonRoutineLab.universe,
    pt: tbpNonRoutineLab.pt,
    contentLen: tbpNonRoutineLab.content?.length
  } : 'NOT FOUND');

  console.log('\nTesting Bulletin API /api/bulletin?pt=GTS ...');
  const gtsRes = await fetchJson('http://localhost:3000/api/bulletin?pt=GTS');
  console.log(`GTS Posts Count: ${gtsRes.data.length}`);
  const gtsTbpCount = gtsRes.data.filter(p => p.notionId && !p.notionId.startsWith('135d00c5')).length;
  console.log(`TBP Posts mixed into GTS: ${gtsTbpCount} (MUST BE 0)`);
}

main().catch(console.error);
