import React, { useState, useEffect, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { 
  ShieldCheck, 
  KeyRound, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  PenTool, 
  RefreshCw,
  HelpCircle,
  X,
  FileCheck2,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, Button, Input } from './ui';
import { getSafeSignatureDataUrl } from '../utils/signatureUtils';

interface SignatureSettingsCardProps {
  inspectorNik: string | null;
  inspectorName: string | null;
}

export function SignatureSettingsCard({ inspectorNik, inspectorName }: SignatureSettingsCardProps) {
  const [loading, setLoading] = useState(true);
  const [hasSignature, setHasSignature] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // Modal States
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [changePinModalOpen, setChangePinModalOpen] = useState(false);
  const [forgotPinModalOpen, setForgotPinModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Form States - Setup / Edit TTD
  const sigCanvasRef = useRef<SignatureCanvas | null>(null);
  const [setupPin, setSetupPin] = useState('');
  const [setupPinConfirm, setSetupPinConfirm] = useState('');
  const [setupOldPin, setSetupOldPin] = useState('');
  const [showSetupPin, setShowSetupPin] = useState(false);
  const [savingSetup, setSavingSetup] = useState(false);

  // Form States - Unlock / Preview TTD
  const [unlockPin, setUnlockPin] = useState('');
  const [showUnlockPin, setShowUnlockPin] = useState(false);
  const [unlockedSignatureData, setUnlockedSignatureData] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  // Form States - Change PIN
  const [changeOldPin, setChangeOldPin] = useState('');
  const [changeNewPin, setChangeNewPin] = useState('');
  const [changeNewPinConfirm, setChangeNewPinConfirm] = useState('');
  const [savingChangePin, setSavingChangePin] = useState(false);

  // Form States - Forgot PIN Recovery
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryNewPin, setRecoveryNewPin] = useState('');
  const [recoveryNewPinConfirm, setRecoveryNewPinConfirm] = useState('');
  const [recoveryRedraw, setRecoveryRedraw] = useState(false);
  const recoveryCanvasRef = useRef<SignatureCanvas | null>(null);
  const [savingRecovery, setSavingRecovery] = useState(false);

  // Form States - Delete
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' 
      ? (localStorage.getItem('p2h_token') || localStorage.getItem('token') || '') 
      : '';
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/signature/status', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setHasSignature(data.hasSignature);
        setHasPin(data.hasPin);
        setUpdatedAt(data.updatedAt);
      }
    } catch (err) {
      console.warn('Gagal memuat status tanda tangan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (inspectorNik) {
      fetchStatus();
    }
  }, [inspectorNik]);

  // Handle Save / Setup Signature
  const handleSaveSignature = async () => {
    if (!sigCanvasRef.current) return;
    const sigData = getSafeSignatureDataUrl(sigCanvasRef.current);
    if (!sigData) {
      return toast.error('Silakan gambar tanda tangan Anda di canvas terlebih dahulu');
    }

    if (!setupPin || !/^\d{6}$/.test(setupPin)) {
      return toast.error('PIN harus berupa 6 digit angka');
    }

    if (setupPin !== setupPinConfirm) {
      return toast.error('Konfirmasi PIN tidak cocok dengan PIN');
    }

    if (hasPin && !setupOldPin) {
      return toast.error('Masukkan PIN lama Anda untuk otorisasi perubahan');
    }

    setSavingSetup(true);
    const toastId = toast.loading('Mengenkripsi & menyimpan tanda tangan (AES-256)...');
    try {
      const res = await fetch('/api/signature/save', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          signatureData: sigData,
          pin: setupPin,
          oldPin: setupOldPin || undefined
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Gagal menyimpan tanda tangan');

      toast.success('Tanda tangan & PIN 6-digit berhasil disimpan dengan enkripsi aman!', { id: toastId });
      setSetupModalOpen(false);
      setSetupPin('');
      setSetupPinConfirm('');
      setSetupOldPin('');
      fetchStatus();
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat menyimpan', { id: toastId });
    } finally {
      setSavingSetup(false);
    }
  };

  // Handle Unlock Preview
  const handleUnlockSignature = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!unlockPin || !/^\d{6}$/.test(unlockPin)) {
      return toast.error('Masukkan 6 digit PIN tanda tangan Anda');
    }

    setUnlocking(true);
    try {
      const res = await fetch('/api/signature/unlock', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ pin: unlockPin })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'PIN tanda tangan salah');

      setUnlockedSignatureData(data.signatureData);
      toast.success('Tanda tangan berhasil didekripsi');
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuka tanda tangan');
    } finally {
      setUnlocking(false);
    }
  };

  // Handle Forgot PIN Recovery via Account Password
  const handleRecoverPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryPassword) {
      return toast.error('Masukkan password akun portal Anda untuk verifikasi identitas');
    }
    if (!recoveryNewPin || !/^\d{6}$/.test(recoveryNewPin)) {
      return toast.error('PIN baru harus berupa 6 digit angka');
    }
    if (recoveryNewPin !== recoveryNewPinConfirm) {
      return toast.error('Konfirmasi PIN baru tidak sesuai');
    }

    let newSigData: string | undefined = undefined;
    if (recoveryRedraw && recoveryCanvasRef.current) {
      newSigData = getSafeSignatureDataUrl(recoveryCanvasRef.current);
      if (!newSigData) {
        return toast.error('Silakan gambar tanda tangan baru Anda pada canvas');
      }
    }

    setSavingRecovery(true);
    const toastId = toast.loading('Memverifikasi akun & mereset PIN...');
    try {
      const res = await fetch('/api/signature/reset-pin', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          accountPassword: recoveryPassword,
          newPin: recoveryNewPin,
          newSignatureData: newSigData
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Gagal mereset PIN');

      toast.success('PIN tanda tangan berhasil direset!', { id: toastId });
      setForgotPinModalOpen(false);
      setRecoveryPassword('');
      setRecoveryNewPin('');
      setRecoveryNewPinConfirm('');
      setRecoveryRedraw(false);
      fetchStatus();
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat reset PIN', { id: toastId });
    } finally {
      setSavingRecovery(false);
    }
  };

  // Handle Delete Signature
  const handleDeleteSignature = async () => {
    if (!deletePassword) {
      return toast.error('Masukkan password akun portal Anda untuk konfirmasi penghapusan');
    }

    setDeleting(true);
    const toastId = toast.loading('Menghapus data tanda tangan...');
    try {
      const res = await fetch('/api/signature/delete', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ accountPassword: deletePassword })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Gagal menghapus tanda tangan');

      toast.success('Tanda tangan dan PIN berhasil dihapus', { id: toastId });
      setDeleteModalOpen(false);
      setDeletePassword('');
      setUnlockedSignatureData(null);
      fetchStatus();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus', { id: toastId });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="space-y-4 border border-[var(--border-main)] relative overflow-hidden">
      {/* Background Decorative Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-bl-full pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--border-main)]">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
              Tanda Tangan &amp; PIN Digital
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Enkripsi Berlapis (AES-256-GCM + Proteksi 6 Digit PIN)
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {loading ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <RefreshCw className="w-3 h-3 animate-spin" /> Memeriksa...
            </span>
          ) : hasSignature && hasPin ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Aktif &amp; Terenkripsi
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Belum Diatur
            </span>
          )}
        </div>
      </div>

      {/* Description / Information Box */}
      <div className="p-3 rounded-xl bg-[var(--input-bg)]/80 border border-[var(--border-main)] text-xs text-[var(--text-muted)] leading-relaxed space-y-1.5">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
          <p>
            Tanda tangan Anda disimpan terenkripsi dengan algoritma <strong>AES-256-GCM</strong> di server dan dilindungi <strong>PIN 6 Digit</strong>. Gambar tanda tangan tidak bisa diakses atau disalahgunakan oleh pihak luar tanpa otorisasi PIN Anda.
          </p>
        </div>
        {updatedAt && (
          <p className="text-[11px] text-slate-400 pl-6">
            Terakhir diperbarui: {new Date(updatedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-1">
        {hasSignature && hasPin ? (
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={() => {
                  setUnlockPin('');
                  setUnlockedSignatureData(null);
                  setPreviewModalOpen(true);
                }}
                className="w-full text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                style={{ backgroundColor: 'var(--primary, #2A9D8F)', color: '#FFFFFF' }}
              >
                <Eye className="w-4 h-4" /> Pratinjau TTD Saya
              </Button>

              <button
                type="button"
                onClick={() => {
                  setSetupPin('');
                  setSetupPinConfirm('');
                  setSetupOldPin('');
                  setSetupModalOpen(true);
                }}
                className="w-full py-2.5 px-3 rounded-xl text-xs font-bold border border-[var(--border-main)] bg-[var(--input-bg)] hover:bg-[var(--card-bg)] text-[var(--text-main)] transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <PenTool className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Perbarui Tanda Tangan
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-main)]/60 text-xs">
              <button
                type="button"
                onClick={() => {
                  setRecoveryPassword('');
                  setRecoveryNewPin('');
                  setRecoveryNewPinConfirm('');
                  setRecoveryRedraw(false);
                  setForgotPinModalOpen(true);
                }}
                className="text-teal-600 hover:text-teal-700 dark:text-teal-400 font-semibold flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" /> Lupa PIN Tanda Tangan?
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeletePassword('');
                  setDeleteModalOpen(true);
                }}
                className="text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus TTD
              </button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            onClick={() => {
              setSetupPin('');
              setSetupPinConfirm('');
              setSetupOldPin('');
              setSetupModalOpen(true);
            }}
            className="w-full text-xs font-bold py-3 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            style={{ backgroundColor: 'var(--primary, #2A9D8F)', color: '#FFFFFF' }}
          >
            <PenTool className="w-4 h-4" /> Buat Tanda Tangan &amp; PIN Sekarang
          </Button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: SETUP / GAMBAR TANDA TANGAN & ATUR PIN */}
      {/* ========================================================================= */}
      {setupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[var(--border-main)] flex items-center justify-between shrink-0 bg-[var(--input-bg)]/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/60 flex items-center justify-center text-teal-700 dark:text-teal-300">
                  <PenTool className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[var(--text-main)]">
                    {hasSignature ? 'Perbarui Tanda Tangan & PIN' : 'Buat Tanda Tangan & PIN Digital'}
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Digambar sekali dan dilindungi dengan 6 digit PIN
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSetupModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Canvas Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                    Goreskan Tanda Tangan Anda di Bawah
                  </label>
                  <button
                    type="button"
                    onClick={() => sigCanvasRef.current?.clear()}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--input-bg)] hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--text-muted)] hover:text-[var(--text-main)] font-semibold transition-colors flex items-center gap-1 shadow-2xs border border-[var(--border-main)]"
                  >
                    <RotateCcw className="w-3 h-3" /> Bersihkan
                  </button>
                </div>

                <div className="border-2 border-dashed border-[var(--border-main)] rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-inner relative">
                  <SignatureCanvas
                    ref={sigCanvasRef}
                    penColor="#000000"
                    canvasProps={{
                      className: 'w-full h-44 cursor-crosshair'
                    }}
                  />
                  <div className="absolute bottom-2 left-3 pointer-events-none text-[10px] text-slate-400 select-none">
                    Tanda tangan resmi • Prep &amp; Lab Portal
                  </div>
                </div>
              </div>

              {/* Input PIN Lama (Jika ganti) */}
              {hasPin && (
                <div>
                  <label className="block text-xs font-bold text-[var(--text-main)] mb-1">
                    PIN Lama (Otorisasi)
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={setupOldPin}
                    onChange={(e) => setSetupOldPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Masukkan 6 digit PIN lama Anda"
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl px-3.5 py-2.5 text-sm font-mono tracking-widest text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  />
                </div>
              )}

              {/* Set PIN 6-Digit */}
              <div className="space-y-3 pt-2 border-t border-[var(--border-main)]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    Buat PIN Tanda Tangan (6 Digit Angka)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSetupPin(!showSetupPin)}
                    className="text-[11px] text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
                  >
                    {showSetupPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showSetupPin ? 'Sembunyikan' : 'Tampilkan'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type={showSetupPin ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={6}
                      value={setupPin}
                      onChange={(e) => setSetupPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="6 digit PIN baru"
                      className="w-full bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl px-3.5 py-2.5 text-sm font-mono tracking-widest text-[var(--text-main)] text-center focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>
                  <div>
                    <input
                      type={showSetupPin ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={6}
                      value={setupPinConfirm}
                      onChange={(e) => setSetupPinConfirm(e.target.value.replace(/\D/g, ''))}
                      placeholder="Konfirmasi 6 digit PIN"
                      className="w-full bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl px-3.5 py-2.5 text-sm font-mono tracking-widest text-[var(--text-main)] text-center focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  PIN ini akan diminta setiap kali Anda menandatangani formulir (P2H, APD, Approval SPV/SPT).
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-[var(--border-main)] flex items-center justify-end gap-2 shrink-0 bg-[var(--input-bg)]/50">
              <button
                type="button"
                onClick={() => setSetupModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--card-bg)] transition-colors"
              >
                Batal
              </button>
              <Button
                type="button"
                onClick={handleSaveSignature}
                disabled={savingSetup}
                className="px-5 py-2 text-xs font-bold shadow-xs cursor-pointer"
                style={{ backgroundColor: 'var(--primary, #2A9D8F)', color: '#FFFFFF' }}
              >
                {savingSetup ? 'Menyimpan & Mengenkripsi...' : 'Simpan Tanda Tangan & PIN'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PRATINJAU TTD TERSIMPAN (MEMERLUKAN INPUT PIN) */}
      {/* ========================================================================= */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[var(--border-main)] flex items-center justify-between shrink-0 bg-[var(--input-bg)]/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-900/60 flex items-center justify-center text-teal-700 dark:text-teal-300">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[var(--text-main)]">
                    Pratinjau Tanda Tangan Terenkripsi
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Verifikasi PIN untuk membuka tanda tangan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {unlockedSignatureData ? (
                <div className="space-y-4 text-center">
                  <div className="p-4 rounded-2xl border-2 border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 shadow-inner relative overflow-hidden flex flex-col items-center justify-center min-h-[140px]">
                    {/* Security Watermark in background */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-5 select-none text-[10px] font-black tracking-widest text-slate-900 dark:text-white uppercase leading-relaxed">
                      <span>PREPLAB SECURE VERIFIED</span>
                      <span>NIK: {inspectorNik} • AES-256</span>
                      <span>OFFICIAL DIGITAL SIGNATURE</span>
                    </div>

                    <img
                      src={unlockedSignatureData}
                      alt="Tanda Tangan Terverifikasi"
                      className="max-h-28 max-w-full object-contain relative z-10"
                    />
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Tanda Tangan Terverifikasi &amp; Siap Digunakan
                  </div>

                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Tanda tangan ini otomatis disematkan pada formulir yang Anda tandatangani menggunakan PIN 6 digit Anda.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleUnlockSignature} className="space-y-4">
                  <div className="text-center space-y-1">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 mx-auto mb-2">
                      <Lock className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      Masukkan 6 digit PIN Tanda Tangan Anda untuk mendekripsi dan melihat pratinjau:
                    </p>
                  </div>

                  <div>
                    <input
                      type={showUnlockPin ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={6}
                      autoFocus
                      value={unlockPin}
                      onChange={(e) => setUnlockPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • • • •"
                      className="w-full bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl py-3 text-center text-xl font-mono tracking-widest font-black text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                    <div className="flex justify-between items-center mt-2 px-1">
                      <button
                        type="button"
                        onClick={() => setShowUnlockPin(!showUnlockPin)}
                        className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] font-semibold flex items-center gap-1"
                      >
                        {showUnlockPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showUnlockPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPreviewModalOpen(false);
                          setForgotPinModalOpen(true);
                        }}
                        className="text-[11px] text-teal-600 hover:text-teal-700 font-semibold"
                      >
                        Lupa PIN?
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={unlocking || unlockPin.length !== 6}
                    className="w-full text-xs font-bold py-2.5 shadow-xs cursor-pointer"
                    style={{ backgroundColor: 'var(--primary, #2A9D8F)', color: '#FFFFFF' }}
                  >
                    {unlocking ? 'Membuka Enkripsi...' : 'Buka Tanda Tangan'}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: LUPA PIN (RECOVERY VIA PASSWORD AKUN PORTAL) */}
      {/* ========================================================================= */}
      {forgotPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[var(--border-main)] flex items-center justify-between shrink-0 bg-[var(--input-bg)]/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-300">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[var(--text-main)]">
                    Pemulihan / Reset PIN Tanda Tangan
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Verifikasi identitas dengan Password Akun Portal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForgotPinModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleRecoverPin} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                Untuk keamanan, masukkan <strong>Password Akun Portal</strong> Anda. Setelah terverifikasi, Anda dapat membuat PIN baru tanpa perlu bantuan Admin.
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-main)] mb-1">
                  Password Akun Portal Anda
                </label>
                <input
                  type="password"
                  required
                  value={recoveryPassword}
                  onChange={(e) => setRecoveryPassword(e.target.value)}
                  placeholder="Masukkan password akun login Anda"
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border-main)]">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-main)] mb-1">
                    PIN Baru (6 Digit)
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={recoveryNewPin}
                    onChange={(e) => setRecoveryNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="6 digit angka"
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-sm font-mono text-center tracking-widest text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-main)] mb-1">
                    Konfirmasi PIN Baru
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={recoveryNewPinConfirm}
                    onChange={(e) => setRecoveryNewPinConfirm(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ulangi PIN baru"
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-sm font-mono text-center tracking-widest text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  />
                </div>
              </div>

              {/* Opsi Gambar Ulang TTD Sekalian */}
              <div className="pt-2 border-t border-[var(--border-main)] space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-main)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={recoveryRedraw}
                    onChange={(e) => setRecoveryRedraw(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-700"
                  />
                  <span>Gambar ulang tanda tangan baru sekalian (Opsional)</span>
                </label>

                {recoveryRedraw && (
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => recoveryCanvasRef.current?.clear()}
                        className="text-[10px] text-slate-500 hover:text-slate-700 font-semibold"
                      >
                        Bersihkan
                      </button>
                    </div>
                    <div className="border border-[var(--border-main)] rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                      <SignatureCanvas
                        ref={recoveryCanvasRef}
                        penColor="#000000"
                        canvasProps={{
                          className: 'w-full h-32 cursor-crosshair'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[var(--border-main)] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setForgotPinModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--card-bg)]"
                >
                  Batal
                </button>
                <Button
                  type="submit"
                  disabled={savingRecovery}
                  className="px-5 py-2 text-xs font-bold shadow-xs cursor-pointer"
                  style={{ backgroundColor: 'var(--primary, #2A9D8F)', color: '#FFFFFF' }}
                >
                  {savingRecovery ? 'Memproses...' : 'Reset PIN Sekarang'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: HAPUS TANDA TANGAN */}
      {/* ========================================================================= */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl shadow-xl p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-[var(--text-main)]">
                Hapus Tanda Tangan &amp; PIN?
              </h4>
              <p className="text-xs text-[var(--text-muted)]">
                Tanda tangan terenkripsi dan PIN Anda akan dihapus permanen dari server. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-main)] mb-1">
                Password Akun Anda untuk Konfirmasi
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Masukkan password akun portal"
                className="w-full bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--card-bg)] border border-[var(--border-main)]"
              >
                Batal
              </button>
              <Button
                type="button"
                variant="danger"
                disabled={deleting || !deletePassword}
                onClick={handleDeleteSignature}
                className="flex-1 text-xs font-bold py-2"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
