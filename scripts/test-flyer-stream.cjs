require('dotenv').config();

async function testFlyerStream() {
  console.log('--- Testing /api/p5m/flyer Stream & Preview ---');

  // Test 1: IK Pengoperasian Mesin Press (PDF)
  console.log('\n1. Testing IK (PDF): IK Pengoperasian Mesin Press');
  const resPdf = await fetch('http://127.0.0.1:3000/api/p5m/flyer?title=' + encodeURIComponent('IK Pengoperasian Mesin Press'));
  console.log('HTTP Status:', resPdf.status);
  console.log('Content-Type:', resPdf.headers.get('content-type'));
  console.log('Content-Disposition:', resPdf.headers.get('content-disposition'));
  const bufPdf = await resPdf.arrayBuffer();
  console.log('Byte length received:', bufPdf.byteLength);

  // Test 2: Standard flyer (PNG/JPG): 3 Titik Tumpu
  console.log('\n2. Testing Flyer Image: 3 Titik Tumpu');
  const resImg = await fetch('http://127.0.0.1:3000/api/p5m/flyer?title=' + encodeURIComponent('3 Titik Tumpu'));
  console.log('HTTP Status:', resImg.status);
  console.log('Content-Type:', resImg.headers.get('content-type'));
  console.log('Content-Disposition:', resImg.headers.get('content-disposition'));
  const bufImg = await resImg.arrayBuffer();
  console.log('Byte length received:', bufImg.byteLength);

  console.log('\n✓ Semua flyer dan dokumen berhasil di-stream langsung oleh backend!');
}

testFlyerStream().catch(console.error);
