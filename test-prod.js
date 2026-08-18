import fetch from 'node-fetch';
const res = await fetch('http://localhost:3000/api/auth/check-nik', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nik: '04D25000045' })
});
console.log(res.status);
const text = await res.text();
console.log(text);
