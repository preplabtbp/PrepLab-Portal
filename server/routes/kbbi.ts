import { Router } from 'express';

export const kbbiRouter = Router();

const KBBI_SYSTEM_PROMPT = `Kamu adalah Pakar Bahasa Indonesia (KBBI) & Standardisasi Laporan Maintenance Pabrik Preparasi & Laboratorium Nikel (PrepLab).
Tugas kamu adalah memperbaiki teks laporan deskripsi kerusakan dari teknisi/pengawas agar:
1. Memakai kata baku sesuai KBBI (misal: "ofen" / "open" -> "oven", "fentilasi" -> "ventilasi", "facum" -> "vakum", "valv" -> "valve", "kwalitas" -> "kualitas", "analisa" -> "analisis").
2. Membedakan istilah operasional dengan tepat:
   - "manhaul" adalah kendaraan / bus angkutan operasional personel tambang.
   - "manhole" adalah lubang inspeksi tangki kompresor, bejana tekan, atau cerobong.
3. Memperbaiki typo dan istilah slang lapangan menjadi bahasa teknis yang jelas, ringkas, dan mudah dipahami teknisi maintenance.
4. PENTING: Kembalikan HANYA teks hasil koreksi kalimat langsung. JANGAN tambahkan penjelasan pembuka, penutup, atau tanda kutip.`;

// POST /api/kbbi/refine
kbbiRouter.post('/api/kbbi/refine', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Teks wajib diisi!' });
    }

    // Gunakan provider AI selain Gemini dan OpenAI (Routr Cloud & Bandelbanget via ROUTR/BANDELBANGET API KEY)
    const routrKey = process.env.ROUTR_API_KEY || '';
    const routrUrl = (process.env.ROUTR_BASE_URL || 'https://api.routr.cloud/v1').replace(/\/+$/, '');

    const chatProviders = [
      {
        name: 'Routr Cloud (GLM-5.3)',
        baseUrl: routrUrl,
        apiKey: routrKey,
        model: 'glm-5.3'
      },
      {
        name: 'Routr Cloud (Claude)',
        baseUrl: routrUrl,
        apiKey: routrKey,
        model: 'claude-sonnet-4.6'
      },
      {
        name: 'Bandelbanget',
        baseUrl: (process.env.BANDELBANGET_BASE_URL || 'https://bandelbanget.xyz/v1').replace(/\/+$/, ''),
        apiKey: process.env.BANDELBANGET_API_KEY || '',
        model: 'deepseek-chat'
      }
    ].filter(p => !!p.apiKey);

    if (chatProviders.length === 0) {
      return res.status(500).json({ error: 'Tidak ada API Key (ROUTR_API_KEY atau BANDELBANGET_API_KEY) yang terkonfigurasi.' });
    }

    const messages = [
      { role: 'system', content: KBBI_SYSTEM_PROMPT },
      { role: 'user', content: `Koreksi dan bakukan teks kerusakan ini sesuai KBBI & standar maintenance:\n\n"${text.trim()}"` }
    ];

    let lastError: any = null;

    for (const p of chatProviders) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const aiRes = await fetch(`${p.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${p.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: p.model,
            messages,
            temperature: 0.2,
            max_tokens: 1200
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!aiRes.ok) {
          throw new Error(`[${p.name}] HTTP ${aiRes.status}`);
        }

        const aiData: any = await aiRes.json();
        const reply = aiData.choices?.[0]?.message?.content?.trim();

        if (reply) {
          // Bersihkan tanda kutip pembungkus jika ada
          const cleanReply = reply.replace(/^["']|["']$/g, '').trim();
          return res.json({
            success: true,
            correctedText: cleanReply,
            provider: p.name,
            model: p.model
          });
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[KBBI AI Refine] Provider ${p.name} gagal, mencoba fallback berikutnya:`, err.message);
      }
    }

    throw lastError || new Error('Gagal mendapatkan respon dari provider AI');
  } catch (err: any) {
    console.error('[KBBI AI Refine] Error:', err);
    res.status(500).json({ error: err.message || 'Gagal memproses koreksi AI' });
  }
});
