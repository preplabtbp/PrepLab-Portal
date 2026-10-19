import { Router } from "express";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { db } from "../../src/db/index.js";
import { eq, desc, sql, and, like, or, lte, gte, inArray } from "drizzle-orm";
import { employees, roster, p5mMateri, p5mSchedules, notifications } from "../../src/db/schema.js";
import { Client } from "@notionhq/client";
import { drive } from "../../google-services.js";
import { sendWebPush } from "../utils.js";

export const p5mRouter = Router();

// ============================================================
// NOTION DATABASE INTEGRATION (ID: 207d00c5-c809-800c-bf51-ea4e5111bf3f)
// ============================================================
const NOTION_PAGE_ID = "207d00c5-c809-800c-bf51-ea4e5111bf3f";

function classifyTopic(title: string) {
  const t = title.toLowerCase().trim();

  // 1. Jenis Dokumen: Health, Safety, IK, JSA, SOP, Kebijakan, IBPR, IADL, Senam
  let jenis = 'Safety';

  if (/\bsenam\b/i.test(t)) {
    jenis = 'Senam';
  } else if (/\bibpr\b/i.test(t) || t.includes('identifikasi bahaya') || t.includes('penilaian risiko') || t.includes('hiradc')) {
    jenis = 'IBPR';
  } else if (/\biadl\b/i.test(t) || t.includes('aspek dampak lingkungan')) {
    jenis = 'IADL';
  } else if (/\bjsa\b/i.test(t) || t.includes('job safety analysis')) {
    jenis = 'JSA';
  } else if (/\bsop\b/i.test(t) || t.includes('standar operasional') || t.includes('prosedur operasi')) {
    jenis = 'SOP';
  } else if (/\b(sds|msds)\b/i.test(t) || t.includes('safety data sheet') || t.includes('lembar data keselamatan')) {
    jenis = 'SDS';
  } else if (/\bik\b/i.test(t) || t.includes('instruksi kerja') || t.includes('flow sheet') || t.includes('flowsheet')) {
    jenis = 'IK';
  } else if (t.includes('kebijakan') || t.includes('policy') || t.includes('peraturan perusahaan')) {
    jenis = 'Kebijakan';
  } else if (
    t.includes('ramadhan') || t.includes('puasa') || t.includes('insomnia') ||
    t.includes('diare') || t.includes('osteoporosis') || t.includes('dehidrasi') ||
    t.includes('hiv') || t.includes('gula') || t.includes('batuk') || t.includes('gigi') ||
    t.includes('hipertensi') || t.includes('jantung') || t.includes('makan') ||
    t.includes('dyspepsia') || t.includes('mcu') || t.includes('tembakau') ||
    t.includes('mental') || t.includes('scabies') || t.includes('pancaroba') ||
    t.includes('nipah') || t.includes('faringitis') || t.includes('flu') ||
    t.includes('sengatan panas') || t.includes('sehat') || t.includes('penyakit')
  ) {
    jenis = 'Health';
  } else {
    jenis = 'Safety';
  }

  // 2. Section: Preparation, Laboratory, Maintenance, Inventory Control, Quality Assurance, Administration, General
  let section = 'General';

  if (
    t.includes('inventory') || t.includes('gudang') || t.includes('warehouse') ||
    t.includes('sparepart') || t.includes('spare part') || t.includes('penyimpanan bahan kimia') ||
    /\bic\b/i.test(t)
  ) {
    section = 'Inventory Control';
  } else if (
    t.includes('pengelasan') || t.includes('welding') || t.includes('las') ||
    t.includes('gerinda') || t.includes('cutting plasma') || t.includes('plasma cutting') ||
    t.includes('pengerutan kayu') || t.includes('instalasi listrik') || t.includes('listrik') ||
    t.includes('kelistrikan') || t.includes('panel listrik') || t.includes('wiring') ||
    t.includes('dust collector') || t.includes('ducting') || t.includes('maintenance') ||
    t.includes('perawatan') || t.includes('lubrikasi') || t.includes('genset') ||
    t.includes('kompresor') || t.includes('kompressor') || t.includes('loto') ||
    t.includes('kegagalan rem') || t.includes('alat berat') || t.includes('dashcam') ||
    t.includes('parkir') || t.includes('unit') || t.includes('driving') ||
    t.includes('blind spot') || t.includes('manuver') || t.includes('bengkel') ||
    t.includes('workshop') || t.includes('pompa') || t.includes('bearing') ||
    t.includes('mekanik')
  ) {
    section = 'Maintenance';
  } else if (
    t.includes('laboratorium') || t.includes('lab') || t.includes('fusion') ||
    t.includes('fused bead') || t.includes('xrf') || t.includes('aas') ||
    t.includes('neraca') || t.includes('timbangan digital') || t.includes('titrasi') ||
    t.includes('loi') || t.includes('gravimetri') || t.includes('reagen') ||
    t.includes('asam') || t.includes('press powder') || t.includes('press/timbang') ||
    t.includes('analitik') || t.includes('kalibrasi') || t.includes('crm') ||
    t.includes('standar baku') || t.includes('chiller') || t.includes('radiasi') ||
    t.includes('desikator') || t.includes('muffle furnace') || t.includes('ultrasonic') ||
    t.includes('polishing mould') || t.includes('platinum ware') || t.includes('fume hood') ||
    t.includes('scrubber') || t.includes('ups emmerich') || t.includes('argon') ||
    t.includes('helium') || t.includes('sds buffer') || t.includes('buffer ph') ||
    t.includes('flux') || t.includes('iadl laboratory')
  ) {
    section = 'Laboratory';
  } else if (
    t.includes('preparasi') || t.includes('prep') || t.includes('jaw crusher') ||
    t.includes('pulverizer') || t.includes('cup mill') || t.includes('drying') ||
    t.includes('moisture') || t.includes('quartering') || t.includes('splitting') ||
    t.includes('double roll') || t.includes('remainder') || t.includes('sieve') ||
    t.includes('shaker') || t.includes('mixer') || t.includes('oven kontainer') ||
    t.includes('ayakan') || t.includes('sieving') || t.includes('artco') ||
    t.includes('sampel basah') || t.includes('sample basah') || t.includes('sampel kering') ||
    t.includes('sample kering') || t.includes('screen test') || t.includes('dump truck') ||
    t.includes('iadl preparation')
  ) {
    section = 'Preparation';
  } else if (
    t.includes('quality assurance') || t.includes('qa') || t.includes('qc') ||
    t.includes('audit mutu') || t.includes('verifikasi data')
  ) {
    section = 'Quality Assurance';
  } else if (
    t.includes('administrasi') || t.includes('admin') || t.includes('surat') ||
    t.includes('arsip') || t.includes('dokumen kontrol') || t.includes('cuti')
  ) {
    section = 'Administration';
  }

  return { 
    kategori: jenis, 
    subKategori: section, 
    divisi: section === 'General' ? 'All' : section 
  };
}

async function syncNotionMateriDatabase() {
  if (!process.env.NOTION_API_KEY) {
    console.warn("NOTION_API_KEY not found in environment.");
    return { success: false, message: "NOTION_API_KEY missing" };
  }

  try {
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    const blocks = await notion.blocks.children.list({ block_id: NOTION_PAGE_ID });
    const dbBlock = blocks.results.find((b: any) => b.type === "child_database");
    if (!dbBlock) {
      console.warn("Child database not found on Notion page", NOTION_PAGE_ID);
      return { success: false, message: "Child database not found" };
    }

    let hasMore = true;
    let startCursor: string | undefined = undefined;
    const allRows: any[] = [];

    while (hasMore) {
      const res: any = await notion.databases.query({
        database_id: dbBlock.id,
        start_cursor: startCursor,
        page_size: 100
      });
      allRows.push(...res.results);
      hasMore = res.has_more;
      startCursor = res.next_cursor;
    }

    // Delete any old flyerless topics
    await db.execute(sql`DELETE FROM p5m_materi WHERE file_url IS NULL OR length(trim(file_url)) = 0 OR notion_id IS NULL;`);

    // Upsert or refresh database with authentic flyer topics only
    let syncedCount = 0;
    for (const r of allRows) {
      const p = r.properties;
      const name = p.Name?.title?.[0]?.plain_text || p.Judul?.title?.[0]?.plain_text || "";
      if (!name.trim()) continue;

      const file = p.File?.files?.[0]?.file?.url || p.File?.files?.[0]?.external?.url || "";
      // STRICT: Must have flyer / image file
      if (!file || !file.trim()) continue;

      const { kategori, subKategori, divisi } = classifyTopic(name.trim());

      const existing = await db.select().from(p5mMateri).where(eq(p5mMateri.judul, name.trim())).limit(1);
      if (existing.length > 0) {
        await db.update(p5mMateri).set({
          kategori,
          subKategori,
          divisi,
          fileUrl: file,
          notionId: r.id
        }).where(eq(p5mMateri.id, existing[0].id));
      } else {
        await db.insert(p5mMateri).values({
          judul: name.trim(),
          kategori,
          subKategori,
          divisi,
          fileUrl: file,
          notionId: r.id,
          lastUsed: null
        });
      }
      syncedCount++;
    }

    console.log(`Synced ${syncedCount} authentic flyer topics from Notion to p5m_materi.`);
    return { success: true, count: syncedCount };
  } catch (error: any) {
    console.error("Error syncing Notion materi:", error);
    return { success: false, message: error.message };
  }
}

// ============================================================
// HELPER FUNCTIONS: Klasifikasi Golongan, Kelas, Divisi & Tanggal
// ============================================================
function isGolongan2or3(emp: any): boolean {
  const nik = (emp.nik || '').toUpperCase().trim();
  const name = (emp.name || '').toLowerCase().trim();

  // Strict: Exclude demo, test, staging, and admin system accounts from P5M schedule
  if (
    nik === 'DEMO123' || 
    nik === 'DEMO' || 
    nik.includes('DEMO') || 
    name.includes('demo') || 
    name.includes('staging') ||
    nik === 'PREPLABADMIN'
  ) {
    return false;
  }

  const g = (emp.gol || '').toUpperCase().trim();
  const j = (emp.jabatan || '').toLowerCase();

  // Strict: Exclude explicit Golongan 1
  if (g === 'I' || g === '1') return false;

  // Exclude non-presenter crew / operator / helper / sampler / driver roles
  if (j.includes('crew') || j.includes('operator') || j.includes('helper') || j.includes('sampler') || j.includes('driver')) {
    return false;
  }

  // Exclude Manager & Superintendent
  if (j.includes('manager') || j.includes('spt') || j.includes('superintendent')) {
    return false;
  }

  // Explicit Golongan 2 or 3
  if (g === 'II' || g === 'III' || g === '2' || g === '3') return true;

  // Staff roles (Foreman, Officer, Admin, SPV, Specialist, Engineer, Analyst, Planner)
  if (
    j.includes('foreman') || j.includes('officer') || j.includes('admin') ||
    j.includes('supervisor') || j.includes('spv') || j.includes('specialist') ||
    j.includes('engineer') || j.includes('analyst') || j.includes('planner')
  ) {
    return true;
  }

  return false;
}

function tentukanKelas(jabatan: string): string {
  const j = (jabatan || '').toLowerCase();
  if (j.includes('supervisor') || j.includes('specialist') || j.includes('spv') || j.includes('engineer')) return 'SPV';
  if (j.includes('admin') || j.includes('administrator')) return 'Admin';
  if (j.includes('officer') || j.includes('foreman') || j.includes('analyst') || j.includes('planner')) return 'Foreman/Officer';
  return 'Other';
}

function tentukanDivisi(section: string, jabatan: string, name?: string, nik?: string): string {
  const n = (name || '').toLowerCase();
  const k = (nik || '').toLowerCase();

  // ── ATURAN PENGECUALIAN PENEMPATAN JADWAL P5M ──
  // Murti dan Atha ditempatkan di Laboratory (meskipun jabatan/section awal mungkin Prep)
  if (n.includes('murti') || k === 'm0403190701') return 'Laboratory';
  if (n.includes('atha') || k === '04d25000053') return 'Laboratory';

  // Djody ditempatkan di Preparation
  if (n.includes('djody') || n.includes('jody') || k === '02d24000045') return 'Preparation';

  const s = (section || '').toLowerCase();
  const j = (jabatan || '').toLowerCase();

  // 1. Check Section first (Most specific)
  if (s.includes('ic') || s.includes('inventory')) return 'IC';
  if (s.includes('qa') || s.includes('quality')) return 'Quality Assurance';
  if (s.includes('prep')) return 'Preparation';
  if (s.includes('maintenance') || s.includes('mekanik')) return 'Maintenance';
  if (s.includes('lab')) return 'Laboratory';
  if (s.includes('admin') || s.includes('administrator')) return 'Administration';

  // 2. Check Jabatan fallback
  if (j.includes('ic') || j.includes('inventory')) return 'IC';
  if (j.includes('quality') || j.includes('qa') || j.includes('qc')) return 'Quality Assurance';
  if (j.includes('prep')) return 'Preparation';
  if (j.includes('maintenance') || j.includes('mekanik')) return 'Maintenance';
  if (j.includes('lab')) return 'Laboratory';
  if (j.includes('admin') || j.includes('administrator')) return 'Administration';

  return 'All';
}

const URUTAN_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

function buildDefaultConfig(): Record<string, any> {
  const slot = (divisi: string, kelas: string, kategori: string, extra?: any) => ({
    divisi,
    kelas,
    kategori,
    ...(extra || {})
  });

  const cfg: Record<string, any> = {};

  // SENIN (Gabungan)
  cfg['Senin'] = {
    pagi: {
      gabungan: [
        slot('Preparation', 'SPV', 'Safety'),
        slot('Laboratory', 'SPV', 'Safety'),
        slot('All', 'All', 'Senam', { isSenam: true })
      ]
    },
    malam: {
      gabungan: [
        slot('Preparation', 'SPV', 'Safety'),
        slot('Laboratory', 'SPV', 'Safety'),
        slot('All', 'All', 'Senam', { isSenam: true })
      ]
    }
  };

  // SELASA (Split)
  cfg['Selasa'] = {
    pagi: {
      preparasi: [
        slot('Preparation', 'Foreman/Officer', 'Safety'),
        slot('Maintenance', 'Foreman/Officer', 'Safety')
      ],
      laboratorium: [
        slot('Laboratory', 'Foreman/Officer', 'Safety'),
        slot('IC', 'Admin', 'Safety')
      ]
    },
    malam: {
      preparasi: [
        slot('Preparation', 'Foreman/Officer', 'Safety'),
        slot('Maintenance', 'Foreman/Officer', 'Safety')
      ],
      laboratorium: [
        slot('Laboratory', 'Foreman/Officer', 'Safety'),
        slot('Laboratory', 'Foreman/Officer', 'Safety')
      ]
    }
  };

  // RABU (Split)
  cfg['Rabu'] = {
    pagi: {
      preparasi: [
        slot('Preparation', 'Foreman/Officer', 'Safety'),
        slot('Preparation', 'All', 'Safety')
      ],
      laboratorium: [
        slot('Laboratory', 'Foreman/Officer', 'Safety'),
        slot('Administration', 'Admin', 'Safety')
      ]
    },
    malam: {
      preparasi: [
        slot('Preparation', 'Foreman/Officer', 'Safety'),
        slot('Preparation', 'Foreman/Officer', 'Safety')
      ],
      laboratorium: [
        slot('Laboratory', 'Foreman/Officer', 'Safety'),
        slot('Laboratory', 'Foreman/Officer', 'Safety')
      ]
    }
  };

  // KAMIS (Gabungan)
  cfg['Kamis'] = {
    pagi: {
      gabungan: [
        slot('Preparation', 'SPV', 'Safety'),
        slot('Laboratory', 'Foreman/Officer', 'Safety'),
        slot('All', 'All', 'Senam', { isSenam: true })
      ]
    },
    malam: {
      gabungan: [
        slot('Preparation', 'SPV', 'Safety'),
        slot('Laboratory', 'Foreman/Officer', 'Safety'),
        slot('All', 'All', 'Senam', { isSenam: true })
      ]
    }
  };

  // JUMAT (Gabungan)
  cfg['Jumat'] = {
    pagi: {
      gabungan: [
        slot('Preparation', 'SPV', 'Safety'),
        slot('Laboratory', 'SPV', 'Safety')
      ]
    },
    malam: {
      gabungan: [
        slot('Preparation', 'Foreman/Officer', 'Safety'),
        slot('Laboratory', 'Foreman/Officer', 'Safety')
      ]
    }
  };

  // SABTU (Split)
  cfg['Sabtu'] = {
    pagi: {
      preparasi: [
        slot('Preparation', 'Foreman/Officer', 'Safety'),
        slot('Preparation', 'Foreman/Officer', 'Safety')
      ],
      laboratorium: [
        slot('Laboratory', 'Foreman/Officer', 'Safety'),
        slot('Quality Assurance', 'Foreman/Officer', 'Safety')
      ]
    },
    malam: {
      preparasi: [
        slot('Preparation', 'Foreman/Officer', 'Safety'),
        slot('Preparation', 'Foreman/Officer', 'Safety')
      ],
      laboratorium: [
        slot('Laboratory', 'Foreman/Officer', 'Safety'),
        slot('Laboratory', 'Foreman/Officer', 'Safety')
      ]
    }
  };

  // MINGGU (Gabungan)
  cfg['Minggu'] = {
    pagi: {
      gabungan: [
        slot('All', 'SPV', 'Safety'),
        slot('All', 'SPV', 'Safety'),
        slot('All', 'All', 'Senam', { isSenam: true })
      ]
    },
    malam: {
      gabungan: []
    }
  };

  return cfg;
}

