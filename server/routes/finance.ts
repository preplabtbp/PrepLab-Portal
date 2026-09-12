import { Router } from 'express';
import { db } from '../../src/db/index.js';
import { financeTransactions } from '../../src/db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const financeRouter = Router();

// Helper to generate short random code like #LUEBOBA
function generateTxCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '#LUE';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 1. Scan Receipt Image using Gemini AI Vision
financeRouter.post('/api/finance/scan-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Data foto struk (imageBase64) wajib diisi!' });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!geminiKey && !anthropicKey && !openaiKey) {
      return res.status(500).json({ error: 'Belum ada API Key AI yang dikonfigurasi (ANTHROPIC_API_KEY, GEMINI_API_KEY, atau OPENAI_API_KEY).' });
    }

    // Clean base64 data URL prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `Tolong scan dan ekstraksi data transaksi dari gambar struk belanjaan atau mutasi pembayaran ini.
PENTING: Uraikan SETIAP ITEM PRODUK secara terpisah (bukan hanya total akhir keseluruhan struk).

Kembalikan jawaban HANYA DALAM FORMAT JSON MURNI sesuai skema berikut (tanpa tanda markdown \`\`\`json atau teks pengantar):
{
  "tanggal": "YYYY-MM-DD",
  "namaToko": "Nama Toko / Merchant (misal: Rahmatika Freshmart, Indomaret, dsb)",
  "metodePembayaran": "Tunai" | "Transfer" | "QRIS" | "Kartu",
  "items": [
    {
      "namaProduk": "NAMA BARANG / ITEM",
      "kategori": "#Makanan" | "#Peralatan" | "#Operasional" | "#Transportasi" | "#Lainnya",
      "harga": 18500,
      "jumlah": 1
    }
  ]
}

Aturan parsing:
1. "harga" harus berupa angka murni integer tanpa Rp, titik, atau koma.
2. Jika tanggal tidak tertulis jelas di struk, gunakan tanggal hari ini (${new Date().toISOString().split('T')[0]}).
3. Jika metode pembayaran tidak tertulis, gunakan "Tunai".
4. Kategori dipilih yang paling relevan dari pilihan: #Makanan, #Peralatan, #Operasional, #Transportasi, #Lainnya.`;

    // Scan using AI Vision API (routr.cloud)
    const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.routr.cloud/v1').replace(/\/+$/, '');
    const apiKey = process.env.OPENAI_API_KEY || 'sk-ngw_ABLQuruepV8_gUcbdTltCoaoGTnbHaXPRqbp7o5gF6w';
    const models = ['claude-sonnet-4.6', 'kimi-k3', 'gpt-5.6-luna'];
    const imgDataUrl = `data:${mimeType || 'image/jpeg'};base64,${cleanBase64}`;

    let responseText = '';
    let lastError: any = null;

    for (const m of models) {
      try {
        const aiRes = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: m,
            messages: [
              {
                role: 'system',
                content: 'Kamu adalah parser struk AI otomatis. Kamu HARUS SELALU mengembalikan respon HANYA dalam format JSON valid tanpa format markdown (```json), tanpa teks pembuka, dan tanpa teks penutup.'
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  {
                    type: 'image_url',
                    image_url: { url: imgDataUrl }
                  }
                ]
              }
            ]
          })
        });

        const aiData: any = await aiRes.json();
        if (aiRes.ok && aiData.choices?.[0]?.message?.content) {
          responseText = aiData.choices[0].message.content;
          console.log(`[Finance AI] Berhasil memindai struk dengan model: ${m}`);
          break;
        } else {
          console.warn(`[Finance AI] Model ${m} gagal:`, aiData.error?.message || aiData);
          lastError = aiData.error?.message || JSON.stringify(aiData);
        }
      } catch (openaiErr: any) {
        console.warn(`[Finance AI] Error pada model ${m}:`, openaiErr.message);
        lastError = openaiErr.message;
      }
    }

    if (!responseText) {
      return res.status(500).json({ 
        error: `Gagal memindai struk dengan AI Vision: ${lastError || 'Tidak ada respon dari server AI'}` 
      });
    }
    
    // Parse JSON safely
    let parsedData: any = null;
    try {
      let cleanedJsonText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const match = cleanedJsonText.match(/\{[\s\S]*\}/);
      if (match) cleanedJsonText = match[0];
      parsedData = JSON.parse(cleanedJsonText);
    } catch (parseErr) {
      console.error("Error parsing AI JSON output:", responseText);
      return res.status(500).json({ 
        error: 'Gagal mengurai respons AI. Pastikan foto struk terlihat jelas.',
        rawText: responseText 
      });
    }

    // Attach generated unique codes
    const dateStr = parsedData.tanggal || new Date().toISOString().split('T')[0];
    const storeName = parsedData.namaToko || 'Toko / Merchant';
    const payMethod = parsedData.metodePembayaran || 'Tunai';
    const items = (parsedData.items || []).map((it: any) => ({
      transactionCode: generateTxCode(),
      date: dateStr,
      itemTitle: String(it.namaProduk || 'Item Belanja').trim(),
      merchantName: storeName,
      category: String(it.kategori || '#Makanan').trim(),
      paymentMethod: payMethod,
      amount: Math.abs(parseInt(it.harga || 0, 10)) || 0,
      qty: Math.max(1, parseInt(it.jumlah || 1, 10))
    }));

    res.json({
      success: true,
      message: `Berhasil mencatat ${items.length} transaksi dari gambar!`,
      date: dateStr,
      merchantName: storeName,
      paymentMethod: payMethod,
      itemsCount: items.length,
      items
    });

  } catch (err: any) {
    console.error('Error in scan-receipt route:', err);
    res.status(500).json({ error: err.message || 'Gagal memindai foto struk dengan AI Vision' });
  }
});

