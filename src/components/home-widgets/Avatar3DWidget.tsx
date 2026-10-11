import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Sparkles, ShieldAlert, RefreshCw, Smile, Heart, Zap, Volume2, VolumeX,
  Palette, X, Check, Lock, Unlock, Trophy,
  Coffee, Search, MapPin, Footprints, Flame, MessageSquare,
  ChevronRight, Award, Shield, UserCheck, HelpCircle, Users, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { WidgetSize } from './types';
import { TbpAvatarCharacter } from '../avatar/TbpAvatarCharacter';
import { GbaOverworldMap } from '../avatar/GbaOverworldMap';
import { GbaCharacterSprite } from '../avatar/GbaCharacterSprite';
import { TempatNongkrongModal } from './TempatNongkrongModal';
import { getRankByXp } from '../../lib/pointBlankRanks';

interface Avatar3DWidgetProps {
  size: WidgetSize;
  userNik?: string;
  userName?: string;
  userSection?: string;
  userRole?: string;
}

// -------------------------------------------------------------
// PALETTE & ITEM DEFINITIONS (STARTERS & UNLOCKABLES)
// -------------------------------------------------------------
export interface AvatarItem {
  id: string;
  name: string;
  isUnlockedDefault: boolean;
  unlockReq: string;
  hex?: string;
  shadow?: string;
  accent?: string;
}

