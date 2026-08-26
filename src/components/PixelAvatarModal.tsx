import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Download, Check, RefreshCw, Palette, User, Shield, Shirt, Glasses, Crown } from 'lucide-react';
import { toast } from 'sonner';

interface PixelAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (avatarDataUrl: string) => void;
  currentNik?: string;
  currentName?: string;
}

// Pixel Art Feature Options & Palettes
const SKIN_TONES = [
  { id: 'light', name: 'Putih Cerah', base: '#FDE047', shadow: '#EAB308', skin: '#FFDBAC', skinShadow: '#E0AC69' },
  { id: 'fair', name: 'Kuning Langsat', base: '#F1C27D', shadow: '#E0AC69', skin: '#F1C27D', skinShadow: '#C68642' },
  { id: 'tan', name: 'Sawo Matang', base: '#E0AC69', shadow: '#C68642', skin: '#E0AC69', skinShadow: '#8D5524' },
  { id: 'bronze', name: 'Tan Bronze', base: '#C68642', shadow: '#8D5524', skin: '#C68642', skinShadow: '#5C3A21' },
  { id: 'dark', name: 'Eksotis Gelap', base: '#8D5524', shadow: '#5C3A21', skin: '#8D5524', skinShadow: '#3A2010' },
];

const HAIR_STYLES = [
  { id: 'spiky', name: 'Short Spiky' },
  { id: 'side', name: 'Side Part' },
  { id: 'curly', name: 'Curly Waves' },
  { id: 'long', name: 'Long Hair' },
  { id: 'hijab', name: 'Hijab Syari' },
  { id: 'helmet', name: 'Helm Safety K3' },
  { id: 'cap', name: 'Topi Proyek / Cap' },
  { id: 'afro', name: 'Afro Style' },
  { id: 'bald', name: 'Plontos / Short' },
];

const HAIR_COLORS = [
  { id: 'black', name: 'Hitam', hex: '#18181B', shadow: '#09090B' },
  { id: 'brown', name: 'Cokelat Gelap', hex: '#451A03', shadow: '#270E02' },
  { id: 'blonde', name: 'Pirang / Gold', hex: '#D97706', shadow: '#92400E' },
  { id: 'auburn', name: 'Merah / Auburn', hex: '#991B1B', shadow: '#7F1D1D' },
  { id: 'silver', name: 'Perak / Silver', hex: '#94A3B8', shadow: '#64748B' },
  { id: 'cyber_blue', name: 'Cyber Blue', hex: '#0284C7', shadow: '#0369A1' },
  { id: 'neon_purple', name: 'Neon Purple', hex: '#7E22CE', shadow: '#6B21A8' },
  { id: 'hijab_yellow', name: 'Hijab Kuning K3', hex: '#EAB308', shadow: '#CA8A04' },
  { id: 'hijab_white', name: 'Hijab Putih', hex: '#F8FAFC', shadow: '#CBD5E1' },
];

const EYE_STYLES = [
  { id: 'normal', name: 'Pixel Biasa' },
  { id: 'glasses_k3', name: 'Kacamata K3 Bening' },
  { id: 'sunglasses', name: 'Kacamata Hitam' },
  { id: 'happy', name: 'Senyum Happy ^ ^' },
  { id: 'wink', name: 'Kedip Mata ;)' },
  { id: 'cool_specs', name: 'Kacamata Formal' },
];

const OUTFITS = [
  { id: 'vest_orange', name: 'Rompi K3 Orange', base: '#EA580C', stripe: '#F8FAFC', collar: '#1E293B' },
  { id: 'vest_green', name: 'Rompi K3 Hijau', base: '#16A34A', stripe: '#F8FAFC', collar: '#1E293B' },
  { id: 'lab_coat', name: 'Jas Laboratorium', base: '#F8FAFC', stripe: '#0D9488', collar: '#0F766E' },
  { id: 'shirt_navy', name: 'Kemeja Work Navy', base: '#1E3A8A', stripe: '#F97316', collar: '#172554' },
  { id: 'suit_admin', name: 'Setelan Jas Admin', base: '#334155', stripe: '#EF4444', collar: '#0F172A' },
  { id: 'polo_teal', name: 'Polo Shirt Teal', base: '#0D9488', stripe: '#F59E0B', collar: '#115E59' },
  { id: 'hoodie_dark', name: 'Hoodie Developer', base: '#1E293B', stripe: '#38BDF8', collar: '#0F172A' },
];