function getWeekDates(referenceDateStr?: string) {
  let refDate = new Date();
  if (referenceDateStr) {
    if (referenceDateStr.includes('/')) {
      const parts = referenceDateStr.split('/');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          refDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        } else {
          refDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
      }
    } else if (referenceDateStr.includes('-')) {
      const [y, m, d] = referenceDateStr.split('-').map(Number);
      refDate = new Date(y, m - 1, d);
    } else {
      const parsed = new Date(referenceDateStr);
      if (!isNaN(parsed.getTime())) refDate = parsed;
    }
  }
  
  // Find Monday of the target week (if Sunday, default to next day Monday for upcoming week)
  const day = refDate.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = day === 0 ? 1 : 1 - day;
  const monday = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() + diffToMonday);

  const dates: Record<string, { iso: string; display: string; dateObj: Date }> = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  URUTAN_HARI.forEach((hari, idx) => {
    const curDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + idx);
    const yyyy = curDate.getFullYear();
    const mm = String(curDate.getMonth() + 1).padStart(2, '0');
    const dd = String(curDate.getDate()).padStart(2, '0');
    const iso = `${yyyy}-${mm}-${dd}`;
    const display = `${curDate.getDate()} ${monthNames[curDate.getMonth()]} ${yyyy}`;
    dates[hari] = { iso, display, dateObj: curDate };
  });

  return { monday, dates };
}

function getRosterStatusForDate(empRoster: Record<string, string>, dateObj: Date, defaultShift?: string): string {
  const parts = dateObj.toDateString().split(' ');
  const day = parseInt(parts[2], 10);
  const month = parts[1]; // e.g. 'Aug'
  const year2 = parts[3].substring(2); // e.g. '26'
  const formattedDate = `${day} ${month} ${year2}`; // e.g. "17 Aug 26"

  if (empRoster[formattedDate]) return empRoster[formattedDate];

  const paddedDate = `${String(day).padStart(2, '0')} ${month} ${year2}`;
  if (empRoster[paddedDate]) return empRoster[paddedDate];

  const targetKey = formattedDate.toLowerCase();
  for (const [k, v] of Object.entries(empRoster)) {
    if (k.toLowerCase() === targetKey) return v;
  }

  // Fallback: If employee has Shift Group (A, B, Nonshift)
  const base = (defaultShift || '').toUpperCase().trim();
  if (base.includes('NONSHIFT') || base.includes('NON-SHIFT') || base === 'D' || base === 'LS' || base === 'S') {
    return 'D';
  }
  if (base === 'N') {
    return 'N';
  }
  if (base === 'A') return 'D';
  if (base === 'B') return 'N';

  return base || 'D';
}

async function getPresenterHistory(): Promise<Record<string, number>> {
  try {
    const recent = await db.select().from(p5mSchedules).orderBy(desc(p5mSchedules.id)).limit(1);
    const countMap: Record<string, number> = {};
    if (recent.length > 0 && recent[0].scheduleData) {
      const sch = recent[0].scheduleData as Record<string, any>;
      Object.values(sch).forEach((dayData: any) => {
        ['pagi', 'malam'].forEach(shift => {
          if (dayData[shift]) {
            Object.values(dayData[shift]).forEach((slotArr: any) => {
              if (Array.isArray(slotArr)) {
                slotArr.forEach((s: any) => {
                  if (s.nama && !s.nama.includes('KOSONG')) {
                    const cleanName = s.nama.trim();
                    countMap[cleanName] = (countMap[cleanName] || 0) + 1;
                    if (s.nik) countMap[s.nik.trim()] = (countMap[s.nik.trim()] || 0) + 1;
                  }
                });
              }
            });
          }
        });
      });
    }
    return countMap;
  } catch (err) {
    console.error("Error reading presenter history:", err);
    return {};
  }
}

async function getRecentMateriHistory(limitWeeks = 2): Promise<Set<string>> {
  try {
    const recentSchedules = await db.select().from(p5mSchedules).orderBy(desc(p5mSchedules.id)).limit(limitWeeks);
    const materiSet = new Set<string>();
    recentSchedules.forEach(schRow => {
      if (schRow.scheduleData) {
        const sch = schRow.scheduleData as Record<string, any>;
        Object.values(sch).forEach((dayData: any) => {
          ['pagi', 'malam'].forEach(shift => {
            if (dayData[shift]) {
              Object.values(dayData[shift]).forEach((slotArr: any) => {
                if (Array.isArray(slotArr)) {
                  slotArr.forEach((s: any) => {
                    if (s.materi && !s.isSenam && !s.isLogbook && !s.materi.toLowerCase().includes('senam') && !s.materi.toLowerCase().includes('logbook')) {
                      materiSet.add(s.materi.trim().toLowerCase());
                    }
                  });
                }
              });
            }
          });
        });
      }
    });
    return materiSet;
  } catch (err) {
    console.error("Error reading recent materi history:", err);
    return new Set<string>();
  }
}

const SENAM_INITIAL_HISTORY = [
  { nik: '04D24000057', nama: 'Herwin Predianto' },
  { nik: 'M0208230715', nama: 'Rusli Rorano' },
  { nik: 'M0206250732', nama: 'Muhammad Iqbal' },
  { nik: 'M0412251310', nama: 'Derald Febri Andriano Tjiwili' },
  { nik: '04D23000035', nama: 'Ahmad Jusma Azhari Annur' },
  { nik: 'M0209221325', nama: 'Valdi Pratama' },
  { nik: '02D25000055', nama: 'Muhamad Anugrah Ramadhan' },
  { nik: 'M0403190701', nama: 'Murti Tamisari Harun' },
  { nik: 'M0407240439', nama: 'Raldy Chevien Aryando Dareno' },
  { nik: '02D24000043', nama: 'Muhamad Alvin Febriansyah' },
  { nik: '02D25000052', nama: 'Ridhan Ahmadurabbi' },
  { nik: '02D24000045', nama: 'Muhammad Djody Satriani' },
  { nik: 'M0201220012', nama: 'Taufikir, S.Pi' },
  { nik: '04D24000068', nama: 'Muhammad Fandy Septiawan' },
  { nik: 'M0411251243', nama: 'Agung Adi Putra Prasetyo' },
  { nik: '02D22000023', nama: 'Muhammad Reza Satria' },
  { nik: '04D26000070', nama: 'Rahmad Azizul Khakim' }
];

async function getSenamHistory(): Promise<Record<string, number>> {
  try {
    const allSchedules = await db.select().from(p5mSchedules).orderBy(desc(p5mSchedules.id)).limit(15);
    const countMap: Record<string, number> = {};

    // 1. Baseline record senam pagi yang sudah pernah dibawakan
    SENAM_INITIAL_HISTORY.forEach(p => {
      if (p.nama) countMap[p.nama.trim()] = (countMap[p.nama.trim()] || 0) + 1;
      if (p.nik) countMap[p.nik.trim()] = (countMap[p.nik.trim()] || 0) + 1;
    });

    // 2. Data riwayat dari jadwal tersimpan sebelumnya (KHUSUS SHIFT PAGI)
    allSchedules.forEach(schRow => {
      if (schRow.scheduleData) {
        const sch = schRow.scheduleData as Record<string, any>;
        Object.values(sch).forEach((dayData: any) => {
          // User: "perbaiki rotasi senam agar yang dimaksud merata adalah senam pagi hari"
          ['pagi'].forEach(shift => {
            if (dayData[shift]) {
              Object.values(dayData[shift]).forEach((slotArr: any) => {
                if (Array.isArray(slotArr)) {
                  slotArr.forEach((s: any) => {
                    if (s.isSenam || s.kategori === 'Senam' || (s.materi && s.materi.toLowerCase().includes('senam'))) {
                      if (s.nama && !s.nama.includes('KOSONG')) {
                        countMap[s.nama.trim()] = (countMap[s.nama.trim()] || 0) + 1;
                        if (s.nik) countMap[s.nik.trim()] = (countMap[s.nik.trim()] || 0) + 1;
                      }
                    }
                  });
                }
              });
            }
          });
        });
      }
    });
    return countMap;
  } catch (e) {
    return {};
  }
}

