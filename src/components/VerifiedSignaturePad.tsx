import React, { useState, useEffect, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { 
  KeyRound, 
  CheckCircle2, 
  Trash2, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  PenTool, 
  ShieldCheck,
  Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import { getSafeSignatureDataUrl } from '../utils/signatureUtils';

export interface VerifiedSignaturePadProps {
  signerName: string;
  signerNik?: string;
  label?: string;
  required?: boolean;
  value: string;
  onChange: (dataUrl: string) => void;
  accentColor?: 'teal' | 'blue' | 'purple' | 'amber';
  theme?: 'teal' | 'blue' | 'purple' | 'amber';
  heightClass?: string;
  showCardHeader?: boolean;
}

export function VerifiedSignaturePad({
  signerName,
  signerNik = '',
  label = 'Tanda Tangan',
  required = false,
  value,
  onChange,
  accentColor,
  theme,
  heightClass = 'h-36',
  showCardHeader = true
}: VerifiedSignaturePadProps) {
  const sigPadRef = useRef<SignatureCanvas | null>(null);
  const colorTheme = theme || accentColor || 'teal';

  const [hasServerSignature, setHasServerSignature] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  // Check if this signer has registered signature + PIN in database
  useEffect(() => {
    let isMounted = true;
    if (!signerName && !signerNik) {
      setHasServerSignature(false);
      return;
    }

    const checkSigStatus = async () => {
      setCheckingStatus(true);
      try {
        const token = localStorage.getItem('p2h_token') || localStorage.getItem('token') || '';
        const params = new URLSearchParams();
        if (signerNik) params.set('nik', signerNik.trim());
        if (signerName) params.set('name', signerName.trim());

        const res = await fetch(`/api/signature/status?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (isMounted) {
          if (data.success && data.hasSignature && data.hasPin) {
            setHasServerSignature(true);
          } else {
            setHasServerSignature(false);
          }
        }
      } catch (err) {
        if (isMounted) setHasServerSignature(false);
      } finally {
        if (isMounted) setCheckingStatus(false);
      }
    };

    checkSigStatus();
    return () => {
      isMounted = false;
    };
  }, [signerName, signerNik]);

  // Handle PIN unlock
  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinInput || !/^\d{6}$/.test(pinInput)) {
      toast.error('Masukkan 6 digit angka PIN tanda tangan');
      return;
    }

    setUnlocking(true);
    try {
      const token = localStorage.getItem('p2h_token') || localStorage.getItem('token') || '';
      const res = await fetch('/api/signature/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          pin: pinInput,
          nik: signerNik || undefined,
          name: signerName || undefined
        })
      });
      const data = await res.json();
      if (data.success && data.signatureData) {
        onChange(data.signatureData);
        setPinInput('');
        toast.success(`Tanda tangan ${signerName || ''} berhasil dibuka & diterapkan!`);
      } else {
        toast.error(data.message || 'PIN Tanda Tangan salah atau tidak cocok.');
      }
    } catch (err: any) {
      toast.error('Gagal memverifikasi PIN tanda tangan');
    } finally {
      setUnlocking(false);
    }
  };

  const handleClear = () => {
    sigPadRef.current?.clear();
    onChange('');
  };

  const handleCanvasEnd = () => {
    if (sigPadRef.current) {
      const trimmed = getSafeSignatureDataUrl(sigPadRef.current);
      onChange(trimmed);
    }
  };

  // Color theme mapping
  const colorStyles = {
    teal: {
      border: 'border-teal-500/40',
      bgLight: 'bg-teal-50/50 dark:bg-teal-950/20',
      text: 'text-teal-900 dark:text-teal-200',
      badgeBg: 'bg-teal-100 dark:bg-teal-900/60',
      badgeText: 'text-teal-800 dark:text-teal-300',
      badgeBorder: 'border-teal-200 dark:border-teal-800',
      iconText: 'text-teal-600 dark:text-teal-400',
      btnBg: 'bg-teal-600 hover:bg-teal-700 text-white'
    },
    blue: {
      border: 'border-blue-500/40',
      bgLight: 'bg-blue-50/50 dark:bg-blue-950/20',
      text: 'text-blue-900 dark:text-blue-200',
      badgeBg: 'bg-blue-100 dark:bg-blue-900/60',
      badgeText: 'text-blue-800 dark:text-blue-300',
      badgeBorder: 'border-blue-200 dark:border-blue-800',
      iconText: 'text-blue-600 dark:text-blue-400',
      btnBg: 'bg-blue-600 hover:bg-blue-700 text-white'
    },
    purple: {
      border: 'border-purple-500/40',
      bgLight: 'bg-purple-50/50 dark:bg-purple-950/20',
      text: 'text-purple-900 dark:text-purple-200',
      badgeBg: 'bg-purple-100 dark:bg-purple-900/60',
      badgeText: 'text-purple-800 dark:text-purple-300',
      badgeBorder: 'border-purple-200 dark:border-purple-800',
      iconText: 'text-purple-600 dark:text-purple-400',
      btnBg: 'bg-purple-600 hover:bg-purple-700 text-white'
    },
    amber: {
      border: 'border-amber-500/40',
      bgLight: 'bg-amber-50/50 dark:bg-amber-950/20',
      text: 'text-amber-900 dark:text-amber-200',
      badgeBg: 'bg-amber-100 dark:bg-amber-900/60',
      badgeText: 'text-amber-800 dark:text-amber-300',
      badgeBorder: 'border-amber-200 dark:border-amber-800',
      iconText: 'text-amber-600 dark:text-amber-400',
      btnBg: 'bg-amber-600 hover:bg-amber-700 text-white'
    }
  }[colorTheme];

  return (
    <div className="space-y-2">
      {showCardHeader && label && (
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)] flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <PenTool className="w-3.5 h-3.5 text-slate-500" />
            {label} {required && <span className="text-rose-500">*</span>}
          </span>
          {checkingStatus && (
            <span className="text-[10px] text-slate-400 flex items-center gap-1 normal-case font-normal">
              <Loader2 className="w-3 h-3 animate-spin" /> Memeriksa TTD terdaftar...
            </span>
          )}
        </label>
      )}

      {/* 1. STATE: Tanda Tangan Sudah Terbuka / Diterapkan */}
      {value ? (
        <div className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border ${colorStyles.border} ${colorStyles.bgLight} transition-all`}>
          <div className="flex items-center gap-3">
            <div className="w-24 sm:w-28 h-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 flex items-center justify-center overflow-hidden shadow-2xs">
              <img src={value} alt="Preview TTD" className="max-h-full max-w-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Tanda Tangan Terverifikasi</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {hasServerSignature 
                  ? 'Diterapkan dari Pengaturan Akun (PIN Terverifikasi)' 
                  : 'Digambar manual pada canvas'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setManualMode(true);
              }}
              className="text-xs text-slate-600 dark:text-slate-300 hover:text-rose-600 font-semibold px-3 py-1.5 rounded-lg border border-[var(--border-main)] hover:bg-[var(--card-bg)] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ganti / Gambar Ulang</span>
            </button>
          </div>
        </div>
      ) : hasServerSignature && !manualMode ? (
        /* 2. STATE: Ada TTD Terdaftar, Belum Masukkan PIN -> Tampilkan Form PIN */
        <div className={`p-4 rounded-2xl border-2 ${colorStyles.border} ${colorStyles.bgLight} space-y-3 shadow-xs`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg ${colorStyles.badgeBg} flex items-center justify-center ${colorStyles.iconText}`}>
                <KeyRound className="w-4 h-4" />
              </div>
              <span className={`text-xs font-bold ${colorStyles.text}`}>
                Tanda Tangan Terdaftar (Pengaturan Akun)
              </span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colorStyles.badgeBg} ${colorStyles.badgeText} border ${colorStyles.badgeBorder}`}>
              Terenkripsi AES-256
            </span>
          </div>

          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Tanda tangan untuk <strong>{signerName}</strong> telah terdaftar. Masukkan <strong>6 Digit PIN</strong> Anda untuk membubuhkan tanda tangan resmi:
          </p>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleUnlock();
                  }
                }}
                placeholder="Ketik 6 Digit PIN Tanda Tangan"
                className="w-full bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl px-3.5 py-2.5 text-center text-sm font-mono tracking-widest font-black text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-teal-500/40 shadow-xs"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="button"
              disabled={unlocking || pinInput.length !== 6}
              onClick={() => handleUnlock()}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl shadow-xs shrink-0 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 ${colorStyles.btnBg}`}
            >
              {unlocking ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Membuka...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Terapkan TTD</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px]">
            <span className="text-slate-400">
              🔒 Terproteksi enkripsi akun pribadi
            </span>
            <button
              type="button"
              onClick={() => setManualMode(true)}
              className={`${colorStyles.iconText} font-semibold hover:underline cursor-pointer`}
            >
              Atau gambar manual di canvas
            </button>
          </div>
        </div>
      ) : (
        /* 3. STATE: Mode Manual Canvas (Belum ada TTD terdaftar atau user memilih manual) */
        <div className="space-y-2">
          {hasServerSignature && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setManualMode(false)}
                className={`text-[11px] font-bold ${colorStyles.iconText} hover:underline flex items-center gap-1 cursor-pointer`}
              >
                <KeyRound className="w-3 h-3" /> Kembali ke TTD Terdaftar (PIN)
              </button>
            </div>
          )}

          {!hasServerSignature && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
              Tanda tangan <strong>{signerName}</strong> belum didaftarkan di Pengaturan Akun. Silakan gambar di canvas bawah ini, atau daftarkan di Pengaturan Akun agar bisa menggunakan PIN instan.
            </div>
          )}

          <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner">
            <SignatureCanvas
              ref={sigPadRef}
              penColor="#000000"
              onEnd={handleCanvasEnd}
              canvasProps={{
                className: `w-full ${heightClass} cursor-crosshair touch-none`
              }}
            />
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-2 right-2 text-[11px] px-2.5 py-1 bg-white/90 dark:bg-slate-800/90 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg font-semibold transition-colors flex items-center gap-1 shadow-xs border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <Trash2 className="w-3 h-3 text-rose-500" /> Bersihkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
