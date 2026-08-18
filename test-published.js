import fetch from 'node-fetch';

async function run() {
  const url = 'https://ais-pre-muvehhpbnl75ztcrfg3gmc-214178841586.asia-southeast1.run.app/api/auth/check-nik';
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Mock cookie just in case it works without the full flow
      'Cookie': '__SECURE-aistudio_auth_flow_may_set_cookies=true; GAESA=mock'
    },
    body: JSON.stringify({ nik: '04D25000045' })
  });
  
  console.log(res.status);
  const text = await res.text();
  console.log(text.substring(0, 500));
}

run();