// ============================================================
// MATERI ENDPOINTS (CRUD & NOTION SYNC)
// ============================================================
p5mRouter.get("/materi", async (req, res) => {
  try {
    const list = await db.select().from(p5mMateri).orderBy(desc(p5mMateri.id));
    res.json({ success: true, data: list });
  } catch (error: any) {
    console.error("Error fetching P5M materi:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

p5mRouter.post("/materi/sync", async (req, res) => {
  try {
    const result = await syncNotionMateriDatabase();
    if (result.success) {
      const list = await db.select().from(p5mMateri).orderBy(desc(p5mMateri.id));
      res.json({ success: true, count: result.count, data: list });
    } else {
      res.status(500).json({ success: false, message: result.message });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper to upload and save P5M flyer / document
async function saveMateriFile(filename: string, base64Data: string, cleanJudul: string, isInternal: boolean): Promise<string> {
  const base64Clean = base64Data.replace(/^data:.*?;base64,/, "");
  const buffer = Buffer.from(base64Clean, 'base64');
  const safeId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  
  const ext = path.extname(filename || '').toLowerCase() || '.png';
  const localFileName = `p5m_${safeId}${ext}`;
  const localPath = path.join(process.cwd(), 'public', 'uploads', 'p5m', localFileName);

  let mimeType = 'image/png';
  if (ext === '.xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  else if (ext === '.xls') mimeType = 'application/vnd.ms-excel';
  else if (ext === '.pdf') mimeType = 'application/pdf';
  else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
  else if (ext === '.webp') mimeType = 'image/webp';

  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'p5m');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    fs.writeFileSync(localPath, buffer);
  } catch (fErr: any) {
    console.warn("Local cache write failed:", fErr.message);
  }

  let finalFileUrl = `/uploads/p5m/${localFileName}`;

  try {
    const isInternalVal = Boolean(isInternal);
    const folderId = isInternalVal 
      ? (process.env.GDRIVE_BRIEFING_INTERNAL_FOLDER_ID || '1850C4AAefTc_lgx7Jlg9fM7SpyGlQn-9')
      : (process.env.GDRIVE_BRIEFING_EXTERNAL_FOLDER_ID || '1a0yxvL7KTPQQK_qhxtl-PpHQNTsqoAUV');

    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const driveRes = await drive.files.create({
      requestBody: {
        name: filename || `P5M_${cleanJudul.replace(/[^a-zA-Z0-9_-]/g, '_')}${ext}`,
        parents: [folderId]
      },
      media: { mimeType, body: stream },
      fields: 'id, webViewLink',
      supportsAllDrives: true
    });

    const driveFileId = driveRes.data.id;
    if (driveFileId) {
      try {
        await drive.permissions.create({
          fileId: driveFileId,
          requestBody: { role: 'reader', type: 'anyone' },
          supportsAllDrives: true
        });
      } catch (pErr: any) {}
      if (ext === '.xlsx' || ext === '.xls' || ext === '.pdf') {
        finalFileUrl = `/uploads/p5m/${localFileName}`;
      } else {
        finalFileUrl = `https://lh3.googleusercontent.com/d/${driveFileId}`;
      }
    }
  } catch (dErr: any) {
    console.warn("Drive upload failed, using local fallback URL:", dErr.message);
  }

  return finalFileUrl;
}

p5mRouter.post("/materi", async (req, res) => {
  try {
    const { judul, kategori, subKategori, divisi, fileUrl, isInternal, base64Data, filename } = req.body;
    if (!judul || !judul.trim()) {
      return res.status(400).json({ success: false, message: "Judul materi wajib diisi" });
    }

    const cleanJudul = judul.trim();
    let finalFileUrl: string | null = fileUrl || null;

    if (base64Data && filename) {
      finalFileUrl = await saveMateriFile(filename, base64Data, cleanJudul, Boolean(isInternal));
    }

    const autoClass = classifyTopic(cleanJudul);
    const finalKategori = (kategori && kategori !== 'auto') ? kategori : autoClass.kategori;
    const finalSubKategori = (subKategori && subKategori !== 'auto') ? subKategori : autoClass.subKategori;
    const finalDivisi = (divisi && divisi !== 'auto') ? divisi : autoClass.divisi;

    const inserted = await db.insert(p5mMateri).values({
      judul: cleanJudul,
      kategori: finalKategori,
      subKategori: finalSubKategori,
      divisi: finalDivisi,
      fileUrl: finalFileUrl,
      isInternal: Boolean(isInternal),
      lastUsed: null
    }).returning();

    res.json({ success: true, data: inserted[0] });
  } catch (error: any) {
    console.error("Error creating P5M materi:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk Insert P5M Materi with optional bulk prefix and file attachments
p5mRouter.post("/materi/bulk", async (req, res) => {
  try {
    const { 
      prefix, 
      rawText, 
      items, 
      defaultKategori = 'auto', 
      defaultSubKategori = 'General', 
      defaultDivisi = 'All', 
      isInternal = false,
      skipDuplicates = true,
      stripNumbering = true
    } = req.body;

    let itemList: any[] = [];

    if (Array.isArray(items) && items.length > 0) {
      itemList = items;
    } else if (typeof rawText === 'string') {
      itemList = rawText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(judul => ({ judul }));
    }

    if (itemList.length === 0) {
      return res.status(400).json({ success: false, message: "Daftar judul materi tidak boleh kosong" });
    }

    const cleanPrefix = (prefix || '').trim();
    const existingMateri = await db.select({ judul: p5mMateri.judul }).from(p5mMateri);
    const existingJudulSet = new Set(existingMateri.map(m => m.judul.trim().toLowerCase()));

    const toInsert: Array<{
      judul: string;
      kategori: string;
      subKategori: string;
      divisi: string;
      fileUrl: string | null;
      isInternal: boolean;
      lastUsed: null;
    }> = [];

    let skippedCount = 0;
    const addedTitles = new Set<string>();

    for (let rawItem of itemList) {
      const rawTitle = typeof rawItem === 'string' ? rawItem : rawItem.judul || '';
      let cleanTitle = rawTitle.trim();

      // Automatically strip numbers/bullet markers (e.g. "1. ", "1) ", "- ", "• ")
      if (stripNumbering) {
        cleanTitle = cleanTitle.replace(/^(\d+[\.\)\-:]|\-|\*|•)\s*/, '').trim();
      }

      if (!cleanTitle) continue;

      // Prepend prefix if specified
      let finalJudul = cleanTitle;
      if (cleanPrefix) {
        if (!cleanTitle.toLowerCase().startsWith(cleanPrefix.toLowerCase())) {
          finalJudul = `${cleanPrefix} ${cleanTitle}`.trim();
        }
      }

      // Check duplicates
      const lowerJudul = finalJudul.toLowerCase();
      if (skipDuplicates && (existingJudulSet.has(lowerJudul) || addedTitles.has(lowerJudul))) {
        skippedCount++;
        continue;
      }

      addedTitles.add(lowerJudul);

      // Determine category, subcategory, division
      let kat = (typeof rawItem !== 'string' && rawItem.kategori) || defaultKategori;
      let subKat = (typeof rawItem !== 'string' && rawItem.subKategori) || defaultSubKategori;
      let div = (typeof rawItem !== 'string' && rawItem.divisi) || defaultDivisi;
      const itemIsInternal = typeof rawItem !== 'string' && rawItem.isInternal !== undefined ? Boolean(rawItem.isInternal) : Boolean(isInternal);

      if (!kat || kat === 'auto') {
        const classified = classifyTopic(finalJudul);
        kat = classified.kategori;
        subKat = classified.subKategori;
        div = classified.divisi;
      }

      // Handle attached file if present
      let itemFileUrl: string | null = (typeof rawItem !== 'string' && rawItem.fileUrl) || null;
      if (typeof rawItem !== 'string' && rawItem.base64Data && rawItem.filename) {
        try {
          itemFileUrl = await saveMateriFile(rawItem.filename, rawItem.base64Data, finalJudul, itemIsInternal);
        } catch (e: any) {
          console.error("Error saving bulk file:", e);
        }
      }

      toInsert.push({
        judul: finalJudul,
        kategori: kat,
        subKategori: subKat,
        divisi: div,
        fileUrl: itemFileUrl,
        isInternal: itemIsInternal,
        lastUsed: null
      });
    }

    if (toInsert.length === 0) {
      return res.json({ 
        success: true, 
        count: 0, 
        skipped: skippedCount, 
        message: `Tidak ada materi baru yang ditambahkan (${skippedCount} materi dilewati karena duplikat).` 
      });
    }

    // Insert in chunks of 50
    const insertedAll: any[] = [];
    for (let i = 0; i < toInsert.length; i += 50) {
      const chunk = toInsert.slice(i, i + 50);
      const inserted = await db.insert(p5mMateri).values(chunk).returning();
      insertedAll.push(...inserted);
    }

    res.json({
      success: true,
      count: insertedAll.length,
      skipped: skippedCount,
      data: insertedAll,
      message: `Berhasil menambahkan ${insertedAll.length} materi P5M secara bulk${skippedCount > 0 ? ` (${skippedCount} materi dilewati karena sudah ada)` : ''}.`
    });
  } catch (error: any) {
    console.error("Error bulk creating P5M materi:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk Prepend Prefix to Existing P5M Materi
p5mRouter.post("/materi/bulk-prefix", async (req, res) => {
  try {
    const { ids, prefix } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "Pilih minimal 1 materi untuk diberi awalan judul" });
    }
    const cleanPrefix = (prefix || '').trim();
    if (!cleanPrefix) {
      return res.status(400).json({ success: false, message: "Awalan judul tidak boleh kosong" });
    }

    const rows = await db.select().from(p5mMateri).where(sql`${p5mMateri.id} = ANY(${ids})`);
    let updatedCount = 0;

    for (const row of rows) {
      let currentTitle = row.judul.trim();
      if (!currentTitle.toLowerCase().startsWith(cleanPrefix.toLowerCase())) {
        const newTitle = `${cleanPrefix} ${currentTitle}`.trim();
        await db.update(p5mMateri).set({ judul: newTitle }).where(eq(p5mMateri.id, row.id));
        updatedCount++;
      }
    }

    res.json({
      success: true,
      count: updatedCount,
      message: `Berhasil menambahkan awalan "${cleanPrefix}" pada ${updatedCount} materi.`
    });
  } catch (error: any) {
    console.error("Error adding bulk prefix to P5M materi:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk Delete P5M Materi
p5mRouter.post("/materi/bulk-delete", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "Pilih minimal 1 materi untuk dihapus" });
    }
    await db.delete(p5mMateri).where(sql`${p5mMateri.id} = ANY(${ids})`);
    res.json({ success: true, count: ids.length, message: `Berhasil menghapus ${ids.length} materi.` });
  } catch (error: any) {
    console.error("Error bulk deleting P5M materi:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

p5mRouter.put("/materi/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, message: "ID materi tidak valid" });
    }

    const { judul, kategori, subKategori, divisi, fileUrl, isInternal, base64Data, filename } = req.body;
    let finalFileUrl: string | undefined = fileUrl;

    if (base64Data) {
      const base64Clean = base64Data.replace(/^data:.*?;base64,/, "");
      const buffer = Buffer.from(base64Clean, 'base64');
      const safeId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      
      const ext = path.extname(filename || '').toLowerCase() || '.png';
      const localFileName = `p5m_${safeId}${ext}`;
      const localPath = path.join(process.cwd(), 'public', 'uploads', 'p5m', localFileName);

      let mimeType = 'image/png';
      if (ext === '.xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      else if (ext === '.xls') mimeType = 'application/vnd.ms-excel';
      else if (ext === '.pdf') mimeType = 'application/pdf';
      else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      else if (ext === '.webp') mimeType = 'image/webp';

      try {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'p5m');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        fs.writeFileSync(localPath, buffer);
      } catch (fErr: any) {
        console.warn("Local cache write failed:", fErr.message);
      }

      finalFileUrl = `/uploads/p5m/${localFileName}`;

      try {
        const isInternalVal = Boolean(isInternal);
        const folderId = isInternalVal 
          ? (process.env.GDRIVE_BRIEFING_INTERNAL_FOLDER_ID || '1850C4AAefTc_lgx7Jlg9fM7SpyGlQn-9')
          : (process.env.GDRIVE_BRIEFING_EXTERNAL_FOLDER_ID || '1a0yxvL7KTPQQK_qhxtl-PpHQNTsqoAUV');

        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);

        const driveRes = await drive.files.create({
          requestBody: {
            name: filename || `P5M_${(judul || 'materi').replace(/[^a-zA-Z0-9_-]/g, '_')}${ext}`,
            parents: [folderId]
          },
          media: {
            mimeType,
            body: stream
          },
          fields: 'id, webViewLink',
          supportsAllDrives: true
        });

        const driveFileId = driveRes.data.id;
        if (driveFileId) {
          try {
            await drive.permissions.create({
              fileId: driveFileId,
              requestBody: { role: 'reader', type: 'anyone' },
              supportsAllDrives: true
            });
          } catch (pErr: any) {}
          if (ext === '.xlsx' || ext === '.xls' || ext === '.pdf') {
            finalFileUrl = `/uploads/p5m/${localFileName}`;
          } else {
            finalFileUrl = `https://lh3.googleusercontent.com/d/${driveFileId}`;
          }
        }
      } catch (dErr: any) {
        finalFileUrl = `/uploads/p5m/${localFileName}`;
      }
    }

    const updatePayload: any = {};
    if (judul !== undefined) updatePayload.judul = judul.trim();
    if (kategori !== undefined) updatePayload.kategori = kategori;
    if (subKategori !== undefined) updatePayload.subKategori = subKategori;
    if (divisi !== undefined) updatePayload.divisi = divisi;
    if (finalFileUrl !== undefined) updatePayload.fileUrl = finalFileUrl;
    if (isInternal !== undefined) updatePayload.isInternal = Boolean(isInternal);

    const updated = await db.update(p5mMateri).set(updatePayload).where(eq(p5mMateri.id, id)).returning();

    res.json({ success: true, data: updated[0] });
  } catch (error: any) {
    console.error("Error updating P5M materi:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

p5mRouter.delete("/materi/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, message: "ID materi tidak valid" });
    }
    await db.delete(p5mMateri).where(eq(p5mMateri.id, id));
    res.json({ success: true, message: "Materi berhasil dihapus" });
  } catch (error: any) {
    console.error("Error deleting P5M materi:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reset status pemakaian seluruh materi SOP & IK agar bisa digunakan / diprioritaskan lagi
p5mRouter.post("/materi/reset-sop-ik", async (req, res) => {
  try {
    const result = await db.update(p5mMateri)
      .set({ lastUsed: null })
      .where(sql`LOWER(${p5mMateri.judul}) ~* '\\y(sop|ik)\\y|instruksi kerja' OR LOWER(${p5mMateri.judul}) LIKE '%sop%' OR LOWER(${p5mMateri.judul}) LIKE '%ik %'`)
      .returning({ id: p5mMateri.id, judul: p5mMateri.judul });

    res.json({ 
      success: true, 
      count: result.length, 
      message: `Berhasil mereset status pemakaian untuk ${result.length} materi SOP & IK!` 
    });
  } catch (error: any) {
    console.error("Error resetting SOP/IK history:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reset status pemakaian untuk 1 materi tertentu
p5mRouter.put("/materi/:id/reset-used", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, message: "ID materi tidak valid" });
    }
    const updated = await db.update(p5mMateri)
      .set({ lastUsed: null })
      .where(eq(p5mMateri.id, id))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ success: false, message: "Materi tidak ditemukan" });
    }

    res.json({ success: true, message: "Riwayat pemakaian materi berhasil di-reset!", data: updated[0] });
  } catch (error: any) {
    console.error("Error resetting single materi:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// EMPLOYEE POOL & ROSTER FOR TARGET WEEK (GOLONGAN 2 & 3 + PT FILTER)
// ============================================================
p5mRouter.get("/pool", async (req, res) => {
  try {
    const weekDateStr = (req.query.weekDate as string) || new Date().toISOString().split('T')[0];
    const userPt = ((req.query.userPt || req.query.creatorPt || req.query.pt || 'TBP') as string).toUpperCase();
    const { dates } = getWeekDates(weekDateStr);

    const allEmps = await db.select().from(employees);
    const allRoster = await db.select().from(roster);
    const lastWeekCounts = await getPresenterHistory();
    const senamHistory = await getSenamHistory();

    // Map roster by NIK -> date -> status
    const rosterMap: Record<string, Record<string, string>> = {};
    allRoster.forEach(r => {
      if (!rosterMap[r.nik]) rosterMap[r.nik] = {};
      if (r.date) {
        rosterMap[r.nik][r.date.trim()] = (r.status || '').toUpperCase().trim();
      }
    });

    const shiftValid = ['D', 'N', 'LS', 'S', 'NONSHIFT', 'NON-SHIFT'];

    const pool = allEmps.map(emp => {
      // 1. STRICT: Only Golongan 2 & 3
      if (!isGolongan2or3(emp)) {
        return null;
      }

      // Strictly exclude resigned employees
      const stStr = (emp.statusKaryawan || '').toUpperCase().trim();
      const secStr = (emp.section || '').toUpperCase().trim();
      const jgStr = (emp.jobGrade || '').toUpperCase().trim();
      const empNik = (emp.nik || '').toUpperCase().trim();
      const isResigned = stStr.includes('RESIGN') || stStr.includes('PHK') || stStr.includes('KELUAR') ||
        secStr.includes('#N/A') || jgStr.includes('#N/A') ||
        ['04D24000052', '02D23000050', '04D25000062', '04D25000045', 'M0405240291', 'M0210190719', 'M0506260356'].includes(empNik);
      if (isResigned) return null;

      // 2. STRICT PT FILTERING RULE:
      const empPt = (emp.pt || '').toUpperCase().trim();
      if (userPt === 'TBP' || userPt === 'GPS' || userPt === 'TBP_GPS') {
        if (empPt === 'GTS') return null;
      } else if (userPt === 'GTS') {
        if (empPt !== 'GTS') return null;
      }

      const jabatan = emp.jabatan || '';
      const nama = emp.name ? emp.name.trim() : '';
      if (!nama) return null;

      const jadwal: Record<string, string> = {};
      const empRoster = rosterMap[emp.nik] || {};

      URUTAN_HARI.forEach(hari => {
        const dateObj = dates[hari].dateObj;
        jadwal[hari] = getRosterStatusForDate(empRoster, dateObj, emp.shift || '');
      });

      const masukSenin = shiftValid.includes(jadwal['Senin']);
      const adaJadwalKerja = URUTAN_HARI.some(h => shiftValid.includes(jadwal[h]));

      if (!masukSenin && !adaJadwalKerja) return null;

      const cutiMingguIni = URUTAN_HARI.some(h => {
        const s = jadwal[h];
        return s === 'C' || s === 'OFF' || s === 'TRV';
      });

      const countLastWeek = lastWeekCounts[nama] || (emp.nik ? lastWeekCounts[emp.nik] : 0) || 0;
      const countSenam = senamHistory[nama] || (emp.nik ? senamHistory[emp.nik] : 0) || 0;

      return {
        nik: emp.nik,
        nama: nama,
        jabatan: jabatan,
        gol: emp.gol || 'II',
        pt: empPt || 'TBP',
        section: emp.section || emp.department || '',
        kelas: tentukanKelas(jabatan),
        divisi: tentukanDivisi(emp.section || emp.department || '', jabatan, nama, emp.nik),
        jadwal: jadwal,
        cutiMingguIni: cutiMingguIni,
        tugasMingguLalu: countLastWeek,
        senamCount: countSenam,
        wajibDapat: countLastWeek === 0, // Belum dapat di periode lalu -> prioritas wajib dapat
        tugasMingguIni: 0,
        hariTerakhirBriefingSesi: -1
      };
    }).filter(Boolean);

    // Filter active SPT & Managers for special Monday briefing selection
    const managers = allEmps.filter(emp => {
      const j = (emp.jabatan || '').toLowerCase();
      const g = (emp.gol || '').toUpperCase().trim();
      const isMgr = j.includes('manager') || j.includes('spt') || j.includes('superintendent') || g === 'IV' || g === 'V';
      if (!isMgr) return false;
      const stStr = (emp.statusKaryawan || '').toUpperCase().trim();
      if (stStr.includes('RESIGN') || stStr.includes('PHK') || stStr.includes('KELUAR')) return false;
      const empPt = (emp.pt || '').toUpperCase().trim();
      if (userPt === 'TBP' || userPt === 'GPS' || userPt === 'TBP_GPS') {
        if (empPt === 'GTS') return false;
      } else if (userPt === 'GTS') {
        if (empPt !== 'GTS') return false;
      }
      return true;
    }).map(emp => ({
      nik: emp.nik,
      nama: emp.name ? emp.name.trim() : '',
      jabatan: emp.jabatan || '',
      gol: emp.gol || '',
      pt: emp.pt || 'TBP',
      section: emp.section || ''
    }));

    res.json({
      success: true,
      dates: Object.fromEntries(Object.entries(dates).map(([h, d]) => [h, { iso: d.iso, display: d.display }])),
      pool: pool,
      managers: managers
    });
  } catch (error: any) {
    console.error("Error generating P5M pool:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// RANDOMIZE SCHEDULE ENGINE (GOLONGAN 2 & 3 + SECTION GROUPING RULES)
// ============================================================
p5mRouter.post("/randomize", async (req, res) => {
  console.log('[P5M] Received POST /randomize with body:', req.body);
  try {
    const { uiConfig: inputUiConfig, weekDate, userPt: reqUserPt, creatorPt, allowedJenisDokumen, selectedDocumentTypes, seninConfig } = req.body;
    const uiConfig = (inputUiConfig && Object.keys(inputUiConfig).length > 0) ? inputUiConfig : buildDefaultConfig();
    const userPt = ((creatorPt || reqUserPt || 'TBP') as string).toUpperCase();
    const rawAllowed = allowedJenisDokumen || selectedDocumentTypes;
    const allowedTypes: string[] = Array.isArray(rawAllowed) && rawAllowed.length > 0 ? rawAllowed : [];
    const { dates } = getWeekDates(weekDate);

    // Target dates for the week to avoid scanning 126k rows
    const targetDates = new Set<string>();
    URUTAN_HARI.forEach(hari => {
      const dateObj = dates[hari].dateObj;
      const parts = dateObj.toDateString().split(' ');
      const day = parseInt(parts[2], 10);
      const month = parts[1];
      const year2 = parts[3].substring(2);
      targetDates.add(`${day} ${month} ${year2}`);
      targetDates.add(`${String(day).padStart(2, '0')} ${month} ${year2}`);
      if (dates[hari].iso) targetDates.add(dates[hari].iso);
    });
    const targetDatesArr = Array.from(targetDates);

    console.time('[P5M] DB queries');
    const [materiDb, allEmps, allRoster, lastWeekCounts, senamHistory, recentMateriTitles] = await Promise.all([
      db.select().from(p5mMateri),
      db.select().from(employees),
      db.select().from(roster).where(inArray(roster.date, targetDatesArr)),
      getPresenterHistory(),
      getSenamHistory(),
      getRecentMateriHistory(2)
    ]);
    console.timeEnd('[P5M] DB queries');

    const rosterMap: Record<string, Record<string, string>> = {};
    allRoster.forEach(r => {
      if (!rosterMap[r.nik]) rosterMap[r.nik] = {};
      if (r.date) {
        rosterMap[r.nik][r.date.trim()] = (r.status || '').toUpperCase().trim();
      }
    });

    const shiftValid = ['D', 'N', 'LS', 'S', 'NONSHIFT', 'NON-SHIFT'];

    // Include all active materi from database (exclude logbook)
    const poolMateri = materiDb
      .filter(m => {
        const j = (m.judul || '').toLowerCase();
        return !j.includes('logbook') && !j.includes('evaluasi logbook');
      })
      .map(m => ({ ...m }));

    // Prepare qualified Golongan 2 & 3 employee pool
    const poolKaryawan = allEmps.map(emp => {
      // 1. Strict Golongan 2 & 3
      if (!isGolongan2or3(emp)) return null;

      // Strictly exclude resigned employees
      const stStr = (emp.statusKaryawan || '').toUpperCase().trim();
      const secStr = (emp.section || '').toUpperCase().trim();
      const jgStr = (emp.jobGrade || '').toUpperCase().trim();
      const empNik = (emp.nik || '').toUpperCase().trim();
      const isResigned = stStr.includes('RESIGN') || stStr.includes('PHK') || stStr.includes('KELUAR') ||
        secStr.includes('#N/A') || jgStr.includes('#N/A') ||
        ['04D24000052', '02D23000050', '04D25000062', '04D25000045', 'M0405240291', 'M0210190719', 'M0506260356'].includes(empNik);
      if (isResigned) return null;

      // 2. Strict PT Filter
      const empPt = (emp.pt || '').toUpperCase().trim();
      if (userPt === 'TBP' || userPt === 'GPS' || userPt === 'TBP_GPS') {
        if (empPt === 'GTS') return null;
      } else if (userPt === 'GTS') {
        if (empPt !== 'GTS') return null;
      }

      const jabatan = emp.jabatan || '';
      const nama = emp.name ? emp.name.trim() : '';
      if (!nama) return null;

      const jadwal: Record<string, string> = {};
      const empRoster = rosterMap[emp.nik] || {};

      URUTAN_HARI.forEach(hari => {
        const dateObj = dates[hari].dateObj;
        jadwal[hari] = getRosterStatusForDate(empRoster, dateObj, emp.shift || '');
      });

      const masukSenin = shiftValid.includes(jadwal['Senin']);
      const adaJadwalKerja = URUTAN_HARI.some(h => shiftValid.includes(jadwal[h]));
      if (!masukSenin && !adaJadwalKerja) return null;

      const cutiMingguIni = URUTAN_HARI.some(h => {
        const s = jadwal[h];
        return s === 'C' || s === 'OFF' || s === 'TRV';
      });

      const countLastWeek = lastWeekCounts[nama] || (emp.nik ? lastWeekCounts[emp.nik] : 0) || 0;
      const countSenam = senamHistory[nama] || (emp.nik ? senamHistory[emp.nik] : 0) || 0;

      return {
        nik: emp.nik,
        nama: nama,
        jabatan: jabatan,
        gol: emp.gol || 'II',
        pt: empPt || 'TBP',
        section: emp.section || emp.department || '',
        kelas: tentukanKelas(jabatan),
        divisi: tentukanDivisi(emp.section || emp.department || '', jabatan, nama, emp.nik),
        jadwal: jadwal,
        cutiMingguIni: cutiMingguIni,
        tugasMingguIni: 0,
        tugasMingguLalu: countLastWeek,
        senamCount: countSenam,
        wajibDapat: countLastWeek === 0, // Prioritas regulasi 2 minggu
        hariTerakhirBriefingSesi: -1,
        score: 0
      };
    }).filter(Boolean) as any[];

    // Active SPT & Managers (Gol IV & V) for Monday Special Briefing
    const managerSptList = allEmps.filter(emp => {
      const j = (emp.jabatan || '').toLowerCase();
      const g = (emp.gol || '').toUpperCase().trim();
      const isMgr = j.includes('manager') || j.includes('spt') || j.includes('superintendent') || g === 'IV' || g === 'V';
      if (!isMgr) return false;
      const stStr = (emp.statusKaryawan || '').toUpperCase().trim();
      if (stStr.includes('RESIGN') || stStr.includes('PHK') || stStr.includes('KELUAR')) return false;
      const empPt = (emp.pt || '').toUpperCase().trim();
      if (userPt === 'TBP' || userPt === 'GPS' || userPt === 'TBP_GPS') {
        if (empPt === 'GTS') return false;
      } else if (userPt === 'GTS') {
        if (empPt !== 'GTS') return false;
      }
      return true;
    }).map(emp => ({
      nik: emp.nik,
      nama: emp.name ? emp.name.trim() : '',
      jabatan: emp.jabatan || '',
      gol: emp.gol || 'IV',
      pt: emp.pt || 'TBP',
      section: emp.section || emp.department || '',
      kelas: 'Manager/SPT',
      divisi: tentukanDivisi(emp.section || emp.department || '', emp.jabatan || '', emp.name || '', emp.nik),
      jadwal: {},
      tugasMingguIni: 0
    }));

    // Pool Senam Lengkap: Mencakup Staf Gol 2 & 3, DAN Crew / Operator / Sampler / Helper yang masuk kerja
    const poolSenam = allEmps.map(emp => {
      const nik = (emp.nik || '').toUpperCase().trim();
      const name = (emp.name || '').toLowerCase().trim();
      if (
        nik === 'DEMO123' || nik === 'DEMO' || nik.includes('DEMO') || 
        name.includes('demo') || name.includes('staging') || nik === 'PREPLABADMIN'
      ) return null;

      const stStr = (emp.statusKaryawan || '').toUpperCase().trim();
      const secStr = (emp.section || '').toUpperCase().trim();
      const jgStr = (emp.jobGrade || '').toUpperCase().trim();
      const empNik = (emp.nik || '').toUpperCase().trim();
      const isResigned = stStr.includes('RESIGN') || stStr.includes('PHK') || stStr.includes('KELUAR') ||
        secStr.includes('#N/A') || jgStr.includes('#N/A') ||
        ['04D24000052', '02D23000050', '04D25000062', '04D25000045', 'M0405240291', 'M0210190719', 'M0506260356'].includes(empNik);
      if (isResigned) return null;

      const empPt = (emp.pt || '').toUpperCase().trim();
      if (userPt === 'TBP' || userPt === 'GPS' || userPt === 'TBP_GPS') {
        if (empPt === 'GTS') return null;
      } else if (userPt === 'GTS') {
        if (empPt !== 'GTS') return null;
      }

      const jabatan = emp.jabatan || '';
      const nama = emp.name ? emp.name.trim() : '';
      if (!nama) return null;

      // Exclude Manager & Superintendent dari instruktur senam
      const j = jabatan.toLowerCase();
      if (j.includes('manager') || j.includes('spt') || j.includes('superintendent') || emp.gol === 'IV' || emp.gol === 'V') {
        return null;
      }

      const jadwal: Record<string, string> = {};
      const empRoster = rosterMap[emp.nik] || {};

      URUTAN_HARI.forEach(hari => {
        const dateObj = dates[hari].dateObj;
        jadwal[hari] = getRosterStatusForDate(empRoster, dateObj, emp.shift || '');
      });

      const masukSenin = shiftValid.includes(jadwal['Senin']);
      const adaJadwalKerja = URUTAN_HARI.some(h => shiftValid.includes(jadwal[h]));
      if (!masukSenin && !adaJadwalKerja) return null;

      const countSenam = senamHistory[nama] || (emp.nik ? senamHistory[emp.nik] : 0) || 0;

      // Hubungkan dengan poolKaryawan jika personil sudah ada di pool staf
      const existingInPool = poolKaryawan.find(k => k && (k.nik === emp.nik || k.nama === nama));

      return {
        nik: emp.nik,
        nama: nama,
        jabatan: jabatan,
        gol: emp.gol || 'I',
        pt: empPt || 'TBP',
        section: emp.section || emp.department || '',
        kelas: tentukanKelas(jabatan),
        divisi: tentukanDivisi(emp.section || emp.department || '', jabatan, nama, emp.nik),
        jadwal: jadwal,
        senamCount: countSenam,
        tugasMingguIni: existingInPool ? existingInPool.tugasMingguIni : 0,
        refKaryawan: existingInPool || null
      };
    }).filter(Boolean) as any[];

    // Helper: Cek status cuti atau travel
    function isCutiOrTravel(code?: string): boolean {
      if (!code) return false;
      const s = code.toUpperCase().trim();
      if (['C', 'CE', 'CT', 'CI', 'CS', 'TRV', 'TV', 'XP', 'TT', 'CUTI', 'TRAVEL', 'TR'].includes(s)) return true;
      if (s.startsWith('CT') || s.startsWith('CE') || s.startsWith('CI') || s.startsWith('CS') || s.startsWith('TRV') || s.startsWith('TV') || s.startsWith('C-') || s.startsWith('TR-')) return true;
      return false;
    }

    // Helper: Cek apakah personil adalah Crew / Golongan 1
    function isCrewOrGol1(k: any): boolean {
      const g = String(k.gol || '').toUpperCase().trim();
      if (g === 'I' || g === '1' || g.includes('GOL 1') || g.includes('GOL I') || g.includes('CREW')) return true;
      const j = (k.jabatan || '').toLowerCase();
      if (
        j.includes('operator') || j.includes('sampler') || j.includes('helper') || 
        j.includes('crew') || j.includes('preparator') || j.includes('laboran') || 
        j.includes('crusher') || j.includes('technician') || j.includes('teknisi') ||
        j.includes('analyst') || j.includes('analis')
      ) {
        return true;
      }
      return false;
    }

    // ── Constraint Solver Candidate Selection ────────────────
    function pilihKandidat(hari: string, shift: string, slot: any, sudahDipilihHariIni: Set<string>, subSessionTipe?: string) {
      function filterDasar(k: any, kelasTarget: string, matchDivisiStrict: boolean = true) {
        const jdwl = (k.jadwal[hari] || '').toUpperCase();
        let isMasuk = false;
        if (shift === 'pagi' && (jdwl === 'D' || jdwl === 'LS' || jdwl === 'S' || jdwl === 'NONSHIFT')) isMasuk = true;
        if (shift === 'malam' && (jdwl === 'N' || jdwl.startsWith('N'))) isMasuk = true;
        if (!isMasuk) return false;

        // PROTEKSI CUTI / TRAVEL DI HARI SENIN:
        // Personil yang masih cuti atau travel di hari Senin tidak boleh dapat jadwal minggu ini kecuali dia shift malam
        const seninStatus = (k.jadwal?.['Senin'] || '').toUpperCase().trim();
        if (isCutiOrTravel(seninStatus) && shift !== 'malam') {
          return false;
        }

        // STRICT DAY SHIFT RULE: MAX 1 SLOT PER WEEK PER PERSON (ZERO 2x IN DAY SHIFT)
        if (shift === 'pagi' && k.tugasMingguIni >= 1) return false;

        // STRICT RULE: SPV MAX 1 SLOT PER WEEK
        if (k.kelas === 'SPV' && k.tugasMingguIni >= 1) return false;

        // Non-SPV personnel MAX 2 slots per week (Night shift)
        if (k.tugasMingguIni >= 2) return false;
        if (sudahDipilihHariIni.has(k.nama)) return false;

        // Sub-session grouping rules on Hari Split:
        if (subSessionTipe === 'preparasi') {
          // Preparation sub-session: Preparation AND Maintenance personnel
          const isPrepGroup = k.divisi === 'Preparation' || k.divisi === 'Maintenance';
          if (!isPrepGroup) return false;
        } else if (subSessionTipe === 'laboratorium') {
          // Laboratory sub-session: Laboratory, Quality Assurance, Administration, and IC personnel
          const isLabGroup = k.divisi === 'Laboratory' || k.divisi === 'Quality Assurance' || k.divisi === 'Administration' || k.divisi === 'IC';
          if (!isLabGroup) return false;
        }

        // Exact slot section filter if matchDivisiStrict is true
        if (matchDivisiStrict && slot.divisi && slot.divisi !== 'All') {
          if (slot.divisi !== k.divisi) return false;
        }

        if (kelasTarget && kelasTarget !== 'All' && kelasTarget !== k.kelas) return false;
        return true;
      }

      // SENAM RULE (Khusus Senam dengan pool kru + staf):
      const isSenam = slot.kategori === 'Senam' || slot.isSenam || (slot.materi && slot.materi.toLowerCase().includes('senam'));

      // ── ATURAN DISTRIBUSI SENAM MERATA (Mencakup Kru & Staf) ──
      if (isSenam) {
        const availableWorkersOnDay = poolSenam.filter(k => {
          const jdwl = (k.jadwal[hari] || '').toUpperCase();
          let isMasuk = false;
          if (shift === 'pagi' && (['D', 'LS', 'S', 'NONSHIFT'].includes(jdwl) || jdwl.startsWith('D'))) isMasuk = true;
          if (shift === 'malam' && (jdwl === 'N' || jdwl.startsWith('N'))) isMasuk = true;
          if (!isMasuk) return false;

          // Proteksi Cuti / Travel hari Senin (kecuali shift malam)
          const seninStatus = (k.jadwal?.['Senin'] || '').toUpperCase().trim();
          if (isCutiOrTravel(seninStatus) && shift !== 'malam') return false;

          const curTugas = k.refKaryawan ? k.refKaryawan.tugasMingguIni : k.tugasMingguIni;
          if (shift === 'pagi' && curTugas >= 1) return false;
          if (shift === 'malam' && curTugas >= 2) return false;
          if (sudahDipilihHariIni.has(k.nama)) return false;
          return true;
        });

        if (availableWorkersOnDay.length > 0) {
          const globalMinSenam = Math.min(...availableWorkersOnDay.map(c => c.senamCount || 0));
          const strictlyFreshWorkers = availableWorkersOnDay.filter(c => (c.senamCount || 0) === globalMinSenam);
          return strictlyFreshWorkers;
        }
      }

      let kandidat: any[] = [];

      // Step 1: Try strict match (exact kelas and exact divisi)
      if (slot.kelas === 'SPV') {
        kandidat = poolKaryawan.filter(k => filterDasar(k, 'SPV', true));
        // AUTOMATIC FALLBACK: If no SPV is available, fallback to Foreman/Officer
        if (kandidat.length === 0) {
          kandidat = poolKaryawan.filter(k => filterDasar(k, 'Foreman/Officer', true));
          if (kandidat.length > 0) (kandidat as any)._isFallback = true;
        }
      } else if (slot.kelas === 'All') {
        // Prioritize Foreman/Officer and Admin over SPV
        kandidat = poolKaryawan.filter(k => filterDasar(k, 'All', true) && k.kelas !== 'SPV');
        if (kandidat.length === 0) {
          kandidat = poolKaryawan.filter(k => filterDasar(k, 'All', true));
        }
      } else {
        kandidat = poolKaryawan.filter(k => filterDasar(k, slot.kelas, true));
        if (kandidat.length === 0) {
          // Fallback to any kelas in same divisi
          kandidat = poolKaryawan.filter(k => filterDasar(k, 'All', true));
          if (kandidat.length > 0) (kandidat as any)._isFallback = true;
        }
      }

      // Step 2: If still no candidate, relax divisi filter within the subsession
      if (kandidat.length === 0) {
        kandidat = poolKaryawan.filter(k => filterDasar(k, 'All', false));
        if (kandidat.length > 0) (kandidat as any)._isFallback = true;
      }

      return kandidat;
    }

    function hitungScore(k: any, indexHariIni: number) {
      let score = 0;

      // ── REGULASI SAFETY 2 MINGGU ──
      // Personil yang belum pernah membawakan materi di periode minggu lalu
      // WAJIB mendapatkan materi di minggu ini (+500 poin prioritas tertinggi)
      if (k.tugasMingguLalu === 0) {
        score += 500;
      } else {
        // Personil yang sudah membawakan materi minggu lalu diberi pendinginan (-200 poin)
        score -= 200;
      }

      // Prioritas jabatan non-SPV agar seluruh staff merata
      if (k.kelas === 'Foreman/Officer') score += 50;
      if (k.kelas === 'Admin') score += 40;

      // Distribusi minggu berjalan: Prioritaskan penuh yang belum mendapat tugas sama sekali
      if (k.tugasMingguIni === 0) {
        score += 1000;
        if (k.cutiMingguIni) score += 80; // Segera jadwalkan sebelum masuk jadwal cuti
      } else {
        score -= 2000; // Penalti mutlak jika sudah memiliki 1 tugas di minggu berjalan
      }

      // Penalti jarak hari briefing berturut-turut
      if (k.hariTerakhirBriefingSesi >= 0) {
        const selisih = indexHariIni - k.hariTerakhirBriefingSesi;
        if (selisih === 1) score -= 150;
        else if (selisih === 2) score -= 50;
      }

      return score;
    }

    function pilihDariKandidat(kandidat: any[], indexHariIni: number) {
      if (kandidat.length === 0) return null;
      kandidat.forEach(k => { k.score = hitungScore(k, indexHariIni); });
      kandidat.sort((a, b) => b.score - a.score);
      const highest = kandidat[0].score;
      const topGrup = kandidat.filter(k => k.score === highest);
      return topGrup[Math.floor(Math.random() * topGrup.length)];
    }

    // ── Pemilihan 2 Instruktur Senam dalam 1 Slot (Prioritas Kru Gol 1 & Belum Pernah Senam, 1 Prep/Maint + 1 Lab) ──
    function pilihKandidatSenamPair(hari: string, shift: string, sudahDipilihHariIni: Set<string>, indexHariIni: number) {
      const availableWorkers = poolSenam.filter(k => {
        const jdwl = (k.jadwal[hari] || '').toUpperCase().trim();
        let isMasuk = false;
        if (shift === 'pagi' && (['D', 'LS', 'S', 'NONSHIFT'].includes(jdwl) || jdwl.startsWith('D'))) isMasuk = true;
        if (shift === 'malam' && (jdwl === 'N' || jdwl.startsWith('N'))) isMasuk = true;
        if (!isMasuk) return false;

        // Proteksi Cuti / Travel hari Senin (kecuali shift malam):
        const seninStatus = (k.jadwal?.['Senin'] || '').toUpperCase().trim();
        if (isCutiOrTravel(seninStatus) && shift !== 'malam') return false;

        const curTugas = k.refKaryawan ? k.refKaryawan.tugasMingguIni : k.tugasMingguIni;
        if (shift === 'pagi' && curTugas >= 1) return false;
        if (shift === 'malam' && curTugas >= 2) return false;
        if (sudahDipilihHariIni.has(k.nama)) return false;
        return true;
      });

      if (availableWorkers.length === 0) return { cand1: null, cand2: null };

      // Helper check divisi / section
      function isPrepMaint(w: any): boolean {
        const d = (w.divisi || '').toLowerCase();
        const s = (w.section || '').toLowerCase();
        return d === 'preparation' || d === 'maintenance' || s.includes('prep') || s.includes('maint');
      }

      function isLabGroup(w: any): boolean {
        const d = (w.divisi || '').toLowerCase();
        const s = (w.section || '').toLowerCase();
        return d === 'laboratory' || d === 'quality assurance' || s.includes('lab') || s.includes('qa') || s.includes('analyst');
      }

      // Scoring kandidat senam:
      // 1. Crew / Golongan 1 diprioritaskan utama (+3000 poin)
      // 2. Belum pernah senam (senamCount === 0) prioritas tertinggi (+2000 poin)
      // 3. Senam count terendah (penalti berdasarkan frekuensi senam yang sudah pernah dijalani)
      // 4. Tugas minggu ini terendah
      const scored = availableWorkers.map(w => {
        const isCrew = isCrewOrGol1(w);
        const count = w.senamCount || 0;
        const curTugas = w.refKaryawan ? w.refKaryawan.tugasMingguIni : w.tugasMingguIni;
        let score = 0;
        if (isCrew) score += 3000;
        if (count === 0) score += 2000;
        else score -= count * 400;
        score -= curTugas * 200;
        score += Math.random() * 50;
        return { worker: w, score };
      });

      scored.sort((a, b) => b.score - a.score);

      // Pisahkan ke dalam grup Prep/Maintenance dan Laboratory
      const prepScored = scored.filter(s => isPrepMaint(s.worker));
      const labScored = scored.filter(s => isLabGroup(s.worker));

      let cand1: any = null;
      let cand2: any = null;

      // Prioritas 1 Prep/Maintenance + 1 Lab tiap jadwal
      if (prepScored.length > 0 && labScored.length > 0) {
        cand1 = prepScored[0].worker;
        cand2 = labScored[0].worker;
      } else if (labScored.length === 0 && prepScored.length >= 2) {
        // Jika lab sudah semua / habis, gunakan personil prep yang tersedia
        cand1 = prepScored[0].worker;
        cand2 = prepScored[1].worker;
      } else if (prepScored.length === 0 && labScored.length >= 2) {
        // Jika prep habis, gunakan personil lab yang tersedia
        cand1 = labScored[0].worker;
        cand2 = labScored[1].worker;
      } else {
        // Fallback umum
        cand1 = scored[0]?.worker || null;
        if (scored.length > 1) {
          cand2 = scored.find(s => s.worker.nama !== cand1?.nama)?.worker || null;
        }
      }

      if (cand1) {
        sudahDipilihHariIni.add(cand1.nama);
        cand1.tugasMingguIni++;
        cand1.senamCount = (cand1.senamCount || 0) + 1;
        cand1.hariTerakhirBriefingSesi = indexHariIni;
        if (cand1.refKaryawan) {
          cand1.refKaryawan.tugasMingguIni++;
          cand1.refKaryawan.senamCount = cand1.senamCount;
          cand1.refKaryawan.hariTerakhirBriefingSesi = indexHariIni;
        }
      }

      if (cand2) {
        sudahDipilihHariIni.add(cand2.nama);
        cand2.tugasMingguIni++;
        cand2.senamCount = (cand2.senamCount || 0) + 1;
        cand2.hariTerakhirBriefingSesi = indexHariIni;
        if (cand2.refKaryawan) {
          cand2.refKaryawan.tugasMingguIni++;
          cand2.refKaryawan.senamCount = cand2.senamCount;
          cand2.refKaryawan.hariTerakhirBriefingSesi = indexHariIni;
        }
      }

      return { cand1, cand2 };
    }

    // ── Logika Pemilihan & Daur Ulang Materi ──
    const usedMateriIdsInWeek = new Set<number>();
    const warnings: string[] = [];
    const exhaustedWarningCategories = new Set<string>();

    // ── Antrean Materi Internal (Diprioritaskan untuk Hari Sabtu) ──
    const pendingInternalMaterials = poolMateri.filter(m => m.isInternal && m.lastUsed === null);
    const assignedInternalIds = new Set<number>();

    function pickInternalForSaturday(kategoriTarget: string, subSessionTipe?: string, candidateDivision?: string) {
      const effDiv = (candidateDivision || '').toLowerCase();
      const candidates = pendingInternalMaterials.filter(m => {
        if (assignedInternalIds.has(m.id)) return false;
        if (usedMateriIdsInWeek.has(m.id)) return false;
        if (recentMateriTitles.has(m.judul.trim().toLowerCase())) return false;

        // Allowed document types check
        if (allowedTypes.length > 0 && !allowedTypes.includes(m.kategori)) {
          return false;
        }

        // Kategori match
        if (kategoriTarget && kategoriTarget !== 'All') {
          if ((m.kategori || 'Safety').toLowerCase() !== kategoriTarget.toLowerCase()) return false;
        }

        const subKat = m.subKategori || 'General';
        if (subKat === 'General') return true;

        // Prevent cross division on Saturday internal materials!
        if (effDiv.includes('lab')) {
          return subKat === 'Laboratory';
        }
        if (effDiv.includes('prep')) {
          return subKat === 'Preparation';
        }
        if (effDiv.includes('maint')) {
          return subKat === 'Maintenance';
        }
        if (effDiv.includes('ic') || effDiv.includes('inventory')) {
          return subKat === 'Inventory Control';
        }

        if (subSessionTipe === 'preparasi') return subKat === 'Preparation';
        if (subSessionTipe === 'laboratorium') return subKat === 'Laboratory';
        return true;
      });

      if (candidates.length > 0) {
        const chosen = candidates[0];
        assignedInternalIds.add(chosen.id);
        usedMateriIdsInWeek.add(chosen.id);
        return {
          judul: chosen.judul,
          kategori: chosen.kategori,
          subKategori: chosen.subKategori,
          id: chosen.id,
          fileUrl: chosen.fileUrl
        };
      }
      return null;
    }

    function isSopIk(judul?: string): boolean {
      if (!judul) return false;
      const j = judul.toLowerCase();
      return /\b(sop|ik)\b|instruksi kerja/i.test(j) || j.startsWith('ik ') || j.startsWith('sop ');
    }

    function isTopicForbiddenForSection(title: string, sec: string): boolean {
      const t = title.toLowerCase();
      const s = sec.toLowerCase();

      const isMaintTopic = t.includes('pengelasan') || t.includes('welding') || t.includes('las') ||
        t.includes('gerinda') || t.includes('cutting plasma') || t.includes('pengerutan kayu') ||
        t.includes('instalasi listrik') || t.includes('panel listrik') || t.includes('dust collector') ||
        t.includes('ducting') || t.includes('kompresor') || t.includes('kompressor') ||
        t.includes('kegagalan rem') || t.includes('alat berat') || t.includes('dashcam') ||
        t.includes('blind spot') || t.includes('manuver') || t.includes('lubrikasi');

      const isIcTopic = t.includes('inventory control') || t.includes('gudang') ||
        t.includes('warehouse') || t.includes('sparepart') || t.includes('spare part') ||
        t.includes('penyimpanan bahan kimia') || /\bic\b/.test(t);

      const isPrepTopic = t.includes('jaw crusher') || t.includes('pulverizer') ||
        t.includes('cup mill') || t.includes('sample basah') || t.includes('sampel basah') ||
        t.includes('sample kering') || t.includes('sampel kering') || t.includes('double roll') ||
        t.includes('sieve shaker') || t.includes('screen test') || t.includes('oven kontainer');

      const isLabTopic = t.includes('xrf') || t.includes('aas') || t.includes('fusion') ||
        t.includes('fused bead') || t.includes('titrasi') || t.includes('loi') ||
        t.includes('gravimetri') || t.includes('press powder') || t.includes('neraca') ||
        t.includes('timbangan digital') || t.includes('chiller') || t.includes('muffle furnace') ||
        t.includes('platinum ware') || t.includes('fume hood') || t.includes('scrubber');

      if (s.includes('lab')) {
        // Lab personnel: CANNOT receive Maintenance, IC, or Prep topics!
        if (isMaintTopic || isIcTopic || isPrepTopic) return true;
      } else if (s.includes('prep')) {
        // Prep personnel: CANNOT receive Maintenance, IC, or Lab topics!
        if (isMaintTopic || isIcTopic || isLabTopic) return true;
      } else if (s.includes('maint')) {
        // Maintenance personnel: CANNOT receive Lab, Prep, or IC topics!
        if (isLabTopic || isPrepTopic || isIcTopic) return true;
      } else if (s.includes('ic') || s.includes('inventory')) {
        // IC personnel: CANNOT receive Maintenance, Lab, or Prep topics!
        if (isMaintTopic || isLabTopic || isPrepTopic) return true;
      } else if (s.includes('admin')) {
        if (isMaintTopic || isIcTopic || isPrepTopic || isLabTopic) return true;
      }

      return false;
    }

    function pilihMateri(divisiTarget: string, kategoriTarget: string, materiTetap?: string | null, candidateDivision?: string, isGabunganSession?: boolean, prioritizeGeneral?: boolean) {
      // Kategori Senam
      if (kategoriTarget === 'Senam' || materiTetap?.toLowerCase().includes('senam')) {
        return {
          judul: "Senam",
          kategori: "Senam",
          subKategori: "General",
          id: null,
          fileUrl: null
        };
      }

      if (materiTetap) {
        return { judul: materiTetap, kategori: kategoriTarget || 'All', subKategori: 'General', id: null, fileUrl: null };
      }

      const effectiveSection = (candidateDivision || divisiTarget || '').toLowerCase();
      const cooldownDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // Cooldown 14 hari

      // Helper check for strict section matching
      function matchesSection(mSubKat: string, targetSec: string, isGabungan: boolean): boolean {
        const m = (mSubKat || 'General').toLowerCase();
        const s = targetSec.toLowerCase();

        if (isGabungan) {
          // Sesi Gabungan: Boleh materi General, atau jika materi spesifik harus cocok dengan section pemateri
          if (m === 'general' || m === 'all') return true;
          if (s.includes('prep')) return m === 'preparation';
          if (s.includes('lab')) return m === 'laboratory';
          if (s.includes('maint')) return m === 'maintenance';
          if (s.includes('ic') || s.includes('inventory')) return m === 'inventory control';
          if (s.includes('qa') || s.includes('quality')) return m === 'quality assurance' || m === 'laboratory';
          if (s.includes('admin')) return m === 'administration';
          return true;
        } else {
          // Sesi Split: HANYA section personil pemateri!
          if (s.includes('prep')) return m === 'preparation';
          if (s.includes('lab')) return m === 'laboratory';
          if (s.includes('maint')) return m === 'maintenance';
          if (s.includes('ic') || s.includes('inventory')) return m === 'inventory control';
          if (s.includes('qa') || s.includes('quality')) return m === 'quality assurance' || m === 'laboratory';
          if (s.includes('admin')) return m === 'administration' || m === 'general';
          return m === s;
        }
      }

      // 1. Filter Pool berdasarkan Tema Mingguan (allowedTypes) & Strict Section
      let themePool = poolMateri.filter(m => {
        const kat = m.kategori || 'Safety';
        const j = m.judul || '';
        if (kat === 'Senam' || j.toLowerCase().includes('senam') || j.toLowerCase().includes('logbook')) return false;

        // Jenis Dokumen / Weekly Theme filter:
        if (allowedTypes.length > 0) {
          if (!allowedTypes.includes(kat)) return false;
        } else if (kategoriTarget && kategoriTarget !== 'All') {
          if (kat.toLowerCase() !== kategoriTarget.toLowerCase()) return false;
        }

        // Strict Section Matching
        if (!matchesSection(m.subKategori || 'General', effectiveSection, Boolean(isGabunganSession))) return false;

        // Anti cross-division check
        if (isTopicForbiddenForSection(j, effectiveSection)) return false;

        return true;
      });

      // Tier 1: Fresh (Belum pernah dipakai) & belum dipakai minggu ini & tidak dibawakan di jadwal 1-2 minggu terakhir
      let tier1Candidates = themePool.filter(m => 
        m.lastUsed === null && 
        !usedMateriIdsInWeek.has(m.id) && 
        !recentMateriTitles.has(m.judul.trim().toLowerCase())
      );

      // Tier 2: Pernah dibawakan, TAPI sudah lewat masa jeda (> 14 hari lalu) & tidak dibawakan di jadwal 1-2 minggu terakhir
      let tier2Candidates = themePool.filter(m => 
        m.lastUsed !== null && 
        !usedMateriIdsInWeek.has(m.id) && 
        !recentMateriTitles.has(m.judul.trim().toLowerCase()) &&
        new Date(m.lastUsed).getTime() < cooldownDate.getTime()
      );

      // ── PRIORITAS SECTION GENERAL (Khusus Hari Kamis, Jumat, & Minggu) ──
      if (prioritizeGeneral) {
        const generalTier1 = tier1Candidates.filter(m => {
          const sub = (m.subKategori || 'General').toLowerCase().trim();
          return sub === 'general' || sub === 'all';
        });
        if (generalTier1.length > 0) {
          tier1Candidates = generalTier1;
        } else {
          const generalTier2 = tier2Candidates.filter(m => {
            const sub = (m.subKategori || 'General').toLowerCase().trim();
            return sub === 'general' || sub === 'all';
          });
          if (generalTier2.length > 0) {
            tier2Candidates = generalTier2;
          }
        }
      }

      let selected: any = null;

      if (tier1Candidates.length > 0) {
        selected = tier1Candidates[Math.floor(Math.random() * tier1Candidates.length)];
      } else if (tier2Candidates.length > 0) {
        tier2Candidates.sort((a, b) => new Date(a.lastUsed).getTime() - new Date(b.lastUsed).getTime());
        selected = tier2Candidates[0];
      } else {
        // Tier 3: FALLBACK DENGAN STRICT SECTION PROTECTION
        // Prioritas Fallback 1: Daur ulang materi terlama dari tema aktif pada section yang sama
        let recycleTheme = themePool.filter(m => !usedMateriIdsInWeek.has(m.id));
        if (recycleTheme.length === 0) recycleTheme = themePool;

        if (prioritizeGeneral) {
          const generalRecycle = recycleTheme.filter(m => {
            const sub = (m.subKategori || 'General').toLowerCase().trim();
            return sub === 'general' || sub === 'all';
          });
          if (generalRecycle.length > 0) {
            recycleTheme = generalRecycle;
          }
        }

        if (recycleTheme.length > 0) {
          recycleTheme.sort((a, b) => {
            if (!a.lastUsed && !b.lastUsed) return 0;
            if (!a.lastUsed) return -1;
            if (!b.lastUsed) return 1;
            return new Date(a.lastUsed).getTime() - new Date(b.lastUsed).getTime();
          });
          selected = recycleTheme[0];
        } else {
          // Prioritas Fallback 2: Materi tema di section ini benar-benar habis/kosong.
          // SISTEM TETAP MENGUNCI SECTION PEMATERI, lalu memperluas pencarian ke seluruh jenis dokumen lain (JSA, SOP, Safety, SDS, IBPR, dll.)
          const sectionPool = poolMateri.filter(m => {
            const kat = m.kategori || 'Safety';
            const j = m.judul || '';
            if (kat === 'Senam' || j.toLowerCase().includes('senam') || j.toLowerCase().includes('logbook')) return false;
            if (!matchesSection(m.subKategori || 'General', effectiveSection, Boolean(isGabunganSession))) return false;
            if (isTopicForbiddenForSection(j, effectiveSection)) return false;
            return true;
          });

          // Urutkan sectionPool: belum dipakai minggu ini -> fresh / terlama
          let sectionCandidates = sectionPool.filter(m => !usedMateriIdsInWeek.has(m.id));
          if (sectionCandidates.length === 0) sectionCandidates = sectionPool;

          if (prioritizeGeneral) {
            const generalSection = sectionCandidates.filter(m => {
              const sub = (m.subKategori || 'General').toLowerCase().trim();
              return sub === 'general' || sub === 'all';
            });
            if (generalSection.length > 0) {
              sectionCandidates = generalSection;
            }
          }

          if (sectionCandidates.length > 0) {
            sectionCandidates.sort((a, b) => {
              if (!a.lastUsed && !b.lastUsed) return 0;
              if (!a.lastUsed) return -1;
              if (!b.lastUsed) return 1;
              return new Date(a.lastUsed).getTime() - new Date(b.lastUsed).getTime();
            });
            selected = sectionCandidates[0];

            const themeLabel = allowedTypes.length > 0 ? allowedTypes.join(', ') : (kategoriTarget || 'Tema Aktif');
            const warnMsg = `Materi tema [${themeLabel}] untuk section ${effectiveSection || 'ini'} telah habis. Sistem mendaur ulang materi terlama dari section ${effectiveSection || 'ini'} ("${selected.judul}" - ${selected.kategori}) untuk menjaga kesesuaian tugas.`;
            if (!exhaustedWarningCategories.has(warnMsg)) {
              exhaustedWarningCategories.add(warnMsg);
              warnings.push(warnMsg);
            }
          }
        }
      }

      if (!selected) {
        // Fallback darurat jika database section benar-benar belum memiliki materi sama sekali
        const secLabel = effectiveSection.includes('prep') ? 'Preparation' : effectiveSection.includes('lab') ? 'Laboratory' : effectiveSection.includes('maint') ? 'Maintenance' : effectiveSection.includes('ic') ? 'Inventory Control' : 'General';
        return {
          judul: `Briefing Keselamatan & Operasional (${secLabel})`,
          kategori: "Safety",
          subKategori: secLabel,
          id: null,
          fileUrl: null
        };
      }

      if (selected.id) {
        usedMateriIdsInWeek.add(selected.id);
      }

      return {
        judul: selected.judul,
        kategori: selected.kategori || "Safety",
        subKategori: selected.subKategori || 'General',
        id: selected.id,
        fileUrl: selected.fileUrl
      };
    }

    // ── Generate Jadwal Per Hari ────────────────────────────
    const jadwalHasil: Record<string, any> = {};
    const HARI_GABUNGAN = ['Senin', 'Kamis', 'Jumat', 'Minggu'];

    URUTAN_HARI.forEach((hari, indexHariIni) => {
      const isGabungan = HARI_GABUNGAN.includes(hari);
      const dayCfg = uiConfig?.[hari] || {};
      const hasilHari: any = { tipe: isGabungan ? 'gabungan' : 'split', pagi: {}, malam: {} };

      // ── Day Shift (Pagi) ──────────────────────────────────
      const sudahDipilihPagi = new Set<string>();
      if (isGabungan) {
        let rawSlots = dayCfg.pagi?.gabungan || [];
        // Khusus hari Senin: Pastikan ada slot Prep (General Prep), slot Lab (General Lab), dan tepat 1 slot Senam (Duet 2 nama)
        if (hari === 'Senin') {
          const hasPrep = rawSlots.some((s: any) => s.divisi === 'Preparation');
          const hasLab = rawSlots.some((s: any) => s.divisi === 'Laboratory');
          let mondaySlots: any[] = [];
          if (hasPrep) {
            mondaySlots.push(rawSlots.find((s: any) => s.divisi === 'Preparation'));
          } else {
            mondaySlots.push({ divisi: 'Preparation', kelas: 'SPV', kategori: 'Safety', label: 'General Preparation' });
          }

          if (hasLab) {
            mondaySlots.push(rawSlots.find((s: any) => s.divisi === 'Laboratory'));
          } else {
            mondaySlots.push({ divisi: 'Laboratory', kelas: 'SPV', kategori: 'Safety', label: 'General Laboratory' });
          }

          // Cukup 1 slot Senam (berisi duet 2 instruktur senam kru)
          mondaySlots.push({ divisi: 'All', kelas: 'All', kategori: 'Senam', isSenam: true, label: 'Instruktur Senam' });
          rawSlots = mondaySlots;
        }

        hasilHari.pagi.gabungan = rawSlots.map((sl: any, slotIdx: number) => {
          const isSenamSlot = Boolean(sl.isSenam || sl.kategori === 'Senam' || sl.materiTetap?.toLowerCase().includes('senam'));

          // Slot Senam: langsung ambil 2 nama instruktur senam dalam 1 slot
          if (isSenamSlot) {
            const { cand1, cand2 } = pilihKandidatSenamPair(hari, 'pagi', sudahDipilihPagi, indexHariIni);
            const namaDisplay = cand1 && cand2 ? `${cand1.nama} / ${cand2.nama}` : cand1 ? cand1.nama : 'KOSONG (Tdk ada SDM)';
            const nikDisplay = cand1 && cand2 ? `${cand1.nik} / ${cand2.nik}` : cand1 ? cand1.nik : '';
            const ptDisplay = cand1 ? cand1.pt : (cand2 ? cand2.pt : 'TBP');

            return {
              nama: namaDisplay,
              nik: nikDisplay,
              pt: ptDisplay,
              materi: 'Senam',
              kategori: 'Senam',
              subKategori: 'General',
              kelas: 'All',
              divisi: 'All',
              fileUrl: null,
              isFallback: false,
              isLogbook: false,
              isSenam: true,
              materiId: null,
              isManagerSpt: false
            };
          }

          let terpilih: any = null;
          let isManagerSpt = false;
          let isFallback = false;

          // Override SPT / Manager di hari Senin (Pagi):
          if (hari === 'Senin' && slotIdx === 0 && sl.divisi === 'Preparation' && seninConfig?.prepPresenter && seninConfig.prepPresenter !== 'SPV') {
            const mgr = managerSptList.find((m: any) => m.nik === seninConfig.prepPresenter || m.nama === seninConfig.prepPresenter);
            if (mgr) {
              terpilih = { ...mgr, kelas: 'Manager/SPT', divisi: 'Preparation' };
              isManagerSpt = true;
              sudahDipilihPagi.add(terpilih.nama);
              // PENTING: SPT/Manager TIDAK DIHITUNG BEBAN TUGAS! (tugasMingguIni tidak bertambah)
            }
          } else if (hari === 'Senin' && slotIdx === 1 && sl.divisi === 'Laboratory' && seninConfig?.labPresenter && seninConfig.labPresenter !== 'SPV') {
            const mgr = managerSptList.find((m: any) => m.nik === seninConfig.labPresenter || m.nama === seninConfig.labPresenter);
            if (mgr) {
              terpilih = { ...mgr, kelas: 'Manager/SPT', divisi: 'Laboratory' };
              isManagerSpt = true;
              sudahDipilihPagi.add(terpilih.nama);
              // PENTING: SPT/Manager TIDAK DIHITUNG BEBAN TUGAS!
            }
          }

          if (!terpilih) {
            const cand = pilihKandidat(hari, 'pagi', sl, sudahDipilihPagi);
            terpilih = pilihDariKandidat(cand, indexHariIni);
            if (terpilih) {
              sudahDipilihPagi.add(terpilih.nama);
              terpilih.tugasMingguIni++;
              terpilih.hariTerakhirBriefingSesi = indexHariIni;
            }
            isFallback = Boolean((cand as any)?._isFallback);
          }
          
          // Pemilihan Materi:
          let materiRes: any = null;
          if (hari === 'Senin' && slotIdx === 0 && sl.divisi === 'Preparation') {
            materiRes = { 
              judul: seninConfig?.prepMateriJudul || 'General Preparation', 
              kategori: seninConfig?.prepMateriKategori || 'Safety', 
              subKategori: 'Preparation', 
              id: seninConfig?.prepMateriId || null, 
              fileUrl: null 
            };
          } else if (hari === 'Senin' && slotIdx === 1 && sl.divisi === 'Laboratory') {
            materiRes = { 
              judul: seninConfig?.labMateriJudul || 'General Laboratory', 
              kategori: seninConfig?.labMateriKategori || 'Safety', 
              subKategori: 'Laboratory', 
              id: seninConfig?.labMateriId || null, 
              fileUrl: null 
            };
          } else {
            // General Preparation atau General Laboratory (Sabtu tetap ada cek internal)
            let satRes = (hari === 'Sabtu' && !sl.isSenam && sl.kategori !== 'Senam') ? pickInternalForSaturday(sl.kategori) : null;
            if (satRes) {
              materiRes = satRes;
            } else {
              const isPrioritizeGeneral = ['Kamis', 'Jumat', 'Minggu'].includes(hari);
              materiRes = pilihMateri(
                sl.divisi, 
                sl.kategori, 
                sl.materiTetap, 
                terpilih?.divisi || sl.divisi, 
                true,
                isPrioritizeGeneral
              );
            }
          }

          return {
            nama: terpilih ? terpilih.nama : 'KOSONG (Tdk ada SDM)',
            nik: terpilih ? terpilih.nik : '',
            pt: terpilih ? terpilih.pt : '',
            materi: materiRes.judul,
            kategori: materiRes.kategori,
            subKategori: materiRes.subKategori,
            kelas: isManagerSpt ? 'Manager/SPT' : (terpilih?.kelas || sl.kelas),
            divisi: terpilih?.divisi || sl.divisi,
            fileUrl: materiRes.fileUrl,
            isFallback: isFallback,
            isLogbook: Boolean(sl.isLogbook),
            isSenam: false,
            materiId: materiRes.id,
            isManagerSpt: isManagerSpt
          };
        });
      } else {
        const slotsPrep = dayCfg.pagi?.preparasi || [];
        const slotsLab = dayCfg.pagi?.laboratorium || [];

        // Preparation sub-session: Prep + Maintenance
        hasilHari.pagi.preparasi = slotsPrep.map((sl: any) => {
          const cand = pilihKandidat(hari, 'pagi', sl, sudahDipilihPagi, 'preparasi');
          const terpilih = pilihDariKandidat(cand, indexHariIni);
          if (terpilih) {
            sudahDipilihPagi.add(terpilih.nama);
            terpilih.tugasMingguIni++;
            terpilih.hariTerakhirBriefingSesi = indexHariIni;
            if (sl.kategori === 'Senam' || sl.isSenam) {
              terpilih.senamCount = (terpilih.senamCount || 0) + 1;
            }
          }
          const isFallback = Boolean((cand as any)?._isFallback);

          // Cek materi internal jika hari Sabtu
          let materiRes = (hari === 'Sabtu' && !sl.isSenam && sl.kategori !== 'Senam') ? pickInternalForSaturday(sl.kategori, 'preparasi', terpilih?.divisi || 'Preparation') : null;
          if (!materiRes) {
            materiRes = pilihMateri(sl.divisi || 'Preparation', sl.kategori, sl.materiTetap, terpilih?.divisi || 'Preparation', false);
          }

          return {
            nama: terpilih ? terpilih.nama : 'KOSONG (Tdk ada SDM)',
            nik: terpilih ? terpilih.nik : '',
            pt: terpilih ? terpilih.pt : '',
            materi: materiRes.judul,
            kategori: materiRes.kategori,
            subKategori: materiRes.subKategori,
            kelas: sl.kelas,
            divisi: terpilih?.divisi || sl.divisi || 'Preparation',
            fileUrl: materiRes.fileUrl,
            isFallback: isFallback,
            isSenam: sl.kategori === 'Senam' || Boolean(sl.isSenam),
            materiId: materiRes.id
          };
        });

        // Laboratory sub-session: Lab + QA + Admin + IC
        hasilHari.pagi.laboratorium = slotsLab.map((sl: any) => {
          const cand = pilihKandidat(hari, 'pagi', sl, sudahDipilihPagi, 'laboratorium');
          const terpilih = pilihDariKandidat(cand, indexHariIni);
          if (terpilih) {
            sudahDipilihPagi.add(terpilih.nama);
            terpilih.tugasMingguIni++;
            terpilih.hariTerakhirBriefingSesi = indexHariIni;
            if (sl.kategori === 'Senam' || sl.isSenam) {
              terpilih.senamCount = (terpilih.senamCount || 0) + 1;
            }
          }
          const isFallback = Boolean((cand as any)?._isFallback);

          // Cek materi internal jika hari Sabtu
          let materiRes = (hari === 'Sabtu' && !sl.isSenam && sl.kategori !== 'Senam') ? pickInternalForSaturday(sl.kategori, 'laboratorium', terpilih?.divisi || 'Laboratory') : null;
          if (!materiRes) {
            materiRes = pilihMateri(sl.divisi || 'Laboratory', sl.kategori, sl.materiTetap, terpilih?.divisi || 'Laboratory', false);
          }

          return {
            nama: terpilih ? terpilih.nama : 'KOSONG (Tdk ada SDM)',
            nik: terpilih ? terpilih.nik : '',
            pt: terpilih ? terpilih.pt : '',
            materi: materiRes.judul,
            kategori: materiRes.kategori,
            subKategori: materiRes.subKategori,
            kelas: sl.kelas,
            divisi: terpilih?.divisi || sl.divisi || 'Laboratory',
            fileUrl: materiRes.fileUrl,
            isFallback: isFallback,
            isSenam: sl.kategori === 'Senam' || Boolean(sl.isSenam),
            materiId: materiRes.id
          };
        });
      }

      // ── Night Shift (Malam) ────────────────────────────────
      // Logika Sinkronisasi Materi Pagi dan Malam (Supaya materi sama rata)
      if (hari !== 'Minggu') {
        const sudahDipilihMalam = new Set<string>();
        if (isGabungan) {
          let rawSlots = dayCfg.malam?.gabungan || [];
          const morningSlots = hasilHari.pagi.gabungan || [];

          if (hari === 'Senin') {
            const hasPrep = rawSlots.some((s: any) => s.divisi === 'Preparation');
            const hasLab = rawSlots.some((s: any) => s.divisi === 'Laboratory');
            let mondaySlots: any[] = [];
            if (hasPrep) {
              mondaySlots.push(rawSlots.find((s: any) => s.divisi === 'Preparation'));
            } else {
              mondaySlots.push({ divisi: 'Preparation', kelas: 'SPV', kategori: 'Safety', label: 'General Preparation' });
            }

            if (hasLab) {
              mondaySlots.push(rawSlots.find((s: any) => s.divisi === 'Laboratory'));
            } else {
              mondaySlots.push({ divisi: 'Laboratory', kelas: 'SPV', kategori: 'Safety', label: 'General Laboratory' });
            }

            // Cukup 1 slot Senam malam (berisi duet 2 instruktur senam)
            mondaySlots.push({ divisi: 'All', kelas: 'All', kategori: 'Senam', isSenam: true, label: 'Instruktur Senam' });
            rawSlots = mondaySlots;
          }

          hasilHari.malam.gabungan = rawSlots.map((sl: any, slotIdx: number) => {
            const isSenamSlot = Boolean(sl.isSenam || sl.kategori === 'Senam' || sl.materiTetap?.toLowerCase().includes('senam'));

            // Slot Senam Malam: ambil 2 nama instruktur senam shift malam dalam 1 slot
            if (isSenamSlot) {
              const { cand1, cand2 } = pilihKandidatSenamPair(hari, 'malam', sudahDipilihMalam, indexHariIni);
              const namaDisplay = cand1 && cand2 ? `${cand1.nama} / ${cand2.nama}` : cand1 ? cand1.nama : 'KOSONG (Tdk ada SDM)';
              const nikDisplay = cand1 && cand2 ? `${cand1.nik} / ${cand2.nik}` : cand1 ? cand1.nik : '';
              const ptDisplay = cand1 ? cand1.pt : (cand2 ? cand2.pt : 'TBP');

              return {
                nama: namaDisplay,
                nik: nikDisplay,
                pt: ptDisplay,
                materi: 'Senam',
                kategori: 'Senam',
                subKategori: 'General',
                kelas: 'All',
                divisi: 'All',
                fileUrl: null,
                isFallback: false,
                isLogbook: false,
                isSenam: true,
                materiId: null,
                isManagerSpt: false
              };
            }

            const cand = pilihKandidat(hari, 'malam', sl, sudahDipilihMalam);
            const terpilih = pilihDariKandidat(cand, indexHariIni);
            if (terpilih) {
              sudahDipilihMalam.add(terpilih.nama);
              terpilih.tugasMingguIni++;
              terpilih.hariTerakhirBriefingSesi = indexHariIni;
            }
            const isFallback = Boolean((cand as any)?._isFallback);

            // Sinkronkan materi malam dengan materi pagi hari yang sama
            let materiRes: any = null;
            if (hari === 'Senin' && slotIdx === 0 && sl.divisi === 'Preparation') {
              materiRes = {
                judul: morningSlots[0]?.materi || 'General Preparation',
                kategori: morningSlots[0]?.kategori || 'Safety',
                subKategori: 'Preparation',
                id: morningSlots[0]?.materiId || null,
                fileUrl: null
              };
            } else if (hari === 'Senin' && slotIdx === 1 && sl.divisi === 'Laboratory') {
              materiRes = {
                judul: morningSlots[1]?.materi || 'General Laboratory',
                kategori: morningSlots[1]?.kategori || 'Safety',
                subKategori: 'Laboratory',
                id: morningSlots[1]?.materiId || null,
                fileUrl: null
              };
            } else if (sl.materiTetap) {
              materiRes = { judul: sl.materiTetap, kategori: sl.kategori || 'All', subKategori: 'General', id: null, fileUrl: null };
            } else if (morningSlots[slotIdx] && morningSlots[slotIdx].materi && !morningSlots[slotIdx].isSenam && !morningSlots[slotIdx].isLogbook && !morningSlots[slotIdx].materi.toLowerCase().includes('senam')) {
              const mSlot = morningSlots[slotIdx];
              materiRes = {
                judul: mSlot.materi,
                kategori: mSlot.kategori,
                subKategori: mSlot.subKategori,
                id: mSlot.materiId,
                fileUrl: mSlot.fileUrl
              };
            } else {
              const matchMorning = morningSlots.find((m: any) => m.kategori === sl.kategori && !m.isSenam && !m.isLogbook && !(m.materi || '').toLowerCase().includes('senam'));
              if (matchMorning) {
                materiRes = {
                  judul: matchMorning.materi,
                  kategori: matchMorning.kategori,
                  subKategori: matchMorning.subKategori,
                  id: matchMorning.materiId,
                  fileUrl: matchMorning.fileUrl
                };
              } else {
                const isPrioritizeGeneral = ['Kamis', 'Jumat', 'Minggu'].includes(hari);
                materiRes = pilihMateri(sl.divisi, sl.kategori, sl.materiTetap, terpilih?.divisi || sl.divisi, true, isPrioritizeGeneral);
              }
            }

            return {
              nama: terpilih ? terpilih.nama : 'KOSONG (Tdk ada SDM)',
              nik: terpilih ? terpilih.nik : '',
              pt: terpilih ? terpilih.pt : '',
              materi: materiRes.judul,
              kategori: materiRes.kategori,
              subKategori: materiRes.subKategori,
              kelas: sl.kelas,
              divisi: terpilih?.divisi || sl.divisi,
              fileUrl: materiRes.fileUrl,
              isFallback: isFallback,
              isLogbook: Boolean(sl.isLogbook),
              isSenam: false,
              materiId: materiRes.id
            };
          });
        } else {
          const slotsPrep = dayCfg.malam?.preparasi || [];
          const slotsLab = dayCfg.malam?.laboratorium || [];
          const morningPrep = hasilHari.pagi.preparasi || [];
          const morningLab = hasilHari.pagi.laboratorium || [];

          hasilHari.malam.preparasi = slotsPrep.map((sl: any, slotIdx: number) => {
            if (sl.kategori === 'Senam') sl.kategori = allowedTypes[0] || 'Safety';
            sl.isSenam = false;

            const cand = pilihKandidat(hari, 'malam', sl, sudahDipilihMalam, 'preparasi');
            const terpilih = pilihDariKandidat(cand, indexHariIni);
            if (terpilih) {
              sudahDipilihMalam.add(terpilih.nama);
              terpilih.tugasMingguIni++;
              terpilih.hariTerakhirBriefingSesi = indexHariIni;
            }
            const isFallback = Boolean((cand as any)?._isFallback);

            // Sinkronkan materi preparasi malam dengan preparasi pagi
            let materiRes: any = null;
            if (sl.materiTetap) {
              materiRes = { judul: sl.materiTetap, kategori: sl.kategori || 'All', subKategori: 'General', id: null, fileUrl: null };
            } else if (morningPrep[slotIdx] && morningPrep[slotIdx].materi && !morningPrep[slotIdx].isSenam && !morningPrep[slotIdx].materi.toLowerCase().includes('senam')) {
              const mSlot = morningPrep[slotIdx];
              materiRes = {
                judul: mSlot.materi,
                kategori: mSlot.kategori,
                subKategori: mSlot.subKategori,
                id: mSlot.materiId,
                fileUrl: mSlot.fileUrl
              };
            } else {
              const matchMorning = morningPrep.find((m: any) => m.kategori === sl.kategori && !m.isSenam && !(m.materi || '').toLowerCase().includes('senam'));
              if (matchMorning) {
                materiRes = {
                  judul: matchMorning.materi,
                  kategori: matchMorning.kategori,
                  subKategori: matchMorning.subKategori,
                  id: matchMorning.materiId,
                  fileUrl: matchMorning.fileUrl
                };
              } else {
                materiRes = pilihMateri(sl.divisi || 'Preparation', sl.kategori, sl.materiTetap, terpilih?.divisi || 'Preparation', false);
              }
            }

            return {
              nama: terpilih ? terpilih.nama : 'KOSONG (Tdk ada SDM)',
              nik: terpilih ? terpilih.nik : '',
              pt: terpilih ? terpilih.pt : '',
              materi: materiRes.judul,
              kategori: materiRes.kategori,
              subKategori: materiRes.subKategori,
              kelas: sl.kelas,
              divisi: terpilih?.divisi || sl.divisi || 'Preparation',
              fileUrl: materiRes.fileUrl,
              isFallback: isFallback,
              isSenam: false,
              materiId: materiRes.id
            };
          });

          hasilHari.malam.laboratorium = slotsLab.map((sl: any, slotIdx: number) => {
            if (sl.kategori === 'Senam') sl.kategori = allowedTypes[0] || 'Safety';
            sl.isSenam = false;

            const cand = pilihKandidat(hari, 'malam', sl, sudahDipilihMalam, 'laboratorium');
            const terpilih = pilihDariKandidat(cand, indexHariIni);
            if (terpilih) {
              sudahDipilihMalam.add(terpilih.nama);
              terpilih.tugasMingguIni++;
              terpilih.hariTerakhirBriefingSesi = indexHariIni;
            }
            const isFallback = Boolean((cand as any)?._isFallback);

            // Sinkronkan materi lab malam dengan lab pagi
            let materiRes: any = null;
            if (sl.materiTetap) {
              materiRes = { judul: sl.materiTetap, kategori: sl.kategori || 'All', subKategori: 'General', id: null, fileUrl: null };
            } else if (morningLab[slotIdx] && morningLab[slotIdx].materi && !morningLab[slotIdx].isSenam && !morningLab[slotIdx].materi.toLowerCase().includes('senam')) {
              const mSlot = morningLab[slotIdx];
              materiRes = {
                judul: mSlot.materi,
                kategori: mSlot.kategori,
                subKategori: mSlot.subKategori,
                id: mSlot.materiId,
                fileUrl: mSlot.fileUrl
              };
            } else {
              const matchMorning = morningLab.find((m: any) => m.kategori === sl.kategori && !m.isSenam && !(m.materi || '').toLowerCase().includes('senam'));
              if (matchMorning) {
                materiRes = {
                  judul: matchMorning.materi,
                  kategori: matchMorning.kategori,
                  subKategori: matchMorning.subKategori,
                  id: matchMorning.materiId,
                  fileUrl: matchMorning.fileUrl
                };
              } else {
                materiRes = pilihMateri(sl.divisi || 'Laboratory', sl.kategori, sl.materiTetap, terpilih?.divisi || 'Laboratory', false);
              }
            }

            return {
              nama: terpilih ? terpilih.nama : 'KOSONG (Tdk ada SDM)',
              nik: terpilih ? terpilih.nik : '',
              pt: terpilih ? terpilih.pt : '',
              materi: materiRes.judul,
              kategori: materiRes.kategori,
              subKategori: materiRes.subKategori,
              kelas: sl.kelas,
              divisi: terpilih?.divisi || sl.divisi || 'Laboratory',
              fileUrl: materiRes.fileUrl,
              isFallback: isFallback,
              isSenam: false,
              materiId: materiRes.id
            };
          });
        }
      }

      jadwalHasil[hari] = hasilHari;
    });

    res.json({
      success: true,
      poolCount: poolKaryawan.length,
      dates: Object.fromEntries(Object.entries(dates).map(([h, d]) => [h, { iso: d.iso, display: d.display }])),
      jadwal: jadwalHasil,
      warnings: warnings
    });
  } catch (error: any) {
    console.error("Error in P5M randomize:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// COMMIT & PERSISTENCE ENDPOINTS
// ============================================================
p5mRouter.post("/schedules", async (req, res) => {
  try {
    const { scheduleId, id, dateStart, dateEnd, scheduleData, config, summary, materiItems, createdBy } = req.body;

    const targetId = scheduleId || id;
    let savedRecord: any = null;
    let isUpdate = false;

    if (targetId) {
      const existing = await db.select().from(p5mSchedules).where(eq(p5mSchedules.id, Number(targetId))).limit(1);
      if (existing.length > 0) {
        isUpdate = true;
        const updated = await db.update(p5mSchedules).set({
          dateStart: dateStart || existing[0].dateStart,
          dateEnd: dateEnd || existing[0].dateEnd,
          scheduleData,
          config,
          summary,
          createdBy: createdBy || existing[0].createdBy,
        }).where(eq(p5mSchedules.id, Number(targetId))).returning();
        savedRecord = updated[0];
      }
    }

    if (!savedRecord) {
      const inserted = await db.insert(p5mSchedules).values({
        dateStart,
        dateEnd,
        scheduleData,
        config,
        summary,
        createdBy: createdBy || 'Admin',
      }).returning();
      savedRecord = inserted[0];
    }

    // Update lastUsed timestamp for presented topics
    if (Array.isArray(materiItems)) {
      for (const item of materiItems) {
        if (item.judul && !item.judul.toLowerCase().includes('senam') && !item.judul.toLowerCase().includes('logbook')) {
          const usedDate = item.isoDate ? new Date(item.isoDate) : new Date();
          await db.update(p5mMateri)
            .set({ lastUsed: usedDate })
            .where(sql`LOWER(TRIM(${p5mMateri.judul})) = LOWER(TRIM(${item.judul}))`);
        }
      }
    }

    // Generate notifications & Web Push for personnel in upcoming / updated slots
    if (scheduleData && typeof scheduleData === 'object') {
      const URUTAN_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
      const nowUtc = new Date();
      const witTime = new Date(nowUtc.getTime() + (9 * 60 * 60 * 1000));
      const todayIso = witTime.toISOString().split('T')[0]; // "YYYY-MM-DD"

      const notificationsList: any[] = [];

      for (const [day, dayData] of Object.entries(scheduleData as Record<string, any>)) {
        if (!dayData) continue;

        // Calculate specific date for this day
        const dayIdx = URUTAN_HARI.indexOf(day);
        let assignmentDateIso = '';
        if (dayIdx >= 0 && dateStart) {
          const [y, m, d] = dateStart.split('-').map(Number);
          const assignDateObj = new Date(y, m - 1, d + dayIdx);
          const aY = assignDateObj.getFullYear();
          const aM = String(assignDateObj.getMonth() + 1).padStart(2, '0');
          const aD = String(assignDateObj.getDate()).padStart(2, '0');
          assignmentDateIso = `${aY}-${aM}-${aD}`;
        }

        // Only send notification for today or future briefing days (skip days already passed)
        if (assignmentDateIso && todayIso > assignmentDateIso) {
          continue;
        }

        for (const shift of ['pagi', 'malam']) {
          const sData = (dayData as any)[shift];
          if (!sData) continue;

          const slots: any[] = [];
          if ((dayData as any).tipe === 'gabungan') {
            (sData.gabungan || []).forEach((sl: any) => slots.push(sl));
          } else {
            (sData.preparasi || []).forEach((sl: any) => slots.push(sl));
            (sData.laboratorium || []).forEach((sl: any) => slots.push(sl));
          }

          for (const slot of slots) {
            const slotNik = (slot.nik || '').trim();
            const slotNama = (slot.nama || '').trim();
            const slotMateri = (slot.materi || '').trim();

            if (slotNik && slotNama && !slotNama.toLowerCase().includes('kosong') && slotMateri) {
              const shiftLabel = shift === 'pagi' ? 'Pagi (Day Shift)' : 'Malam (Night Shift)';
              const notifTitle = isUpdate ? "Pembaruan Jadwal & Materi P5M" : "Jadwal P5M Mingguan";
              const notifMsg = `Halo ${slotNama}, Anda dijadwalkan membawakan materi P5M "${slotMateri}" untuk hari ${day} (${shiftLabel})${assignmentDateIso ? ` tgl ${assignmentDateIso}` : ''}. Silakan tinjau materi & flyer.`;

              notificationsList.push({
                userId: slotNik,
                title: notifTitle,
                message: notifMsg,
                type: 'info',
                link: '/p5m'
              });
            }
          }
        }
      }

      // Notifications are only sent to assigned speakers (slotNik) above.
      // General broadcast announcement (userId: null) is omitted to avoid spamming team members not on duty.

      // Batch insert notifications and trigger Web Push
      if (notificationsList.length > 0) {
        try {
          const insertedNotifs = await db.insert(notifications).values(notificationsList).returning();
          insertedNotifs.forEach((n: any) => sendWebPush(n));
        } catch (notifErr) {
          console.error("Error creating P5M schedule notifications:", notifErr);
        }
      }
    }

    res.json({ 
      success: true, 
      isUpdate, 
      message: isUpdate 
        ? "Jadwal P5M berhasil diperbarui & disinkronkan ke personil terkait!" 
        : "Jadwal P5M berhasil dipublikasikan!", 
      data: savedRecord 
    });
  } catch (error: any) {
    console.error("Error saving P5M schedule:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

p5mRouter.get("/schedules", async (req, res) => {
  try {
    const list = await db.select().from(p5mSchedules).orderBy(desc(p5mSchedules.id)).limit(30);
    res.json({ success: true, data: list });
  } catch (error: any) {
    console.error("Error fetching P5M schedules:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

p5mRouter.get("/schedules/latest", async (req, res) => {
  try {
    const weekDate = req.query.weekDate as string;
    if (weekDate) {
      const { dates } = getWeekDates(weekDate);
      const mondayIso = dates['Senin']?.iso;
      const sundayIso = dates['Minggu']?.iso;

      const found = await db.select().from(p5mSchedules)
        .where(
          or(
            eq(p5mSchedules.dateStart, mondayIso),
            and(
              lte(p5mSchedules.dateStart, sundayIso),
              gte(p5mSchedules.dateEnd, mondayIso)
            )
          )
        )
        .orderBy(desc(p5mSchedules.id))
        .limit(1);

      return res.json({ success: true, data: found[0] || null });
    }

    const latest = await db.select().from(p5mSchedules).orderBy(desc(p5mSchedules.id)).limit(1);
    res.json({ success: true, data: latest[0] || null });
  } catch (error: any) {
    console.error("Error fetching latest P5M schedule:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});



// ============================================================
// USER ASSIGNMENT NOTIFICATION (With Past Date Filter)
// ============================================================
p5mRouter.get("/schedules/user-assignment", async (req, res) => {
  try {
    const nik = (req.query.nik as string || '').trim().toLowerCase();
    const name = (req.query.name as string || '').trim().toLowerCase();
    const includePast = req.query.includePast === 'true' || req.query.forCard === 'true';

    if (!nik && !name) {
      return res.json({ success: true, assignment: null });
    }

    const latest = await db.select().from(p5mSchedules).orderBy(desc(p5mSchedules.id)).limit(1);
    if (latest.length === 0 || !latest[0].scheduleData) {
      return res.json({ success: true, assignment: null });
    }

    const schedule = latest[0];
    const sch = schedule.scheduleData as Record<string, any>;
    const dateStart = schedule.dateStart || '';
    const dateEnd = schedule.dateEnd || '';

    // Calculate current date in WIT (UTC+9)
    const nowUtc = new Date();
    const witTime = new Date(nowUtc.getTime() + (9 * 60 * 60 * 1000));
    const todayIso = witTime.toISOString().split('T')[0]; // "YYYY-MM-DD"

    const URUTAN_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    const allAssignments: any[] = [];

    for (const day of URUTAN_HARI) {
      const dayData = sch[day];
      if (!dayData) continue;

      // 1. Calculate specific date for this day
      const dayIdx = URUTAN_HARI.indexOf(day);
      let assignmentDateIso = '';
      if (dayIdx >= 0 && dateStart) {
        const [y, m, d] = dateStart.split('-').map(Number);
        const assignDateObj = new Date(y, m - 1, d + dayIdx);
        const aY = assignDateObj.getFullYear();
        const aM = String(assignDateObj.getMonth() + 1).padStart(2, '0');
        const aD = String(assignDateObj.getDate()).padStart(2, '0');
        assignmentDateIso = `${aY}-${aM}-${aD}`;
      }

      // 2. Check if the briefing day has already passed or is today
      const isPast = Boolean(assignmentDateIso && todayIso > assignmentDateIso);
      const isToday = Boolean(assignmentDateIso && todayIso === assignmentDateIso);

      for (const shift of ['pagi', 'malam']) {
        const sData = (dayData as any)[shift];
        if (!sData) continue;

        const slotList: any[] = [];
        if ((dayData as any).tipe === 'gabungan') {
          (sData.gabungan || []).forEach((sl: any) => slotList.push({ ...sl, zone: 'Gabungan' }));
        } else {
          (sData.preparasi || []).forEach((sl: any) => slotList.push({ ...sl, zone: 'Preparasi' }));
          (sData.laboratorium || []).forEach((sl: any) => slotList.push({ ...sl, zone: 'Laboratorium' }));
        }

        for (const slot of slotList) {
          const slotNik = (slot.nik || '').trim().toLowerCase();
          const slotNama = (slot.nama || '').trim().toLowerCase();
          let isMatch = false;
          if (nik && slotNik) {
            isMatch = slotNik === nik || slotNik.replace(/[^a-z0-9]/gi, '') === nik.replace(/[^a-z0-9]/gi, '');
          } else if (name && slotNama) {
            isMatch = slotNama === name || slotNama.includes(name) || name.includes(slotNama);
          }

          if (isMatch && !slotNama.includes('kosong')) {
            const hasFlyer = !slot.isSenam && slot.materi && !slot.materi.toLowerCase().includes('senam');

            let freshFileUrl: string | null = null;
            if (hasFlyer) {
              const materiRow = await db.select().from(p5mMateri).where(eq(p5mMateri.judul, slot.materi)).limit(1);
              if (materiRow.length > 0 && materiRow[0].fileUrl) {
                freshFileUrl = materiRow[0].fileUrl;
              } else {
                freshFileUrl = `/api/p5m/flyer?title=${encodeURIComponent(slot.materi)}`;
              }
            }

            const candidate = {
              scheduleId: schedule.id,
              dateStart,
              dateEnd,
              day,
              assignmentDate: assignmentDateIso,
              isPast,
              isToday,
              shift: shift === 'pagi' ? 'Day Shift (Pagi)' : 'Night Shift (Malam)',
              shiftKey: shift,
              zone: slot.zone,
              nama: slot.nama,
              nik: slot.nik,
              materi: slot.materi,
              kategori: slot.kategori,
              subKategori: slot.subKategori,
              fileUrl: freshFileUrl,
              isSenam: slot.isSenam,
              isCompleted: Boolean(slot.isCompleted),
              completedAt: slot.completedAt || null,
              sessionIndex: allAssignments.length + 1
            };

            allAssignments.push(candidate);
          }
        }
      }
    }

    // Determine the most relevant single assignment for backwards-compatibility:
    // 1. If today's assignment exists and pending -> today's
    // 2. Earliest upcoming assignment (not past and not completed)
    // 3. Today's assignment even if completed
    // 4. Earliest upcoming assignment (not past)
    // 5. Latest assignment in the week
    let activeAssignment: any = null;
    if (allAssignments.length > 0) {
      activeAssignment = allAssignments.find(a => a.isToday && !a.isCompleted) ||
        allAssignments.find(a => !a.isPast && !a.isCompleted) ||
        allAssignments.find(a => a.isToday) ||
        allAssignments.find(a => !a.isPast) ||
        allAssignments[allAssignments.length - 1];
    }

    // Filter allAssignments if !includePast is requested, BUT keep full list if nothing non-past
    const filteredAssignments = includePast
      ? allAssignments
      : allAssignments.filter(a => !a.isPast);

    const returnedList = (filteredAssignments.length > 0 ? filteredAssignments : allAssignments);

    res.json({
      success: true,
      assignment: activeAssignment || returnedList[0] || null,
      assignments: allAssignments,
      totalWeeklySessions: allAssignments.length
    });
  } catch (error: any) {
    console.error("Error checking user P5M assignment:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint untuk menandai materi P5M sudah selesai dibawakan / dilakukan oleh pemateri
p5mRouter.post("/schedules/mark-completed", async (req, res) => {
  try {
    const { scheduleId, day, shift, zone, nik, name, completed = true } = req.body;
    const cleanNik = (nik || '').trim().toLowerCase();
    const cleanName = (name || '').trim().toLowerCase();

    let targetSchedule: any = null;
    if (scheduleId) {
      const found = await db.select().from(p5mSchedules).where(eq(p5mSchedules.id, Number(scheduleId))).limit(1);
      if (found.length > 0) targetSchedule = found[0];
    }
    if (!targetSchedule) {
      const latest = await db.select().from(p5mSchedules).orderBy(desc(p5mSchedules.id)).limit(1);
      if (latest.length > 0) targetSchedule = latest[0];
    }

    if (!targetSchedule || !targetSchedule.scheduleData) {
      return res.status(404).json({ success: false, message: "Jadwal P5M tidak ditemukan" });
    }

    const sch = JSON.parse(JSON.stringify(targetSchedule.scheduleData));
    let slotUpdated = false;
    const nowIso = new Date().toISOString();

    for (const [sDay, dayData] of Object.entries(sch)) {
      if (day && sDay.toLowerCase() !== String(day).toLowerCase()) continue;
      if (!dayData) continue;

      for (const sShift of ['pagi', 'malam']) {
        if (shift && sShift.toLowerCase() !== String(shift).toLowerCase() && !String(shift).toLowerCase().includes(sShift)) continue;
        const sData = (dayData as any)[sShift];
        if (!sData) continue;

        const slotArrays: any[][] = [];
        if ((dayData as any).tipe === 'gabungan') {
          if (sData.gabungan) slotArrays.push(sData.gabungan);
        } else {
          if (sData.preparasi) slotArrays.push(sData.preparasi);
          if (sData.laboratorium) slotArrays.push(sData.laboratorium);
        }

        for (const arr of slotArrays) {
          for (const slot of arr) {
            const slotNik = (slot.nik || '').trim().toLowerCase();
            const slotNama = (slot.nama || '').trim().toLowerCase();
            let isMatch = false;

            if (cleanNik && slotNik) {
              isMatch = slotNik === cleanNik || slotNik.replace(/[^a-z0-9]/gi, '') === cleanNik.replace(/[^a-z0-9]/gi, '');
            } else if (cleanName && slotNama) {
              isMatch = slotNama === cleanName || slotNama.includes(cleanName) || cleanName.includes(slotNama);
            }

            if (isMatch) {
              slot.isCompleted = Boolean(completed);
              slot.completedAt = completed ? nowIso : null;
              slot.completedBy = name || nik || 'User';
              slotUpdated = true;
            }
          }
        }
      }
    }

    if (slotUpdated) {
      await db.update(p5mSchedules)
        .set({ scheduleData: sch })
        .where(eq(p5mSchedules.id, targetSchedule.id));
    }

    res.json({
      success: true,
      message: completed ? "Materi P5M berhasil ditandai sudah dilakukan!" : "Status materi P5M direset",
      isCompleted: Boolean(completed),
      completedAt: completed ? nowIso : null
    });
  } catch (error: any) {
    console.error("Error marking P5M as completed:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// REAL-TIME / STATIC FLYER SERVING & DOWNLOAD
// ============================================================
p5mRouter.get("/flyer", async (req, res) => {
  try {
    const title = (req.query.title as string || '').trim();
    const notionId = (req.query.notionId as string || '').trim();
    const id = (req.query.id as string || '').trim();
    const urlParam = (req.query.url as string || '').trim();
    const isDownload = req.query.download === 'true' || req.query.download === '1';

    let targetFileUrl = urlParam || '';
    let targetJudul = title || 'Flyer_P5M';

    if (!targetFileUrl) {
      if (id) {
        const row = await db.select().from(p5mMateri).where(eq(p5mMateri.id, Number(id))).limit(1);
        if (row.length > 0) {
          targetFileUrl = row[0].fileUrl || '';
          targetJudul = row[0].judul || targetJudul;
        }
      } else if (title) {
        const row = await db.select().from(p5mMateri).where(eq(p5mMateri.judul, title)).limit(1);
        if (row.length > 0) {
          targetFileUrl = row[0].fileUrl || '';
          targetJudul = row[0].judul || targetJudul;
        }
      }
    }

    // 1. If stored locally in /uploads/p5m/..., serve or download directly
    if (targetFileUrl && targetFileUrl.startsWith('/uploads/p5m/')) {
      const cleanPath = targetFileUrl.replace(/^\//, '');
      const localPath = path.join(process.cwd(), 'public', cleanPath);
      if (fs.existsSync(localPath)) {
        const fileExt = path.extname(localPath).toLowerCase();
        const safeName = `P5M_${targetJudul.replace(/[^a-zA-Z0-9_-]/g, '_')}${fileExt || '.png'}`;
        if (fileExt === '.xlsx') {
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        } else if (fileExt === '.xls') {
          res.setHeader('Content-Type', 'application/vnd.ms-excel');
        } else if (fileExt === '.pdf') {
          res.setHeader('Content-Type', 'application/pdf');
        }
        if (isDownload) {
          return res.download(localPath, safeName);
        }
        return res.sendFile(localPath);
      }
    }

    // 2. If it's a Google Drive URL, stream via authenticated Google Drive API
    const fileIdMatch = targetFileUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) || 
                        targetFileUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                        targetFileUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const driveFileId = fileIdMatch ? fileIdMatch[1] : null;

    if (driveFileId) {
      try {
        const meta = await drive.files.get({
          fileId: driveFileId,
          fields: 'id, name, mimeType',
          supportsAllDrives: true
        });
        const mimeType = meta.data.mimeType || 'image/png';
        const isXlsx = mimeType.includes('spreadsheet') || meta.data.name?.toLowerCase().endsWith('.xlsx') || targetJudul.toLowerCase().includes('.xlsx');
        const isXls = mimeType.includes('excel') || meta.data.name?.toLowerCase().endsWith('.xls') || targetJudul.toLowerCase().includes('.xls');
        const isPdf = !isXlsx && !isXls && (
          mimeType.includes('pdf') || 
          meta.data.name?.toLowerCase().endsWith('.pdf') ||
          targetJudul.toLowerCase().includes('.pdf') || 
          /\b(sop|ik)\b|instruksi kerja/i.test(targetJudul) ||
          targetJudul.startsWith('IK ') || 
          targetJudul.startsWith('SOP ') || 
          targetJudul.startsWith('JSA ') ||
          targetJudul.startsWith('JSA -')
        );

        let ext = '.png';
        let resContentType = mimeType;
        if (isXlsx) {
          ext = '.xlsx';
          resContentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else if (isXls) {
          ext = '.xls';
          resContentType = 'application/vnd.ms-excel';
        } else if (isPdf) {
          ext = '.pdf';
          resContentType = 'application/pdf';
        }
        const finalFilename = `P5M_${targetJudul.replace(/[^a-zA-Z0-9_-]/g, '_')}${ext}`;

        // Auto ensure anyone with the link can view so Google Drive embedded viewer never shows 'No preview available'
        drive.permissions.create({
          fileId: driveFileId,
          supportsAllDrives: true,
          requestBody: { role: 'reader', type: 'anyone' }
        }).catch(() => {});

        const driveStream = await drive.files.get({
          fileId: driveFileId,
          alt: 'media',
          supportsAllDrives: true
        }, { responseType: 'stream' });

        res.setHeader('Content-Type', resContentType);
        if (isDownload) {
          res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"`);
        } else {
          res.setHeader('Content-Disposition', `inline; filename="${finalFilename}"`);
        }
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return driveStream.data.pipe(res);
      } catch (driveErr: any) {
        console.warn('Google Drive API stream failed, fallback to direct fetch/redirect:', driveErr.message);
        if (isDownload) {
          return res.redirect(`https://drive.google.com/uc?export=download&id=${driveFileId}`);
        }

        // Try direct streaming from Drive CDN
        const candidateUrls = [
          `https://drive.google.com/uc?export=download&id=${driveFileId}`,
          `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w2000`,
          `https://lh3.googleusercontent.com/d/${driveFileId}`
        ];

        for (const cUrl of candidateUrls) {
          try {
            const fetchRes = await fetch(cUrl);
            if (!fetchRes.ok) continue;
            let contentType = fetchRes.headers.get('content-type') || 'image/png';
            const arrayBuf = await fetchRes.arrayBuffer();
            const buf = Buffer.from(arrayBuf);
            if (buf.subarray(0, 5).toString('ascii') === '%PDF-') {
              contentType = 'application/pdf';
            }
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return res.send(buf);
          } catch (err) {}
        }

        return res.redirect(`https://drive.google.com/file/d/${driveFileId}/preview`);
      }
    }

    // 3. Fallback: If it's another external URL
    if (targetFileUrl && targetFileUrl.startsWith('http')) {
      try {
        const fetchRes = await fetch(targetFileUrl);
        if (fetchRes.ok) {
          const contentType = fetchRes.headers.get('content-type') || 'image/png';
          const fallbackExt = contentType.includes('spreadsheet') ? '.xlsx' : contentType.includes('excel') ? '.xls' : contentType.includes('pdf') ? '.pdf' : '.png';
          const safeFallbackName = `P5M_${targetJudul.replace(/[^a-zA-Z0-9_-]/g, '_')}${fallbackExt}`;
          res.setHeader('Content-Type', contentType);
          if (isDownload) {
            res.setHeader('Content-Disposition', `attachment; filename="${safeFallbackName}"`);
          } else {
            res.setHeader('Content-Disposition', 'inline');
          }
          res.setHeader('Cache-Control', 'public, max-age=86400');
          const arrayBuffer = await fetchRes.arrayBuffer();
          return res.send(Buffer.from(arrayBuffer));
        }
      } catch (fErr: any) {
        console.warn("Direct stream failed, attempting redirect:", fErr.message);
        return res.redirect(targetFileUrl);
      }
    }

    return res.status(404).send('Flyer tidak ditemukan');
  } catch (error: any) {
    console.error('Error serving P5M flyer:', error);
    res.status(500).send('Gagal memuat flyer');
  }
});