const ACCESSORIES = [
  { id: 'none', name: 'Tanpa Aksesoris' },
  { id: 'lanyard', name: 'Lanyard ID Card' },
  { id: 'mask', name: 'Masker K3' },
  { id: 'headset', name: 'Headphone Studio' },
  { id: 'ear_muff', name: 'Ear Protector K3' },
];

const BACKGROUNDS = [
  { id: 'cyber_dark', name: 'Cyber Slate', bg1: '#0F172A', bg2: '#1E293B' },
  { id: 'preplab_teal', name: 'PrepLab Teal', bg1: '#042F2E', bg2: '#0D9488' },
  { id: 'sunset_orange', name: 'Sunset Orange', bg1: '#431407', bg2: '#EA580C' },
  { id: 'emerald_grid', name: 'Emerald K3', bg1: '#064E3B', bg2: '#10B981' },
  { id: 'deep_blue', name: 'Deep Space', bg1: '#172554', bg2: '#3B82F6' },
  { id: 'neon_purple', name: 'Synth Purple', bg1: '#3B0764', bg2: '#A855F7' },
  { id: 'gold_glow', name: 'Gold Luxury', bg1: '#451A03', bg2: '#F59E0B' },
  { id: 'light_clean', name: 'Clean White', bg1: '#F8FAFC', bg2: '#E2E8F0' },
];

