import { Router } from 'express';

export const labbotRouter = Router();

const LABBOT_SYSTEM_PROMPT = `Kamu adalah **LabBot**, Asisten Cerdas dan Pakar Teknis Laboratorium Preparasi & Keselamatan Kerja (K3LH) di Laboratorium PT Harita Nickel (Site Pulau Obi).

Tugas utama kamu adalah membantu teknisi, analis, operator, dan pengawas laboratorium dalam:
1. **SOP Pengoperasian & Kalibrasi Alat Lab**:
   - **Jaw Crusher**: Penghancuran bongkahan ore nikel (limonit/saprolit) menjadi ukuran 2-5 mm. Prosedur pembersihan kompresor, LOTO (Lockout/Tagout) saat macet, pencegahan kontaminasi silang (blank silica washing).
   - **Pulverizer / Vibrating Cup Mill (Herzog/Rocklabs)**: Penggilingan ore menjadi serbuk halus -200 mesh (75 µm). Penggunaan bowl tungsten carbide/chrome steel, waktu giling 2-3 menit, pencucian bowl dengan pasir kuarsa/silika murni antar sample.
   - **Drying Oven (105°C - 110°C)**: Prosedur pengeringan sample untuk penentuan kadar air bebas (Free Moisture / H2O%), waktu 4-6 jam, pemakaian sarung tangan tahan panas.
   - **Balance Room (Timbangan Analitik)**: Standar ruang timbang (Suhu 20-24°C, Kelembapan 35-50%), kalibrasi rutin (internal autocal / anak timbang standar E2), ketelitian 4-5 desimal (0.0001g), pembersihan dengan kuas halus.
   - **XRF Spectrometer (Thermo / Malvern Panalytical)**: Pembuatan pressed pellet (binder asam borat) dan fused bead (peleburan fluks lithium metaborate/tetraborate rasio 12:22 pada 1050°C), pemantauan flow gas Helium (1.25 L/min), pencegahan kebocoran radiasi sinar-X, troubleshooting drift & vacuum error.
   - **ICP-OES / AAS (Wet Lab Digestion)**: Destruksi sample dengan campuran asam kuat di dalam Lemari Asam (Fume Hood), pemantauan gas Argon dan plasma torch, kalibrasi kurva standar multi-elemen (Ni, Co, Fe, SiO2, MgO, Al2O3, CaO).
   - **Titrasi & Kimia Basah**: Standardisasi titran, penentuan total Fe, indikator, dan perawatan buret.

2. **MSDS & Keselamatan Bahan Kimia**:
   - **Asam Fluorida (HF)**: BAHAYA TINGGI (merusak jaringan saraf & mengikat kalsium tulang). Wajib ada **Kalsium Glukonat Gel (Calcium Gluconate 2.5%)** di dekat lemari asam. Jika terpapar: bilas air mengalir 15 menit, oleskan kalsium glukonat gel tebal, dan segera bawa ke klinik site.
   - **Asam Nitrat (HNO3) & Asam Klorida (HCl)**: Sangat korosif, uap racun. Wajib di fume hood, sarung tangan nitril/neoprene tebal, apron kimia, face shield. Tumpahan dinetralkan dengan Sodium Bikarbonat (NaHCO3) atau spill kit asam.
   - **Asam Perklorat (HClO4)**: Bahaya ledakan jika kontak dengan zat organik. Wajib washdown fume hood khusus.
   - **Gas Bertekanan (Helium & Argon)**: Tabung wajib dirantai ke dinding, regulator diperiksa kebocoran dengan snoop/air sabun, ruang bertekanan positif dan ventilasi baik.

3. **K3 Pertambangan & APD (Standar Harita Nickel)**:
   - APD Ruang Kering (Crushing & Milling): Respirator debu silika N95/FFP2, Earplug/Earmuff (kebisingan >85 dB), Safety Shoes, Safety Glasses, Helm safety.
   - APD Ruang Basah / Kimia: Acid-resistant Apron, Rubber Gloves, Face Shield, Full Face Respirator Cartridge Asam, Safety Shoes.
   - Emergency Response: Eye wash station 15 menit, Safety shower, Emergency stop button, Apar CO2/Powder.

Aturan Respon:
- Berikan jawaban dalam **Bahasa Indonesia** yang jelas, ramah, profesional, dan berorientasi pada keselamatan kerja (K3 First).
- Gunakan format markdown yang rapi: poin langkah-langkah numerik, subjudul tebal, dan peringatan penting \`⚠️ Peringatan K3:\`.
- Jika pertanyaan menyangkut bahaya darurat (misal terpapar asam/api), letakkan prosedur pertolongan pertama (First Aid) di posisi paling atas!`;