export const HEADWEAR_ITEMS: AvatarItem[] = [
  // Starter 1: Official White TBP Hard Hat (matching user photo)
  { id: 'helmet_white', name: 'Helm Putih TBP Resmi (Default Tambang TBP/GPS)', isUnlockedDefault: true, unlockReq: 'Starter Resmi TBP', hex: '#FFFFFF', shadow: '#CBD5E1' },
  { id: 'helmet_yellow', name: 'Helm Safety Kuning (K3)', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#FACC15', shadow: '#CA8A04' },
  { id: 'cap_navy', name: 'Topi Proyek Navy TBP', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#1E3A8A', shadow: '#172554' },
  { id: 'hijab_k3', name: 'Hijab Syari K3 TBP', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#EAB308', shadow: '#A16207' },
  // Unlockables
  { id: 'helmet_red', name: 'Helm Merah HSE & Safety', isUnlockedDefault: false, unlockReq: 'Buka di Level 2 (100 XP)', hex: '#DC2626', shadow: '#991B1B' },
  { id: 'helmet_blue', name: 'Helm Biru Teknisi Prep', isUnlockedDefault: false, unlockReq: 'Buka di Level 3 (250 XP)', hex: '#2563EB', shadow: '#1D4ED8' },
  { id: 'crown_champion', name: 'Mahkota Analis Teladan', isUnlockedDefault: false, unlockReq: 'Buka di Level 5 (500 XP)', hex: '#F59E0B', shadow: '#B45309' }
];

export const OUTFIT_ITEMS: AvatarItem[] = [
  // Starter 1: Official TBP Field Uniform (Fluo Lime-Green + Navy + Double Scotlight, matching photo)
  { id: 'uniform_tbp', name: 'Seragam Standar TBP (Hijau Fluo + Navy)', isUnlockedDefault: true, unlockReq: 'Seragam Resmi TBP/GPS', hex: '#84CC16', shadow: '#4D7C0F', accent: '#E2E8F0' },
  { id: 'lab_coat', name: 'Jas Laboratorium Kimia PrepLab', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#F8FAFC', shadow: '#CBD5E1', accent: '#0D9488' },
  { id: 'vest_orange', name: 'Rompi K3 Orange Standar', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#EA580C', shadow: '#9A3412', accent: '#F8FAFC' },
  { id: 'vest_green', name: 'Rompi K3 Hijau HSE', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#16A34A', shadow: '#166534', accent: '#F8FAFC' },
  // Unlockables
  { id: 'wearpack_navy', name: 'Wearpack Lapangan Navy', isUnlockedDefault: false, unlockReq: 'Buka di Level 2 (100 XP)', hex: '#1E3A8A', shadow: '#172554', accent: '#F97316' },
  { id: 'wearpack_red', name: 'Wearpack Fire & Rescue', isUnlockedDefault: false, unlockReq: 'Buka di Level 3 (250 XP)', hex: '#DC2626', shadow: '#991B1B', accent: '#FACC15' },
  { id: 'suit_spv', name: 'Setelan SPV / Superintendent', isUnlockedDefault: false, unlockReq: 'Buka di Level 4 (400 XP)', hex: '#334155', shadow: '#0F172A', accent: '#EF4444' },
  { id: 'vest_gold', name: 'Rompi Emas Zero Accident', isUnlockedDefault: false, unlockReq: 'Buka di Level 5 (500 XP)', hex: '#EAB308', shadow: '#854D0E', accent: '#FEF08A' }
];

export const EYE_ITEMS: AvatarItem[] = [
  // Starters
  { id: 'glasses_k3', name: 'Kacamata K3 Bening Anti-Debu', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#0284C7' },
  { id: 'normal', name: 'Wajah Ramah Senyum', isUnlockedDefault: true, unlockReq: 'Starter Gratis' },
  { id: 'happy', name: 'Mata Senyum Bahagia (^ ^)', isUnlockedDefault: true, unlockReq: 'Starter Gratis' },
  { id: 'wink', name: 'Kedip Percaya Diri ;)', isUnlockedDefault: true, unlockReq: 'Starter Gratis' },
  { id: 'focus', name: 'Fokus & Serius (Analis Lab)', isUnlockedDefault: true, unlockReq: 'Starter Gratis' },
  { id: 'kumis_jenggot', name: 'Kumis & Janggut Rapi Tambang', isUnlockedDefault: true, unlockReq: 'Starter Gratis' },
  { id: 'laugh', name: 'Tertawa Ceria Lebar :D', isUnlockedDefault: true, unlockReq: 'Starter Gratis' },
  // Unlockables
  { id: 'sunglasses', name: 'Kacamata Hitam Cool Lapangan', isUnlockedDefault: false, unlockReq: 'Buka di Level 2 (100 XP)', hex: '#0F172A' },
  { id: 'goggles_furnace', name: 'Goggles Furnace 1050°C', isUnlockedDefault: false, unlockReq: 'Buka di Level 3 (250 XP)', hex: '#EA580C' }
];

export const ACCESSORY_ITEMS: AvatarItem[] = [
  // 4 Starters
  { id: 'lanyard', name: 'Lanyard & ID Card TBP (Gantung)', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#EF4444' },
  { id: 'mask_k3', name: 'Masker Respirator Debu Nikel N95', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#06B6D4' },
  { id: 'none', name: 'Tanpa Aksesoris', isUnlockedDefault: true, unlockReq: 'Starter Gratis' },
  { id: 'radio_ht', name: 'Handy Talky (HT) Tambang K3', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#475569' },
  // Unlockables
  { id: 'ear_muff', name: 'Safety Ear Muff Crusher', isUnlockedDefault: false, unlockReq: 'Buka di Level 2 (100 XP)', hex: '#F97316' },
  { id: 'coffee_mug', name: 'Tumbler Kopi PrepLab', isUnlockedDefault: false, unlockReq: 'Streak 3 Hari Kerja', hex: '#8B5CF6' }
];

export const BOOTS_ITEMS: AvatarItem[] = [
  // Starters
  { id: 'boots_brown', name: 'Safety Boots Tambang Cokelat Kulit (Default TBP)', isUnlockedDefault: true, unlockReq: 'Standar TBP', hex: '#A26B38', shadow: '#6D3D14' },
  { id: 'boots_black', name: 'Safety Boots Hitam Steel-Toe', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#1E293B', shadow: '#0F172A' },
  { id: 'boots_grey', name: 'Sepatu Lab Anti-Static', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#64748B', shadow: '#334155' },
  // Unlockables
  { id: 'boots_yellow', name: 'Boots K3 High-Vis Kuning', isUnlockedDefault: false, unlockReq: 'Buka di Level 2 (100 XP)', hex: '#EAB308', shadow: '#A16207' }
];

export const SKIN_TONES = [
  { id: 'tan', name: 'Sawo Matang Alami', skin: '#E0AC69', skinShadow: '#8D5524' },
  { id: 'tan_warm', name: 'Sawo Matang Hangat', skin: '#D29758', skinShadow: '#7B4318' },
  { id: 'fair', name: 'Kuning Langsat Khas Nusantara', skin: '#F1C27D', skinShadow: '#C68642' },
  { id: 'fair_bright', name: 'Kuning Langsat Cerah', skin: '#FCE0B6', skinShadow: '#DF9B52' },
  { id: 'light', name: 'Putih Gading / Cerah', skin: '#FFE5C8', skinShadow: '#E0AC69' },
  { id: 'bronze', name: 'Tan Bronze Lapangan', skin: '#C68642', skinShadow: '#5C3A21' },
  { id: 'dark', name: 'Eksotis Gelap Manis', skin: '#8D5524', skinShadow: '#3A2010' },
  { id: 'deep_bronze', name: 'Deep Bronze Elegan', skin: '#6F3E1B', skinShadow: '#2C1405' }
];

// -------------------------------------------------------------
// SECTION-AWARE DIALOGUE POOL: TAMBANG NIKEL PREPARATION & LAB
// -------------------------------------------------------------
export interface SectionDialogue {
  sectionKey: 'preparation' | 'laboratory' | 'maintenance' | 'qa' | 'admin' | 'k3_tbp';
  sectionBadge: string;
  title: string;
  text: string;
}

export const NICKEL_DIALOGUES: SectionDialogue[] = [
  // 1. SECTION PREPARATION (Preparasi Sample Nikel: Limonite, Saprolite, Crusher, Oven, Pulverizer)
  { sectionKey: 'preparation', sectionBadge: 'Prep Nikel', title: 'Crusher: Sample Limonite & Saprolite', text: 'Sample Saprolite & Limonite siap di-crush! Cek hopper jaw crusher & roll crusher sebelum batch running.' },
  { sectionKey: 'preparation', sectionBadge: 'Prep Nikel', title: 'Oven: Pengeringan Suhu 105°C', text: 'Oven pengeringan 105°C menyala stabil. Pastikan kadar air (MC) konstan sebelum proses pulverizing.' },
  { sectionKey: 'preparation', sectionBadge: 'Prep Nikel', title: 'Pulverizer: 200 Mesh K3', text: 'Pulverizer 200 mesh berputar kencang! Selalu kunci mangkok ring mill & wajib kenakan ear muff K3.' },
  { sectionKey: 'preparation', sectionBadge: 'Prep Nikel', title: 'Sampling: Jones Riffle Splitter', text: 'Pembagian sample lewat Jones Riffle Splitter harus representatif, homogen, dan teliti.' },
  { sectionKey: 'preparation', sectionBadge: 'Prep Nikel', title: 'QC Prep: Pembersihan Mangkok', text: 'Bersihkan mangkok ring mill dengan pasir silika & air blow gun sebelum ganti batch nikel berikutnya.' },
  { sectionKey: 'preparation', sectionBadge: 'Prep Nikel', title: 'APD K3: Masker Respirator N95', text: 'Debu ore nikel pekat kawan! Pastikan respirator N95 terpasang rapat dan pas.' },
  { sectionKey: 'preparation', sectionBadge: 'Prep Nikel', title: 'Logbook: P2H Alat Preparasi', text: 'P2H crusher & rotary splitter shift ini selesai 100%. Siap running target tonase hari ini!' },
  { sectionKey: 'preparation', sectionBadge: 'Prep Nikel', title: 'Granulometri: Uji Ayakan Sieve', text: 'Uji ayakan sieve shaker mesh 200 wajib lolos 95% agar representatif saat ditembak XRF.' },

  // 2. SECTION LABORATORY (Laboratorium Analisis: XRF, Fusion Bead, Moisture, LOI, Kimia)
  { sectionKey: 'laboratory', sectionBadge: 'Lab XRF', title: 'XRF: Kalibrasi Spektrum Ni & Fe', text: 'Spektrum XRF stabil! Kurva kalibrasi kadar Ni, Fe, SiO2, dan MgO lolos verifikasi QC.' },
  { sectionKey: 'laboratory', sectionBadge: 'Lab XRF', title: 'Furnace: Fusion Bead 1050°C', text: 'Muffle furnace 1050°C siap untuk fusion bead. Wajib gunakan safety tongs & sarung tangan tebal!' },
  { sectionKey: 'laboratory', sectionBadge: 'Lab Kimia', title: 'Timbangan: Kalibrasi 4 Desimal', text: 'Timbangan analitik 4 desimal ter-leveling dan zeroed. Siap timbang flux litium tetraborat.' },
  { sectionKey: 'laboratory', sectionBadge: 'Lab K3', title: 'Fume Hood: Exhaust Lemari Asam', text: 'Exhaust lemari asam (fume hood) wajib aktif sebelum mereaksikan larutan asam pekat.' },
  { sectionKey: 'laboratory', sectionBadge: 'Lab Nikel', title: 'Analisa: Moisture & LOI Nikel', text: 'Analisa Loss on Ignition (LOI) dan Total Moisture batch hari ini selesai dengan presisi tinggi.' },
  { sectionKey: 'laboratory', sectionBadge: 'Lab XRF', title: 'QA/QC: CRM 2-Sigma Valid', text: 'Standard CRM nikel hari ini masuk garis kontrol 2 Sigma. Hasil analisa valid & akurat!' },
  { sectionKey: 'laboratory', sectionBadge: 'Lab Nikel', title: 'Rehat: Rehat di Pos Nongkrong', text: 'Sambil tunggu scan XRF 20 channel selesai, ayo seruput kopi dulu di Tempat Nongkrong!' },
  { sectionKey: 'laboratory', sectionBadge: 'Lab XRF', title: 'Instrumen: Suhu Ruang Detektor', text: 'Suhu ruang instrumen XRF terjaga 20-22°C. Detektor vacuum & gas flow bekerja prima.' },

  // 3. SECTION MAINTENANCE (Mekanik, Elektrikal & Pemeliharaan Alat)
  { sectionKey: 'maintenance', sectionBadge: 'Mekanik Lab', title: 'Maint: P2H Mesin Preparasi', text: 'P2H crusher & pulverizer aman! Suhu bearing dan level getaran mesin terpantau normal.' },
  { sectionKey: 'maintenance', sectionBadge: 'Maint K3', title: 'LOTO: Prosedur Lockout/Tagout', text: 'Terapkan aturan emas LOTO (Lockout/Tagout) sebelum membuka panel mesin preparasi!' },
  { sectionKey: 'maintenance', sectionBadge: 'Mekanik Lab', title: 'Airflow: Filter Dust Collector', text: 'Dust collector prep room airflow hisap 100% optimal, filter cartridge bersih.' },
  { sectionKey: 'maintenance', sectionBadge: 'Mekanik Lab', title: 'Drive: V-Belt Ring Mill Pulverizer', text: 'V-belt pulverizer baru distel kelurusannya. Mesin siap digeber shift penuh!' },
  { sectionKey: 'maintenance', sectionBadge: 'Elektrikal', title: 'Sensor: Thermocouple Oven & Furnace', text: 'Cek berkala elemen pemanas drying oven 105°C dan thermocouple muffle furnace.' },
  { sectionKey: 'maintenance', sectionBadge: 'Mekanik Lab', title: 'Hidrolik: Press Pellet 20 Ton', text: 'Oli hidrolik mesin press pellet 20 Ton pada level aman, tekanan pompa mantap.' },

  // 4. SECTION QUALITY ASSURANCE / QC
  { sectionKey: 'qa', sectionBadge: 'QA/QC', title: 'QA: Duplicate Sample RPD < 3%', text: 'Duplicate check sample preparasi menunjukkan RPD < 3%! Presisi dan homogenitas mantap.' },
  { sectionKey: 'qa', sectionBadge: 'QA: Verifikasi CRM Saprolite', title: 'QA/QC: Standard Acuan Nikel', text: 'Batch nikel high-grade saprolite terverifikasi CRM, deviasi standar sangat minim.' },
  { sectionKey: 'qa', sectionBadge: 'QA/QC', title: 'Audit: Standar ISO/IEC 17025', text: 'Kepatuhan SOP ISO/IEC 17025 di PrepLab TBP terjaga sempurna hari ini.' },
  { sectionKey: 'qa', sectionBadge: 'QA/QC', title: 'KTA/TTA: Nihil Temuan Fatal', text: 'Inspeksi rutin KTA/TTA di area laboratorium selesai tanpa temuan fatal!' },

  // 5. SECTION ADMINISTRATION & LOGISTICS
  { sectionKey: 'admin', sectionBadge: 'Admin Prep', title: 'Logistik: Stok Reagen & XRF Cups', text: 'Stok XRF cups, binder tablet, dan flux litium tetraborat di gudang terpantau aman.' },
  { sectionKey: 'admin', sectionBadge: 'Admin Prep', title: 'Roster: Sinkronisasi Shift Kru', text: 'Sinkronisasi roster kru tambang & logbook administrasi shift selesai rapi.' },
  { sectionKey: 'admin', sectionBadge: 'Admin Prep', title: 'COA: Certificate of Analysis', text: 'Data COA (Certificate of Analysis) nikel siap di-generate untuk tim mining & shipment!' },

  // 6. K3 & TBP MINING SPIRIT (General Tambang TBP & GPS)
  { sectionKey: 'k3_tbp', sectionBadge: 'K3 TBP', title: 'K3 Site: Budaya Zero Accident', text: 'Salam K3! Zero Accident bukan slogan, tapi komitmen pulang selamat ke keluarga!' },
  { sectionKey: 'k3_tbp', sectionBadge: 'Seragam TBP', title: 'APD: Fluo Lime & Double Scotlight', text: 'Seragam hijau fluo TBP dengan double scotlight membuat kita terlihat jelas di area kerja!' },
  { sectionKey: 'k3_tbp', sectionBadge: 'K3 TBP', title: 'Kesehatan: Hidrasi Cuaca Tambang', text: 'Cuaca site nikel terik, jangan lupa hidrasi air minum yang cukup & jaga stamina!' },
  { sectionKey: 'k3_tbp', sectionBadge: 'Semangat TBP', title: 'Harita Nickel: Kebersamaan Shift', text: 'Rekan kerja adalah keluarga. Saling peduli dan tegur bila ada kondisi tidak aman (KTA)!' }
];

function normalizeUserSection(raw?: string): 'preparation' | 'laboratory' | 'maintenance' | 'qa' | 'admin' | 'k3_tbp' {
  const s = (raw || '').toLowerCase();
  if (s.includes('qa') || s.includes('quality') || s.includes('qc') || s.includes('assurance')) return 'qa';
  if (s.includes('maint') || s.includes('mekanik') || s.includes('teknisi') || s.includes('pemeliharaan') || s.includes('bengkel')) return 'maintenance';
  if (s.includes('admin') || s.includes('adm') || s.includes('inv') || s.includes('gudang') || s.includes('finance') || s.includes('hr') || s.includes('logistic')) return 'admin';
  if (s.includes('lab') || s.includes('laboratorium') || s.includes('kimia') || s.includes('xrf') || s.includes('analis') || s.includes('wet')) return 'laboratory';
  if (s.includes('prep') || s.includes('preparasi') || s.includes('crush') || s.includes('sample') || s.includes('drying')) return 'preparation';
  return 'preparation';
}

/**
 * Resolves room type for the GBA workplace diorama:
 * - Laboratory: Ruang kerja lab kimia & XRF
 * - Preparation: Ruang preparasi sampel crusher & oven
 * - Maintenance: Workshop & bengkel pemeliharaan
 * - Warehouse: Gudang IC bahan kimia & consumables
 * - QA / Admin: Ruang kerja ber-komputer LIMS & akreditasi
 */
export function resolveUserRoomType(rawSection?: string, rawRole?: string): 'laboratory' | 'preparation' | 'maintenance' | 'warehouse' | 'qa' {
  const s = `${rawSection || ''} ${rawRole || ''}`.toLowerCase();
  
  // 1. TOP PRIORITY: Quality Assurance / QA / QC / Assurance
  if (
    s.includes('quality') || 
    s.includes('assurance') || 
    s.includes('qa') || 
    s.includes('qc')
  ) {
    return 'qa';
  }

  // 2. Ruang Kerja Laboratorium Kimia & XRF
  if (
    s.includes('laboratorium') || 
    s.includes('kimia') || 
    s.includes('xrf') || 
    s.includes('analis') || 
    s.includes('wet') ||
    /\blab\b/.test(s)
  ) {
    return 'laboratory';
  }

  // 3. Workshop & Bengkel Pemeliharaan (Maintenance)
  if (
    s.includes('maint') || 
    s.includes('mekanik') || 
    s.includes('workshop') || 
    s.includes('bengkel') || 
    s.includes('pemeliharaan') || 
    s.includes('teknisi')
  ) {
    return 'maintenance';
  }

  // 4. Gudang IC & Logistik Bahan (Gunakan boundary agar 'ic' tidak menangkap sembarang kata)
  if (
    s.includes('gudang') || 
    s.includes('warehouse') || 
    s.includes('logistik') || 
    s.includes('logistic') || 
    s.includes('inventory') || 
    /\bic\b/.test(s)
  ) {
    return 'warehouse';
  }

  // 5. Admin / Office / Finance / HR
  if (
    s.includes('admin') || 
    s.includes('adm') || 
    s.includes('finance') || 
    s.includes('hr')
  ) {
    return 'qa';
  }

  return 'preparation';
}

export const Avatar3DWidget: React.FC<Avatar3DWidgetProps> = ({ 
  size, 
  userNik = 'default',
  userName = 'Ranger',
  userSection: propUserSection,
  userRole: propUserRole
}) => {
  // Read profile context
  const localProfile = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('p2h_inspector_profile') || '{}');
    } catch {
      return {};
    }
  }, []);

  const effectiveNik = userNik !== 'default' ? userNik : (localStorage.getItem('p2h_inspector_nik') || 'default');
  const effectiveName = userName !== 'Ranger' ? userName : (localProfile.nama || localProfile.name || localStorage.getItem('p2h_inspector_name') || 'Ranger PrepLab');
  const rawSection = propUserSection || localProfile.section || localProfile.department || 'Preparation';
  const currentSectionKey = useMemo(() => normalizeUserSection(rawSection), [rawSection]);
  const userRoomType = useMemo(() => resolveUserRoomType(rawSection, propUserRole || localProfile.role), [rawSection, propUserRole, localProfile.role]);

  const unlockedStorageKey = `preplab_pixel_unlocked_items_${effectiveNik}`;
  const configStorageKey = `preplab_pixel_fullbody_cfg_${effectiveNik}`;

  // -------------------------------------------------------------
  // UNLOCKED ITEMS & EQUIPMENT STATE
  // -------------------------------------------------------------
  const [unlockedIds, setUnlockedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(unlockedStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      ...HEADWEAR_ITEMS.filter(i => i.isUnlockedDefault).map(i => i.id),
      ...OUTFIT_ITEMS.filter(i => i.isUnlockedDefault).map(i => i.id),
      ...EYE_ITEMS.filter(i => i.isUnlockedDefault).map(i => i.id),
      ...ACCESSORY_ITEMS.filter(i => i.isUnlockedDefault).map(i => i.id),
      ...BOOTS_ITEMS.filter(i => i.isUnlockedDefault).map(i => i.id)
    ];
  });

  const isUnlocked = (itemId: string) => unlockedIds.includes(itemId);

  const handleUnlockItem = (item: AvatarItem) => {
    if (unlockedIds.includes(item.id)) return;
    const next = [...unlockedIds, item.id];
    setUnlockedIds(next);
    try {
      localStorage.setItem(unlockedStorageKey, JSON.stringify(next));
    } catch {}
    playRetroSound('happy');
    toast.success(`🎉 Selamat! Item "${item.name}" berhasil dibuka!`);
  };

  // Avatar Appearance State (Defaults to Official TBP White Helmet & Fluo Lime Uniform)
  const [skin, setSkin] = useState(SKIN_TONES[0]); // tan
  const [headwear, setHeadwear] = useState(HEADWEAR_ITEMS[0]); // helmet_white (TBP)
  const [outfit, setOutfit] = useState(OUTFIT_ITEMS[0]); // uniform_tbp (Fluo Lime + Navy)
  const [eyes, setEyes] = useState(EYE_ITEMS[0]); // glasses_k3
  const [accessory, setAccessory] = useState(ACCESSORY_ITEMS[0]); // lanyard
  const [boots, setBoots] = useState(BOOTS_ITEMS[0]); // boots_brown
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Player military rank & level from gamification
  const [userRank, setUserRank] = useState<{ level: number; name: string; icon: string }>(() => {
    try {
      const saved = localStorage.getItem(`preplab_gamification_${effectiveNik}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        const xp = parsed.totalXp || parsed.stats?.totalXp || 0;
        const r = getRankByXp(xp);
        return {
          level: parsed.level || r.currentRank.id || 1,
          name: parsed.rankInfo?.currentRank?.name || r.currentRank.name || 'Trainee',
          icon: parsed.rankInfo?.currentRank?.icon || r.currentRank.icon || '/assets/ranks/rank_01_trainee.svg'
        };
      }
    } catch {}
    const r0 = getRankByXp(0);
    return { level: 1, name: r0.currentRank.name, icon: r0.currentRank.icon };
  });

  useEffect(() => {
    if (!effectiveNik || effectiveNik === 'default') return;
    let isMounted = true;
    fetch(`/api/gamification/user-stats/${encodeURIComponent(effectiveNik)}?name=${encodeURIComponent(effectiveName || '')}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && isMounted) {
          const xp = data.totalXp || data.stats?.totalXp || 0;
          const r = getRankByXp(xp);
          setUserRank({
            level: data.level || r.currentRank.id || 1,
            name: data.rankInfo?.currentRank?.name || r.currentRank.name || 'Trainee',
            icon: data.rankInfo?.currentRank?.icon || r.currentRank.icon || '/assets/ranks/rank_01_trainee.svg'
          });
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [effectiveNik, effectiveName]);

  // Load saved appearance
  useEffect(() => {
    try {
      const saved = localStorage.getItem(configStorageKey);
      if (saved) {
        const p = JSON.parse(saved);
        if (p.skinId) setSkin(SKIN_TONES.find(s => s.id === p.skinId) || skin);
        if (p.headwearId) setHeadwear(HEADWEAR_ITEMS.find(h => h.id === p.headwearId) || headwear);
        if (p.outfitId) setOutfit(OUTFIT_ITEMS.find(o => o.id === p.outfitId) || outfit);
        if (p.eyesId) setEyes(EYE_ITEMS.find(e => e.id === p.eyesId) || eyes);
        if (p.accessoryId) setAccessory(ACCESSORY_ITEMS.find(a => a.id === p.accessoryId) || accessory);
        if (p.bootsId) setBoots(BOOTS_ITEMS.find(b => b.id === p.bootsId) || boots);
      }
    } catch {}
  }, [configStorageKey]);

  const saveAppearance = (updates: any = {}) => {
    try {
      const data = {
        skinId: skin.id,
        headwearId: headwear.id,
        outfitId: outfit.id,
        eyesId: eyes.id,
        accessoryId: accessory.id,
        bootsId: boots.id,
        ...updates
      };
      localStorage.setItem(configStorageKey, JSON.stringify(data));
    } catch {}
  };

  // -------------------------------------------------------------
  // LIVING ENGINE: POSITION, WALKING & ACTIONS
  // -------------------------------------------------------------
  const [posX, setPosX] = useState<number>(35);
  const [targetX, setTargetX] = useState<number>(35);
  const [facing, setFacing] = useState<'left' | 'right'>('right');
  const [walkFrame, setWalkFrame] = useState<number>(0);
  const [isWalking, setIsWalking] = useState<boolean>(false);
  const [actionState, setActionState] = useState<'idle' | 'walk' | 'coffee' | 'inspect' | 'jump'>('idle');
  const [clickTargetMarker, setClickTargetMarker] = useState<number | null>(null);

  // Wardrobe / Customization Modal State
  const [showWardrobe, setShowWardrobe] = useState<boolean>(false);
  const [wardrobeTab, setWardrobeTab] = useState<'head' | 'outfit' | 'eyes' | 'acc' | 'boots' | 'skin'>('head');

  // TEMPAT NONGKRONG MODAL STATE
  const [showTempatNongkrong, setShowTempatNongkrong] = useState<boolean>(false);

  // SECTION-SPECIFIC DIALOGUES FILTERED FOR USER
  const sectionDialogues = useMemo(() => {
    const primary = NICKEL_DIALOGUES.filter(d => d.sectionKey === currentSectionKey);
    const k3 = NICKEL_DIALOGUES.filter(d => d.sectionKey === 'k3_tbp');
    return primary.length > 0 ? [...primary, ...k3] : NICKEL_DIALOGUES;
  }, [currentSectionKey]);

  const [dialogueIdx, setDialogueIdx] = useState<number>(0);
  const currentDialogue = sectionDialogues[dialogueIdx % sectionDialogues.length] || sectionDialogues[0];
  const [speechText, setSpeechText] = useState<string>(currentDialogue.text);
  const [speechBadge, setSpeechBadge] = useState<string>(currentDialogue.sectionBadge);
  const [speechVisible, setSpeechVisible] = useState<boolean>(true);

  // Update speech when dialogue index or section dialogues change
  useEffect(() => {
    if (sectionDialogues.length > 0) {
      const d = sectionDialogues[dialogueIdx % sectionDialogues.length];
      setSpeechText(d.text);
      setSpeechBadge(d.sectionBadge);
    }
  }, [dialogueIdx, sectionDialogues]);

  // Audio chime
  const playRetroSound = (type: 'beep' | 'happy' | 'walk' = 'beep') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'happy') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      } else if (type === 'walk') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        gain.gain.setValueAtTime(0.03, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      }
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  };

  // Walking Loop: Step towards targetX
  useEffect(() => {
    const moveTimer = setInterval(() => {
      setPosX(current => {
        const diff = targetX - current;
        if (Math.abs(diff) < 1.5) {
          setIsWalking(false);
          setClickTargetMarker(null);
          if (actionState === 'walk') setActionState('idle');
          return current;
        }

        setIsWalking(true);
        setWalkFrame(f => (f + 1) % 4);
        const step = diff > 0 ? 1.4 : -1.4;
        setFacing(diff > 0 ? 'right' : 'left');
        return Math.max(10, Math.min(88, current + step));
      });
    }, 90);

    return () => clearInterval(moveTimer);
  }, [targetX, actionState]);

  // Autonomous Wander Routine: Avatar periodically decides to walk & inspect PrepLab
  useEffect(() => {
    const wanderTimer = setInterval(() => {
      if (!isWalking && actionState === 'idle') {
        const rand = Math.random();
        if (rand < 0.55) {
          const newTarget = 15 + Math.floor(Math.random() * 68);
          setTargetX(newTarget);
          setActionState('walk');
        } else if (rand < 0.8) {
          setActionState('inspect');
          setSpeechText('🔍 Memeriksa parameter suhu oven 105°C & cyclone dust collector...');
          setSpeechBadge('Inspeksi Lab');
          setSpeechVisible(true);
          setTimeout(() => setActionState('idle'), 4000);
        } else {
          setActionState('coffee');
          setSpeechText('☕ Istirahat sejenak seruput kopi hangat di Pos Nongkrong!');
          setSpeechBadge('Pos Santai');
          setSpeechVisible(true);
          setTimeout(() => setActionState('idle'), 4000);
        }
      }
    }, 8500);

    return () => clearInterval(wanderTimer);
  }, [isWalking, actionState]);

  // Click on floor to walk
  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(12, Math.min(86, (clickX / rect.width) * 100));

    // If clicked near the right edge door (Pos Nongkrong), trigger lounge modal!
    if (percent > 76) {
      setTargetX(78);
      setActionState('walk');
      playRetroSound('beep');
      setTimeout(() => {
        setShowTempatNongkrong(true);
      }, 600);
      return;
    }

    setTargetX(percent);
    setClickTargetMarker(percent);
    setActionState('walk');
    playRetroSound('beep');
  };

  // Direct Click on Avatar: Friendly salute & reaction
  const handleAvatarDirectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActionState('jump');
    playRetroSound('happy');

    const quotes = [
      'Siap Komandan! Personil PrepLab TBP selalu siaga APD lengkap!',
      'Zero Accident adalah harga mati di laboratorium & preparasi nikel!',
      'Area crusher & oven aman, seragam TBP dengan double scotlight rapi!',
      'Hasil analisa sample nikel hari ini siap dikawal dengan akurat!',
      'P2H alat preparasi beroperasi 100% prima, mari jaga keselamatan kerja!'
    ];
    const picked = quotes[Math.floor(Math.random() * quotes.length)];
    setSpeechText(picked);
    setSpeechBadge('Salam K3');
    setSpeechVisible(true);

    setTimeout(() => {
      setActionState('idle');
    }, 1200);
  };

  // Next Message button
  const handleNextDialogue = () => {
    const nextIdx = (dialogueIdx + 1) % sectionDialogues.length;
    setDialogueIdx(nextIdx);
    const d = sectionDialogues[nextIdx];
    setSpeechText(d.text);
    setSpeechBadge(d.sectionBadge);
    setSpeechVisible(true);
    playRetroSound('beep');
  };

  // Render vector avatar to PNG dataUrl for syncing to Portal profile picture
  const handleSyncToProfile = async () => {
    try {
      const svgElement = document.getElementById('mainTbpAvatarSvg');
      if (!svgElement) {
        toast.error('Avatar SVG tidak ditemukan');
        return;
      }

      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const blobURL = globalThis.URL.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 420;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Dark stylish background matching portal theme
          const grad = ctx.createLinearGradient(0, 0, 320, 420);
          grad.addColorStop(0, '#0F172A');
          grad.addColorStop(1, '#1E293B');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 320, 420);

          ctx.drawImage(image, 10, 10, 300, 400);
          const dataUrl = canvas.toDataURL('image/png', 0.95);

          if (effectiveNik && effectiveNik !== 'default') {
            localStorage.setItem(`p2h_inspector_avatar_${effectiveNik}`, dataUrl);
            try {
              await fetch('/api/employees/avatar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nik: effectiveNik, avatar: dataUrl })
              });
            } catch {}
          }
          playRetroSound('happy');
          toast.success('Avatar Seragam TBP beresolusi tinggi berhasil dijadikan Foto Profil Portal!');
        }
        globalThis.URL.revokeObjectURL(blobURL);
      };
      image.src = blobURL;
    } catch (e) {
      toast.error('Gagal sinkronisasi avatar');
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between select-none relative overflow-hidden font-sans rounded-2xl border-2 border-[#181820] shadow-md bg-[#181820]">
      <GbaOverworldMap
        roomType={userRoomType}
        playerNik={effectiveNik}
        playerName={effectiveName}
        playerRankName={userRank.name}
        playerRankIcon={userRank.icon}
        headwearId={headwear.id}
        headwearColor={headwear.hex}
        outfitId={outfit.id}
        outfitColor={outfit.hex}
        bootsColor={boots.hex}
        playerMessage={speechVisible ? speechText : undefined}
        soundEnabled={soundEnabled}
        onOpenWardrobe={() => setShowWardrobe(true)}
        onSyncProfile={handleSyncToProfile}
        onOpenFullLounge={() => setShowTempatNongkrong(true)}
        isCompactDiorama={true}
      />

      {/* Hidden reference SVG for profile sync snapshot */}
      <div className="hidden">
        <div id="mainTbpAvatarSvg">
          <GbaCharacterSprite
            direction="down"
            walkFrame={0}
            actionState="idle"
            skinColor={skin.skin}
            headwearId={headwear.id}
            headwearColor={headwear.hex}
            outfitId={outfit.id}
            outfitColor={outfit.hex}
            bootsColor={boots.hex}
            width={160}
            height={210}
          />
        </div>
      </div>


      {/* ------------------------------------------------------------- */}
      {/* MODAL KUSTOMISASI: WARDROBE AVATAR TBP                        */}
      {/* ------------------------------------------------------------- */}
      {showWardrobe && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowWardrobe(false)}
        >
          <div 
            className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-[var(--border-main)] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-main)] bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-lime-600 text-white flex items-center justify-center shadow-xs">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                    <span>Wardrobe &amp; Kustomisasi Seragam TBP</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-lime-500/15 text-lime-700 dark:text-lime-300 font-bold border border-lime-500/30">
                      High-Definition APD TBP
                    </span>
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Pilih seragam resmi TBP/GPS atau perlengkapan keselamatan khusus laboratorium.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowWardrobe(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
              {/* Preview Box */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-[var(--border-main)]">
                {/* SVG Avatar Preview */}
                <div className="p-3 rounded-2xl bg-[#181820] shadow-md border-2 border-[#283040] flex-shrink-0 flex items-center justify-center">
                  <GbaCharacterSprite
                    direction="down"
                    walkFrame={0}
                    actionState="idle"
                    skinColor={skin.skin}
                    headwearId={headwear.id}
                    headwearColor={headwear.hex}
                    outfitId={outfit.id}
                    outfitColor={outfit.hex}
                    bootsColor={boots.hex}
                    width={64}
                    height={84}
                  />
                </div>

                <div className="flex-1 space-y-1.5">
                  <div className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                    <span>{headwear.name}</span>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    Seragam: <span className="font-semibold text-lime-600 dark:text-lime-400">{outfit.name}</span> &bull; {boots.name}
                  </div>
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-lime-500/10 text-lime-700 dark:text-lime-300 font-bold border border-lime-500/20">
                      Terbuka: {unlockedIds.length} Item
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 font-bold border border-teal-500/20">
                      Seksi: {rawSection}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-[var(--border-main)] text-xs font-bold">
                {[
                  { id: 'eyes', label: 'Wajah & Ekspresi', count: EYE_ITEMS.length },
                  { id: 'skin', label: 'Warna Kulit', count: SKIN_TONES.length },
                  { id: 'head', label: 'Pelindung / Helm', count: HEADWEAR_ITEMS.length },
                  { id: 'outfit', label: 'Seragam / APD', count: OUTFIT_ITEMS.length },
                  { id: 'acc', label: 'Aksesoris K3', count: ACCESSORY_ITEMS.length },
                  { id: 'boots', label: 'Safety Boots', count: BOOTS_ITEMS.length },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setWardrobeTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                      wardrobeTab === tab.id
                        ? 'bg-lime-600 text-white shadow-xs'
                        : 'text-[var(--text-muted)] hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Item Grid */}
              <div className="space-y-4">
                {/* 1. HEADWEAR */}
                {wardrobeTab === 'head' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {HEADWEAR_ITEMS.map(item => {
                      const unlocked = isUnlocked(item.id);
                      const isSelected = headwear.id === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                            isSelected 
                              ? 'border-lime-500 bg-lime-50/50 dark:bg-lime-950/30 ring-1 ring-lime-500' 
                              : 'border-[var(--border-main)] bg-white dark:bg-slate-900/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div 
                              className="w-5 h-5 rounded-lg border border-black/20 flex-shrink-0"
                              style={{ backgroundColor: item.hex }}
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[var(--text-main)] truncate">{item.name}</div>
                              <div className="text-[10px] text-[var(--text-muted)] truncate flex items-center gap-1">
                                {unlocked ? (
                                  <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                                    <Check className="w-2.5 h-2.5" /> Terbuka
                                  </span>
                                ) : (
                                  <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                                    <Lock className="w-2.5 h-2.5" /> {item.unlockReq}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {unlocked ? (
                            <button
                              type="button"
                              onClick={() => {
                                setHeadwear(item);
                                saveAppearance({ headwearId: item.id });
                                playRetroSound('beep');
                              }}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-lime-600 text-white' 
                                  : 'bg-slate-100 dark:bg-slate-800 text-[var(--text-main)] hover:bg-slate-200'
                              }`}
                            >
                              {isSelected ? 'Dipakai' : 'Pakai'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUnlockItem(item)}
                              className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Buka</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. OUTFIT */}
                {wardrobeTab === 'outfit' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {OUTFIT_ITEMS.map(item => {
                      const unlocked = isUnlocked(item.id);
                      const isSelected = outfit.id === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                            isSelected 
                              ? 'border-lime-500 bg-lime-50/50 dark:bg-lime-950/30 ring-1 ring-lime-500' 
                              : 'border-[var(--border-main)] bg-white dark:bg-slate-900/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div 
                              className="w-5 h-5 rounded-lg border border-black/20 flex-shrink-0"
                              style={{ backgroundColor: item.hex }}
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[var(--text-main)] truncate">{item.name}</div>
                              <div className="text-[10px] text-[var(--text-muted)] truncate">
                                {unlocked ? (
                                  <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                                    <Check className="w-2.5 h-2.5" /> Terbuka
                                  </span>
                                ) : (
                                  <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                                    <Lock className="w-2.5 h-2.5" /> {item.unlockReq}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {unlocked ? (
                            <button
                              type="button"
                              onClick={() => {
                                setOutfit(item);
                                saveAppearance({ outfitId: item.id });
                                playRetroSound('beep');
                              }}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-lime-600 text-white' 
                                  : 'bg-slate-100 dark:bg-slate-800 text-[var(--text-main)] hover:bg-slate-200'
                              }`}
                            >
                              {isSelected ? 'Dipakai' : 'Pakai'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUnlockItem(item)}
                              className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Buka</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3. EYES & GLASSES */}
                {wardrobeTab === 'eyes' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {EYE_ITEMS.map(item => {
                      const unlocked = isUnlocked(item.id);
                      const isSelected = eyes.id === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                            isSelected 
                              ? 'border-lime-500 bg-lime-50/50 dark:bg-lime-950/30 ring-1 ring-lime-500' 
                              : 'border-[var(--border-main)] bg-white dark:bg-slate-900/60'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[var(--text-main)] truncate">{item.name}</div>
                            <div className="text-[10px] text-[var(--text-muted)] truncate">
                              {unlocked ? (
                                <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" /> Terbuka
                                </span>
                              ) : (
                                <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                                  <Lock className="w-2.5 h-2.5" /> {item.unlockReq}
                                </span>
                              )}
                            </div>
                          </div>

                          {unlocked ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEyes(item);
                                saveAppearance({ eyesId: item.id });
                                playRetroSound('beep');
                              }}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-lime-600 text-white' 
                                  : 'bg-slate-100 dark:bg-slate-800 text-[var(--text-main)] hover:bg-slate-200'
                              }`}
                            >
                              {isSelected ? 'Dipakai' : 'Pakai'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUnlockItem(item)}
                              className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Buka</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 4. ACCESSORIES */}
                {wardrobeTab === 'acc' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ACCESSORY_ITEMS.map(item => {
                      const unlocked = isUnlocked(item.id);
                      const isSelected = accessory.id === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                            isSelected 
                              ? 'border-lime-500 bg-lime-50/50 dark:bg-lime-950/30 ring-1 ring-lime-500' 
                              : 'border-[var(--border-main)] bg-white dark:bg-slate-900/60'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[var(--text-main)] truncate">{item.name}</div>
                            <div className="text-[10px] text-[var(--text-muted)] truncate">
                              {unlocked ? (
                                <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" /> Terbuka
                                </span>
                              ) : (
                                <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                                  <Lock className="w-2.5 h-2.5" /> {item.unlockReq}
                                </span>
                              )}
                            </div>
                          </div>

                          {unlocked ? (
                            <button
                              type="button"
                              onClick={() => {
                                setAccessory(item);
                                saveAppearance({ accessoryId: item.id });
                                playRetroSound('beep');
                              }}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-lime-600 text-white' 
                                  : 'bg-slate-100 dark:bg-slate-800 text-[var(--text-main)] hover:bg-slate-200'
                              }`}
                            >
                              {isSelected ? 'Dipakai' : 'Pakai'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUnlockItem(item)}
                              className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Buka</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 5. BOOTS */}
                {wardrobeTab === 'boots' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {BOOTS_ITEMS.map(item => {
                      const unlocked = isUnlocked(item.id);
                      const isSelected = boots.id === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                            isSelected 
                              ? 'border-lime-500 bg-lime-50/50 dark:bg-lime-950/30 ring-1 ring-lime-500' 
                              : 'border-[var(--border-main)] bg-white dark:bg-slate-900/60'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[var(--text-main)] truncate">{item.name}</div>
                            <div className="text-[10px] text-[var(--text-muted)] truncate">
                              {unlocked ? (
                                <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" /> Terbuka
                                </span>
                              ) : (
                                <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                                  <Lock className="w-2.5 h-2.5" /> {item.unlockReq}
                                </span>
                              )}
                            </div>
                          </div>

                          {unlocked ? (
                            <button
                              type="button"
                              onClick={() => {
                                setBoots(item);
                                saveAppearance({ bootsId: item.id });
                                playRetroSound('beep');
                              }}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-lime-600 text-white' 
                                  : 'bg-slate-100 dark:bg-slate-800 text-[var(--text-main)] hover:bg-slate-200'
                              }`}
                            >
                              {isSelected ? 'Dipakai' : 'Pakai'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUnlockItem(item)}
                              className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Buka</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 6. SKIN TONE */}
                {wardrobeTab === 'skin' && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-[var(--text-main)]">Palet Warna Kulit Khas Personil</div>
                        <div className="text-[10px] text-[var(--text-muted)]">Pilih warna kulit bawaan atau sesuaikan sendiri dengan color picker.</div>
                      </div>
                      {/* Custom color picker */}
                      <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-xs cursor-pointer hover:border-lime-500 transition-all">
                        <span className="text-[10px] font-bold text-[var(--text-main)]">Pilih Bebas:</span>
                        <input
                          type="color"
                          value={skin.skin}
                          onChange={(e) => {
                            const val = e.target.value;
                            // Generate darker shade for shadow
                            const r = Math.max(0, parseInt(val.slice(1, 3), 16) - 70);
                            const g = Math.max(0, parseInt(val.slice(3, 5), 16) - 70);
                            const b = Math.max(0, parseInt(val.slice(5, 7), 16) - 70);
                            const shadowHex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                            const customSkin = {
                              id: 'custom',
                              name: 'Kustom Pilihan Sendiri',
                              skin: val,
                              skinShadow: shadowHex
                            };
                            setSkin(customSkin);
                            saveAppearance({ skinId: 'custom', customSkinColor: val, customSkinShadow: shadowHex });
                          }}
                          className="w-6 h-6 rounded-md border-0 p-0 cursor-pointer"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {SKIN_TONES.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSkin(s);
                            saveAppearance({ skinId: s.id });
                            playRetroSound('beep');
                          }}
                          className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all text-left ${
                            skin.id === s.id 
                              ? 'border-lime-500 bg-lime-50/50 dark:bg-lime-950/30 ring-1 ring-lime-500' 
                              : 'border-[var(--border-main)] hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div 
                            className="w-5 h-5 rounded-full border border-black/20 shadow-xs flex-shrink-0"
                            style={{ backgroundColor: s.skin }}
                          />
                          <span className="text-xs font-semibold text-[var(--text-main)] truncate">{s.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-[var(--border-main)] bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleSyncToProfile}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Jadikan Foto Profil Portal</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  saveAppearance();
                  setShowWardrobe(false);
                  playRetroSound('happy');
                  toast.success('Peralatan avatar TBP tersimpan!');
                }}
                className="px-5 py-1.5 rounded-xl text-xs font-bold bg-lime-600 hover:bg-lime-700 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Selesai</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TEMPAT NONGKRONG / LOUNGE MODAL                               */}
      {/* ------------------------------------------------------------- */}
      <TempatNongkrongModal
        isOpen={showTempatNongkrong}
        onClose={() => setShowTempatNongkrong(false)}
        userNik={effectiveNik}
        userName={effectiveName}
        userSection={rawSection}
        userRole={propUserRole || localProfile.role}
        avatarUrl={localStorage.getItem(`p2h_inspector_avatar_${effectiveNik}`) || undefined}
      />
    </div>
  );
};