export const PixelAvatarModal: React.FC<PixelAvatarModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentNik = '',
  currentName = 'Karyawan'
}) => {
  // Avatar Feature Configuration State
  const [skin, setSkin] = useState(SKIN_TONES[0]);
  const [hairStyle, setHairStyle] = useState(HAIR_STYLES[0]);
  const [hairColor, setHairColor] = useState(HAIR_COLORS[0]);
  const [eyeStyle, setEyeStyle] = useState(EYE_STYLES[0]);
  const [outfit, setOutfit] = useState(OUTFITS[0]);
  const [accessory, setAccessory] = useState(ACCESSORIES[0]);
  const [bg, setBg] = useState(BACKGROUNDS[0]);

  const [activeTab, setActiveTab] = useState<'skin' | 'hair' | 'eyes' | 'outfit' | 'acc' | 'bg'>('skin');
  const [isSaving, setIsSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Randomize Avatar State 🎲
  const randomize = () => {
    setSkin(SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)]);
    setHairStyle(HAIR_STYLES[Math.floor(Math.random() * HAIR_STYLES.length)]);
    setHairColor(HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)]);
    setEyeStyle(EYE_STYLES[Math.floor(Math.random() * EYE_STYLES.length)]);
    setOutfit(OUTFITS[Math.floor(Math.random() * OUTFITS.length)]);
    setAccessory(ACCESSORIES[Math.floor(Math.random() * ACCESSORIES.length)]);
    setBg(BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)]);
    toast.success('Karakter pixel diacak!');
  };

  // Draw 24x24 Pixel Art Grid onto HTML Canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 300; // Output Resolution 300x300 px
    canvas.width = size;
    canvas.height = size;
    const p = size / 24; // 1 Pixel block = 12.5px

    ctx.clearRect(0, 0, size, size);

    // 1. Draw Background
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, bg.bg1);
    grad.addColorStop(1, bg.bg2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Subtle Pixel Grid Lines for Backdrop
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let x = 0; x < 24; x += 2) {
      for (let y = 0; y < 24; y += 2) {
        ctx.fillRect(x * p, y * p, p, p);
      }
    }

    // Helper Pixel Fill Function
    const rect = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x * p, y * p, w * p, h * p);
    };

    const hCol = hairColor.hex;
    const hShad = hairColor.shadow;

    // 2. Base Hijab / Back Hair (if hijab or long hair)
    if (hairStyle.id === 'hijab') {
      rect(5, 2, 14, 5, hCol);
      rect(4, 4, 16, 13, hCol);
      rect(5, 15, 14, 3, hShad);
    } else if (hairStyle.id === 'long' || hairStyle.id === 'curly' || hairStyle.id === 'afro') {
      rect(4, 3, 16, 12, hShad);
    }

    // 3. Head Base (Skin Tone)
    rect(7, 5, 10, 11, skin.skin);
    rect(6, 6, 12, 9, skin.skin);
    rect(8, 16, 8, 2, skin.skinShadow); // Neck / Jaw Shadow

    // Ears (unless covered by hijab/helmet/earmuff)
    if (hairStyle.id !== 'hijab' && hairStyle.id !== 'helmet' && accessory.id !== 'ear_muff') {
      rect(5, 9, 2, 4, skin.skin);
      rect(17, 9, 2, 4, skin.skin);
      rect(5, 10, 1, 2, skin.skinShadow);
      rect(18, 10, 1, 2, skin.skinShadow);
    }

    // Cheeks / Blush
    rect(7, 12, 2, 1, 'rgba(244, 63, 94, 0.35)');
    rect(15, 12, 2, 1, 'rgba(244, 63, 94, 0.35)');

    // 4. Outfit / Clothing (Torso & Shoulders)
    const oBase = outfit.base;
    const oStripe = outfit.stripe;
    const oCollar = outfit.collar;

    // Shoulders
    rect(3, 17, 18, 7, oBase);
    rect(4, 16, 16, 1, oBase);

    // Collar & V-Neck
    rect(10, 16, 4, 3, skin.skin);
    rect(10, 17, 4, 1, skin.skinShadow);
    rect(9, 16, 1, 3, oCollar);
    rect(14, 16, 1, 3, oCollar);

    // Safety Vest Reflective Stripes / Accents
    if (outfit.id.startsWith('vest')) {
      rect(6, 18, 2, 6, oStripe);
      rect(16, 18, 2, 6, oStripe);
      rect(6, 21, 12, 1, oStripe);
    } else if (outfit.id === 'lab_coat') {
      rect(11, 17, 2, 7, '#0D9488'); // Pen in pocket / Teal tie
      rect(7, 18, 1, 6, '#CBD5E1');
      rect(16, 18, 1, 6, '#CBD5E1');
    } else if (outfit.id === 'suit_admin') {
      rect(11, 17, 2, 7, oStripe); // Red Tie
    }

    // 5. Hair Style & Headgear (Front / Bangs Layer)
    if (hairStyle.id === 'spiky') {
      rect(6, 3, 12, 3, hCol);
      rect(7, 2, 10, 2, hCol);
      rect(5, 4, 14, 2, hCol);
      rect(7, 1, 3, 2, hCol);
      rect(11, 1, 3, 2, hCol);
      rect(5, 5, 2, 3, hShad);
      rect(17, 5, 2, 3, hShad);
    } else if (hairStyle.id === 'side') {
      rect(6, 3, 12, 3, hCol);
      rect(5, 4, 14, 2, hCol);
      rect(5, 5, 3, 3, hShad);
      rect(16, 5, 3, 3, hShad);
    } else if (hairStyle.id === 'curly') {
      rect(5, 2, 14, 4, hCol);
      rect(4, 4, 16, 3, hCol);
      rect(4, 5, 3, 5, hShad);
      rect(17, 5, 3, 5, hShad);
    } else if (hairStyle.id === 'long') {
      rect(6, 2, 12, 4, hCol);
      rect(4, 4, 16, 3, hCol);
      rect(4, 6, 3, 8, hShad);
      rect(17, 6, 3, 8, hShad);
    } else if (hairStyle.id === 'hijab') {
      // Syari Hijab Inner Framing around Face Cutout
      rect(5, 2, 14, 3, hCol);
      rect(4, 4, 3, 11, hCol);
      rect(17, 4, 3, 11, hCol);
      rect(5, 14, 14, 3, hShad);
    } else if (hairStyle.id === 'helmet') {
      // Helm Safety K3 Kuning / White
      rect(5, 2, 14, 4, '#FACC15'); // Yellow Safety Helmet
      rect(4, 5, 16, 2, '#EAB308'); // Helmet visor brim
      rect(9, 3, 6, 2, '#F8FAFC'); // Front PrepLab Cross Badge
      rect(11, 3, 2, 2, '#16A34A');
    } else if (hairStyle.id === 'cap') {
      // Baseball / Work Cap
      rect(5, 2, 14, 4, '#1E3A8A');
      rect(4, 5, 16, 1, '#172554');
      rect(14, 5, 6, 1, '#172554'); // Cap visor
      rect(11, 3, 2, 2, '#F97316');
    } else if (hairStyle.id === 'afro') {
      rect(4, 1, 16, 6, hCol);
      rect(3, 2, 18, 4, hCol);
      rect(3, 4, 3, 5, hShad);
      rect(18, 4, 3, 5, hShad);
    } else if (hairStyle.id === 'bald') {
      // Short hair trim
      rect(7, 4, 10, 2, hShad);
    }

    // 6. Eyes & Expression (ALWAYS ON TOP OF SKIN & HIJAB/HAIR BASE)
    const eyeCol = '#0F172A';
    if (eyeStyle.id === 'normal') {
      rect(8, 9, 2, 2, eyeCol);
      rect(14, 9, 2, 2, eyeCol);
      rect(8, 9, 1, 1, '#FFFFFF'); // Highlight
      rect(14, 9, 1, 1, '#FFFFFF');
    } else if (eyeStyle.id === 'happy') {
      rect(8, 9, 2, 1, eyeCol);
      rect(7, 10, 1, 1, eyeCol);
      rect(14, 9, 2, 1, eyeCol);
      rect(16, 10, 1, 1, eyeCol);
    } else if (eyeStyle.id === 'wink') {
      rect(8, 9, 2, 2, eyeCol);
      rect(8, 9, 1, 1, '#FFFFFF');
      rect(14, 10, 2, 1, eyeCol); // Winking eye
    } else if (eyeStyle.id === 'glasses_k3') {
      rect(8, 9, 2, 2, eyeCol);
      rect(14, 9, 2, 2, eyeCol);
      // Clear Blue Safety Glasses Frame
      rect(6, 8, 5, 4, 'rgba(56, 189, 248, 0.4)');
      rect(13, 8, 5, 4, 'rgba(56, 189, 248, 0.4)');
      rect(6, 8, 12, 1, '#0284C7');
      rect(11, 10, 2, 1, '#0284C7');
    } else if (eyeStyle.id === 'sunglasses') {
      // Cool Dark Shades
      rect(6, 8, 5, 4, '#0F172A');
      rect(13, 8, 5, 4, '#0F172A');
      rect(6, 8, 12, 1, '#334155');
      rect(11, 9, 2, 1, '#334155');
      rect(7, 9, 2, 1, '#38BDF8'); // Reflection sheen
      rect(14, 9, 2, 1, '#38BDF8');
    } else if (eyeStyle.id === 'cool_specs') {
      rect(7, 8, 4, 3, '#1E293B');
      rect(13, 8, 4, 3, '#1E293B');
      rect(8, 9, 2, 1, '#F8FAFC');
      rect(14, 9, 2, 1, '#F8FAFC');
      rect(11, 9, 2, 1, '#1E293B');
    }

    // Mouth / Smile
    rect(11, 13, 2, 1, '#8D5524');

    // 7. Accessories Overlay
    if (accessory.id === 'lanyard') {
      // Red Lanyard with PrepLab Badge
      rect(9, 17, 1, 7, '#EF4444');
      rect(14, 17, 1, 7, '#EF4444');
      rect(10, 21, 4, 3, '#F8FAFC'); // ID Badge
      rect(11, 22, 2, 1, '#0EA5E9');
    } else if (accessory.id === 'mask') {
      // K3 Respirator / Surgical Mask
      rect(8, 12, 8, 4, '#06B6D4');
      rect(9, 13, 6, 2, '#ECFEFF');
      rect(6, 12, 2, 1, '#CBD5E1'); // Straps
      rect(16, 12, 2, 1, '#CBD5E1');
    } else if (accessory.id === 'headset') {
      // Studio Headphones
      rect(5, 1, 14, 2, '#334155');
      rect(4, 7, 3, 6, '#6366F1');
      rect(17, 7, 3, 6, '#6366F1');
      rect(5, 8, 1, 4, '#818CF8');
      rect(18, 8, 1, 4, '#818CF8');
    } else if (accessory.id === 'ear_muff') {
      // Safety Ear Muff K3
      rect(5, 1, 14, 2, '#1E293B');
      rect(3, 7, 3, 6, '#F97316');
      rect(18, 7, 3, 6, '#F97316');
    }

  }, [isOpen, skin, hairStyle, hairColor, eyeStyle, outfit, accessory, bg]);

  // Handle Save Pixel Avatar
  const handleSaveAvatar = async () => {
    if (!canvasRef.current) return;
    setIsSaving(true);
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png', 0.95);
      
      // Save local cache
      if (currentNik) {
        localStorage.setItem(`p2h_inspector_avatar_${currentNik}`, dataUrl);
      }

      // Sync backend
      if (currentNik) {
        await fetch('/api/employees/avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nik: currentNik, avatar: dataUrl }),
        }).catch(err => console.warn('Backend sync warning:', err));
      }

      onSave(dataUrl);
      toast.success('Pixel Avatar berhasil disimpan & diterapkan!');
      onClose();
    } catch (e: any) {
      toast.error('Gagal menyimpan Pixel Avatar: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Download PNG
  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `pixel_avatar_${currentNik || 'preplab'}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    toast.success('Gambar Pixel Avatar diunduh!');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-300">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-2xl rounded-3xl overflow-hidden border shadow-2xl flex flex-col max-h-[90vh]"
          style={{
            backgroundColor: 'var(--card-bg, #0F172A)',
            borderColor: 'var(--border-main, #334155)',
            color: 'var(--text-main, #F8FAFC)'
          }}
        >
          {/* Modal Header */}
          <div className="px-6 py-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border-main, #334155)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold font-display flex items-center gap-2">
                  Pixel Avatar Studio K3
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">8-BIT CREATOR</span>
                </h3>
                <p className="text-xs opacity-70">Rancang karakter avatar pixel resmi milikmu untuk profil & leaderboard</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-700/50 transition-colors"
            >
              <X className="w-5 h-5 opacity-70" />
            </button>
          </div>

          {/* Modal Content Grid */}
          <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Left Column: Canvas Preview */}
            <div className="md:col-span-5 flex flex-col items-center justify-center space-y-4">
              <div className="relative group">
                <div className="p-3 rounded-3xl bg-slate-900 border-2 border-slate-700/80 shadow-inner flex items-center justify-center">
                  <canvas 
                    ref={canvasRef} 
                    className="w-52 h-52 sm:w-60 sm:h-60 rounded-2xl image-rendering-pixelated shadow-lg border border-slate-800"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>

                <button
                  type="button"
                  onClick={randomize}
                  title="Acak Karakter (Randomize)"
                  className="absolute -top-2 -right-2 p-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-1.5 text-xs border border-amber-300 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 animate-spin-hover" />
                  <span>Acak</span>
                </button>
              </div>

              <div className="text-center space-y-1">
                <div className="text-xs font-bold text-slate-300 font-mono truncate max-w-[200px] mx-auto">
                  {currentName}
                </div>
                <div className="text-[10px] text-slate-400 font-mono opacity-75">
                  NIK: {currentNik || '8-BIT-PIXEL'}
                </div>
              </div>

              <div className="flex gap-2 w-full pt-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh PNG</span>
                </button>
              </div>
            </div>

            {/* Right Column: Customization Controls */}
            <div className="md:col-span-7 flex flex-col space-y-4">
              
              {/* Category Selector Tabs */}
              <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-slate-800 shrink-0">
                {[
                  { id: 'skin', label: 'Kulit', icon: User },
                  { id: 'hair', label: 'Rambut', icon: Crown },
                  { id: 'eyes', label: 'Mata/K3', icon: Glasses },
                  { id: 'outfit', label: 'Baju/K3', icon: Shirt },
                  { id: 'acc', label: 'Aksesori', icon: Shield },
                  { id: 'bg', label: 'Background', icon: Palette },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-1 min-w-[70px] py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isActive 
                          ? 'bg-amber-500 text-slate-950 shadow-sm' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Feature Options Panel */}
              <div className="flex-1 p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-4 overflow-y-auto max-h-[300px]">
                
                {/* 1. SKIN TONE TAB */}
                {activeTab === 'skin' && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <label className="text-xs font-bold text-slate-300 block">Pilih Warna Kulit Pixel:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {SKIN_TONES.map(item => (
                        <button
                          key={item.id}
                          onClick={() => setSkin(item)}
                          className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                            skin.id === item.id 
                              ? 'border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/30' 
                              : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800'
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full border border-black/30 shadow-xs shrink-0" style={{ backgroundColor: item.skin }} />
                          <span className="text-xs font-semibold text-slate-200 truncate">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. HAIR STYLE & COLOR TAB */}
                {activeTab === 'hair' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-2">Model Rambut / Penutup Kepala:</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {HAIR_STYLES.map(item => (
                          <button
                            key={item.id}
                            onClick={() => setHairStyle(item)}
                            className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer truncate ${
                              hairStyle.id === item.id 
                                ? 'border-amber-500 bg-amber-500/15 text-amber-300 font-bold' 
                                : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-300'
                            }`}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-2">Warna Rambut / Hijab:</label>
                      <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                        {HAIR_COLORS.map(item => (
                          <button
                            key={item.id}
                            onClick={() => setHairColor(item)}
                            className={`p-2 rounded-xl border text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                              hairColor.id === item.id 
                                ? 'border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/30' 
                                : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800'
                            }`}
                          >
                            <div className="w-4 h-4 rounded-full border border-black/30 shrink-0" style={{ backgroundColor: item.hex }} />
                            <span className="text-[11px] text-slate-300 truncate">{item.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. EYES & K3 GLASSES TAB */}
                {activeTab === 'eyes' && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <label className="text-xs font-bold text-slate-300 block">Ekspresi Mata & Kacamata K3:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {EYE_STYLES.map(item => (
                        <button
                          key={item.id}
                          onClick={() => setEyeStyle(item)}
                          className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all flex items-center justify-between cursor-pointer ${
                            eyeStyle.id === item.id 
                              ? 'border-amber-500 bg-amber-500/15 text-amber-300 font-bold' 
                              : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <span>{item.name}</span>
                          {eyeStyle.id === item.id && <Check className="w-4 h-4 text-amber-400" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. OUTFIT TAB */}
                {activeTab === 'outfit' && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <label className="text-xs font-bold text-slate-300 block">Pakaian Pilihan / Rompi K3:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {OUTFITS.map(item => (
                        <button
                          key={item.id}
                          onClick={() => setOutfit(item)}
                          className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all flex items-center gap-3 cursor-pointer ${
                            outfit.id === item.id 
                              ? 'border-amber-500 bg-amber-500/15 text-amber-300 font-bold' 
                              : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="w-5 h-5 rounded-lg border border-black/30 shadow-xs shrink-0 flex items-center justify-center" style={{ backgroundColor: item.base }}>
                            <div className="w-2 h-2 rounded-xs" style={{ backgroundColor: item.stripe }} />
                          </div>
                          <span className="truncate">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. ACCESSORY TAB */}
                {activeTab === 'acc' && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <label className="text-xs font-bold text-slate-300 block">Aksesoris Tambahan K3:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ACCESSORIES.map(item => (
                        <button
                          key={item.id}
                          onClick={() => setAccessory(item)}
                          className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all flex items-center justify-between cursor-pointer ${
                            accessory.id === item.id 
                              ? 'border-amber-500 bg-amber-500/15 text-amber-300 font-bold' 
                              : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <span>{item.name}</span>
                          {accessory.id === item.id && <Check className="w-4 h-4 text-amber-400" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. BACKGROUND TAB */}
                {activeTab === 'bg' && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <label className="text-xs font-bold text-slate-300 block">Tema Background Pixel Studio:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                      {BACKGROUNDS.map(item => (
                        <button
                          key={item.id}
                          onClick={() => setBg(item)}
                          className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                            bg.id === item.id 
                              ? 'border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/30' 
                              : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800'
                          }`}
                        >
                          <div 
                            className="w-6 h-6 rounded-lg border border-black/30 shadow-xs shrink-0" 
                            style={{ background: `linear-gradient(135deg, ${item.bg1}, ${item.bg2})` }} 
                          />
                          <span className="text-xs font-semibold text-slate-200 truncate">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveAvatar}
                  disabled={isSaving}
                  className="flex-[2] py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs transition-all active:scale-98 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Simpan & Terapkan Avatar</span>
                </button>
              </div>

            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