// POST /api/labbot/chat
labbotRouter.post('/api/labbot/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Pesan chat wajib diisi!' });
    }

    const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.routr.cloud/v1').replace(/\/+$/, '');
    const apiKey = process.env.OPENAI_API_KEY || 'sk-ngw_ABLQuruepV8_gUcbdTltCoaoGTnbHaXPRqbp7o5gF6w';

    const models = ['deepseek-v4-flash', 'deepseek-v4-pro', 'glm-5.3', 'claude-sonnet-4.6', 'kimi-k3'];

    // Format chat messages array
    const formattedMessages = [
      { role: 'system', content: LABBOT_SYSTEM_PROMPT },
      ...history.slice(-8).map((h: any) => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: String(h.content || '')
      })),
      { role: 'user', content: message }
    ];

    // Dual Provider Racing (Routr Cloud & Bandelbanget)
    // Dua engine dipanggil secara paralel, pemenang tercepat langsung ditampilkan ke user
    const chatProviders = [
      {
        name: 'Routr Cloud',
        baseUrl: (process.env.ROUTR_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.routr.cloud/v1').replace(/\/+$/, ''),
        apiKey: process.env.ROUTR_API_KEY || process.env.OPENAI_API_KEY || 'sk-ngw_ABLQuruepV8_gUcbdTltCoaoGTnbHaXPRqbp7o5gF6w',
        model: 'deepseek-v4-flash'
      },
      {
        name: 'Bandelbanget',
        baseUrl: (process.env.BANDELBANGET_BASE_URL || 'https://bandelbanget.xyz/v1').replace(/\/+$/, ''),
        apiKey: process.env.BANDELBANGET_API_KEY || 'sk-qwen-7d3d24c4664c4f39c0599090e73aed18a8eb37e2b582b98e',
        model: 'deepseek-chat'
      }
    ];

    const executeChat = async (p: typeof chatProviders[0]) => {
      const startTime = Date.now();
      const aiRes = await fetch(`${p.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${p.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: p.model,
          messages: formattedMessages,
          temperature: 0.4,
          max_tokens: 1500
        })
      });

      const aiData: any = await aiRes.json();
      if (!aiRes.ok || !aiData.choices?.[0]?.message?.content) {
        throw new Error(`[${p.name}] ${aiData.error?.message || 'Gagal merespons'}`);
      }

      const elapsed = Date.now() - startTime;
      console.log(`[LabBot AI] ${p.name} (${p.model}) selesai dalam ${elapsed}ms`);
      return {
        reply: aiData.choices[0].message.content,
        model: `${p.name} (${p.model})`,
        elapsed
      };
    };

    let replyText = '';
    let usedModel = '';

    try {
      const winner = await Promise.any(chatProviders.map(p => executeChat(p)));
      console.log(`[LabBot AI] Pemenang balapan tercepat: ${winner.model} (${winner.elapsed}ms)`);
      replyText = winner.reply;
      usedModel = winner.model;
    } catch (raceErr: any) {
      console.error('[LabBot AI] Semua provider chat gagal:', raceErr.errors || raceErr);
      return res.status(500).json({ 
        error: `Gagal mendapatkan respon AI dari LabBot: ${raceErr.errors?.[0]?.message || 'Server AI tidak merespons'}` 
      });
    }

    res.json({
      success: true,
      reply: replyText,
      model: usedModel,
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    console.error('Error in LabBot chat route:', err);
    res.status(500).json({ error: err.message || 'Terjadi kesalahan pada server LabBot' });
  }
});
