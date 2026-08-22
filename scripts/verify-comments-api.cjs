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
  console.log('Testing GET /api/bulletin/535/comments ...');
  const res = await fetchJson('http://localhost:3000/api/bulletin/535/comments');
  console.log('Status:', res.status, '| Total comments returned:', res.data.length);
  
  // Group by topic
  const byTopic = {};
  for (const c of res.data) {
    byTopic[c.topicTitle] = (byTopic[c.topicTitle] || 0) + 1;
  }
  console.log('\nComments per topic in Post 535:');
  console.table(byTopic);
}

main().catch(console.error);