// 2. Save Transactions (Single or Batch)
financeRouter.post('/api/finance/transactions', async (req, res) => {
  try {
    const { transactions, createdByNik, createdByName } = req.body;
    const txList = Array.isArray(transactions) ? transactions : [req.body];

    if (txList.length === 0) {
      return res.status(400).json({ error: 'Daftar transaksi tidak boleh kosong!' });
    }

    const inserted: any[] = [];
    for (const item of txList) {
      const newTx = await db.insert(financeTransactions).values({
        transactionCode: item.transactionCode || generateTxCode(),
        date: item.date || new Date().toISOString().split('T')[0],
        itemTitle: String(item.itemTitle || item.namaProduk || 'Item Belanja').trim(),
        merchantName: String(item.merchantName || item.namaToko || 'Toko').trim(),
        category: String(item.category || item.kategori || '#Makanan').trim(),
        paymentMethod: String(item.paymentMethod || item.metodePembayaran || 'Tunai').trim(),
        amount: Math.abs(parseInt(item.amount || item.harga || 0, 10)) || 0,
        qty: Math.max(1, parseInt(item.qty || item.jumlah || 1, 10)),
        notes: item.notes || null,
        receiptPhotoUrl: item.receiptPhotoUrl || null,
        createdByNik: createdByNik || item.createdByNik || 'system',
        createdByName: createdByName || item.createdByName || 'Pengguna'
      }).returning();

      inserted.push(newTx[0]);
    }

    res.json({
      success: true,
      message: `Berhasil menyimpan ${inserted.length} transaksi keuangan!`,
      data: inserted
    });
  } catch (err: any) {
    console.error('Error saving transactions:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Get Transactions List with Filter
financeRouter.get('/api/finance/transactions', async (req, res) => {
  try {
    const { search, category, startDate, endDate } = req.query;

    const all = await db.select().from(financeTransactions).orderBy(desc(financeTransactions.createdAt));

    let filtered = all;
    if (search) {
      const s = String(search).toLowerCase();
      filtered = filtered.filter(t => 
        (t.itemTitle && t.itemTitle.toLowerCase().includes(s)) ||
        (t.merchantName && t.merchantName.toLowerCase().includes(s)) ||
        (t.transactionCode && t.transactionCode.toLowerCase().includes(s)) ||
        (t.category && t.category.toLowerCase().includes(s))
      );
    }

    if (category && category !== 'ALL') {
      filtered = filtered.filter(t => t.category === category);
    }

    if (startDate) {
      filtered = filtered.filter(t => t.date >= String(startDate));
    }
    if (endDate) {
      filtered = filtered.filter(t => t.date <= String(endDate));
    }

    res.json({
      success: true,
      totalCount: filtered.length,
      data: filtered
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update / Edit Transaction (Edit Harga, Nama, Kategori, dll)
financeRouter.put('/api/finance/transactions/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID tidak valid' });

    const { itemTitle, amount, category, merchantName, paymentMethod, date, notes, qty } = req.body;

    const updatePayload: any = {
      updatedAt: new Date()
    };

    if (itemTitle !== undefined) updatePayload.itemTitle = String(itemTitle).trim();
    if (amount !== undefined) updatePayload.amount = Math.abs(parseInt(amount, 10)) || 0;
    if (category !== undefined) updatePayload.category = String(category).trim();
    if (merchantName !== undefined) updatePayload.merchantName = String(merchantName).trim();
    if (paymentMethod !== undefined) updatePayload.paymentMethod = String(paymentMethod).trim();
    if (date !== undefined) updatePayload.date = String(date).trim();
    if (notes !== undefined) updatePayload.notes = notes;
    if (qty !== undefined) updatePayload.qty = Math.max(1, parseInt(qty, 10));

    const updated = await db.update(financeTransactions)
      .set(updatePayload)
      .where(eq(financeTransactions.id, id))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }

    res.json({
      success: true,
      message: 'Transaksi berhasil diperbarui!',
      data: updated[0]
    });
  } catch (err: any) {
    console.error('Error updating transaction:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Delete Transaction
financeRouter.delete('/api/finance/transactions/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID tidak valid' });

    await db.delete(financeTransactions).where(eq(financeTransactions.id, id));
    res.json({ success: true, message: 'Catatan transaksi berhasil dihapus!' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Financial Summary & Statistics
financeRouter.get('/api/finance/summary', async (req, res) => {
  try {
    const all = await db.select().from(financeTransactions);

    let totalAmount = 0;
    const categoryTotals: Record<string, number> = {};
    const merchantTotals: Record<string, number> = {};

    all.forEach(t => {
      const amt = t.amount || 0;
      totalAmount += amt;

      const cat = t.category || '#Lainnya';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;

      const merch = t.merchantName || 'Lainnya';
      merchantTotals[merch] = (merchantTotals[merch] || 0) + amt;
    });

    // Top Category
    let topCategory = '-';
    let maxCatAmt = 0;
    Object.entries(categoryTotals).forEach(([cat, amt]) => {
      if (amt > maxCatAmt) {
        maxCatAmt = amt;
        topCategory = cat;
      }
    });

    res.json({
      success: true,
      totalSpent: totalAmount,
      totalItems: all.length,
      topCategory,
      categoryTotals,
      merchantTotals
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
