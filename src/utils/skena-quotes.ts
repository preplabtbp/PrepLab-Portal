// Koleksi Quotes Penyemangat Skena & Aesthetic untuk Personil PrepLab Portal

export interface SkenaQuote {
  quote: string;
  tag: string;
  vibe: string;
}

export const SKENA_QUOTES: SkenaQuote[] = [
  {
    quote: "Kopi pagi udah masuk, playlist indie udah jalan. Waktunya gas shift hari ini tanpa overthinking.",
    tag: "Morning Vibe",
    vibe: "☕ Santai Tapi Fokus"
  },
  {
    quote: "Kerja rapi, APD komplit, vibes tetap estetik. Safety bukan beban, tapi lifestyle.",
    tag: "Safety Lifestyle",
    vibe: "🛡️ Safety First"
  },
  {
    quote: "Hidup itu kayak titrasi: butuh ketelitian, kesabaran, dan jangan sampai kelewatan titik ekuivalen.",
    tag: "Lab Philosophy",
    vibe: "🧪 Lab Wisdom"
  },
  {
    quote: "Prep sample setulus hati, rezeki dan masa depan cerah insyaAllah pasti mengikuti.",
    tag: "Semangat Kerja",
    vibe: "✨ Positive Energy"
  },
  {
    quote: "Jangan biarkan mood swing mengalahkan precision grinding. Fokus satu-satu, kelar semua.",
    tag: "Fokus & Flow",
    vibe: "🎯 Zero Mistake"
  },
  {
    quote: "Outfit lapangan boleh berdebu, tapi masa depan dan rezeki harus tetap glowing.",
    tag: "Self Reminder",
    vibe: "🌟 Glowing Future"
  },
  {
    quote: "Lebih baik lelah karena berjuang di lapangan daripada lelah karena overthinking masa depan.",
    tag: "Mindset",
    vibe: "💪 Fighter Mode"
  },
  {
    quote: "Shift pagi ceria, shift malam tenang. Apapun giliranmu hari ini, nikmati prosesnya.",
    tag: "Shift Harmony",
    vibe: "🌓 Daily Rhythm"
  },
  {
    quote: "Komunikasi dua arah di tim itu kunci, biar gak ada silent treatment di area operasional.",
    tag: "Team Synergy",
    vibe: "🤝 Solid Team"
  },
  {
    quote: "Ingat tujuan awal pas merantau ke sini. Setiap gram sample yang diprep adalah langkah menuju impianmu.",
    tag: "Big Dreams",
    vibe: "🚀 Dream Big"
  },
  {
    quote: "Tetap chill walau load sampel lagi rame. Tarik napas, minum air putih, lalu taklukkan!",
    tag: "Keep Calm",
    vibe: "🧊 Chill & Steady"
  },
  {
    quote: "Kerapian area kerja mencerminkan ketenangan pikiran. 5R jalan, hati pun lapang.",
    tag: "5R Culture",
    vibe: "🧹 Clean Space"
  },
  {
    quote: "Tiap hari adalah lembaran baru. Kesalahan kemarin adalah modul pembelajaran hari ini.",
    tag: "Growth Mindset",
    vibe: "🌱 Always Growing"
  },
  {
    quote: "Gak perlu validasi semua orang, yang penting kerjaanmu tuntas, presisi, dan selamat sampai rumah.",
    tag: "Stoic Vibe",
    vibe: "🧘 Stoic Energy"
  },
  {
    quote: "Safety helm terpasang, earplug rapat, masker siap. Siap guncang dunia lab hari ini!",
    tag: "Ready To Work",
    vibe: "⚡ High Energy"
  },
  {
    quote: "Kualitas hasil analisa bukan sekadar angka di kertas, tapi dedikasi dan integritas kita bersama.",
    tag: "Integrity",
    vibe: "💎 Pure Quality"
  },
  {
    quote: "Di balik data recovery yang akurat, ada kerja keras personil hebat yang gak kenal menyerah.",
    tag: "Appreciation",
    vibe: "👑 Great Work"
  },
  {
    quote: "Jangan lupa senyum ke rekan satu shift. Senyumanmu bisa jadi booster semangat mereka.",
    tag: "Good Vibe",
    vibe: "😊 Share Smiles"
  },
  {
    quote: "Slow living boleh, tapi kalau urusan SOP dan keselamatan tetap harus agile dan responsif.",
    tag: "Agile & Alert",
    vibe: "🏃 Dynamic Pace"
  },
  {
    quote: "Pekerjaan hari ini mungkin berat, tapi kopi sore dan istirahat malam nanti bakal terasa nikmat.",
    tag: "Reward Yourself",
    vibe: "🌅 Sweet Rest"
  },
  {
    quote: "Hidup ini dinamis seperti shaker sample, nikmati ritmenya dan tetap jaga keseimbangan.",
    tag: "Life Balance",
    vibe: "⚖️ Balance Life"
  },
  {
    quote: "Hasil maksimal lahir dari rutinitas yang konsisten. Terus melangkah, kamu sudah di jalur yang benar.",
    tag: "Consistency",
    vibe: "🔥 Consistency"
  },
  {
    quote: "Jangan bandingkan progresmu dengan orang lain. Kecepatan tiap orang beda, yang penting terus maju.",
    tag: "Self Pace",
    vibe: "🚀 My Own Pace"
  },
  {
    quote: "Semangat menjemput rezeki berkah hari ini. Keluarga di rumah menanti senyum kepulanganmu.",
    tag: "For Family",
    vibe: "🏡 Family First"
  },
  {
    quote: "Akurasi tinggi dimulai dari fokus yang terjaga. Singkirkan distraksi, hadapi tantangan!",
    tag: "Precision",
    vibe: "🎯 Hyper Focus"
  }
];

// Hash function deterministik sederhana berdasarkan (userKey + dateKey)
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export function getDailySkenaQuote(userIdentifier: string = 'user', customDate?: string): SkenaQuote {
  const dateStr = customDate || new Date().toISOString().split('T')[0];
  const seed = `${userIdentifier.trim().toLowerCase()}_${dateStr}`;
  const hash = hashCode(seed);
  const index = hash % SKENA_QUOTES.length;
  return SKENA_QUOTES[index];
}
