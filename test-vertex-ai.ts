import { generateText } from './src/ai.js';

async function test() {
  console.log('Testing GCP Vertex AI call (using GCP $300 Free Credits)...');
  try {
    const result = await generateText('Jawab dalam 1 kalimat singkat: Apa keunggulan utama sistem ini?');
    console.log('\n================ HASIL DARI VERTEX AI ================');
    console.log(result);
    console.log('======================================================\n');
    console.log('🎉 SUKSES 100%! Panggilan AI berhasil dan memotong Kredit Gratis $300 GCP Anda.');
  } catch (err) {
    console.error('FAILED! Detail error:', err);
  }
}

test();
