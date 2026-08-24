import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Sparkles, Key, CheckCircle2, AlertCircle, X, ArrowRight, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { AnimatedSunCondition } from './DailyGreetingHero';

interface UsernamePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  nik: string;
  currentUsername?: string;
  fullName?: string;
  onUsernameUpdated: (newUsername: string) => void;
  isMandatory?: boolean;
}

export function UsernamePromptModal({
  isOpen,
  onClose,
  nik,
  currentUsername = '',
  fullName = '',
  onUsernameUpdated,
  isMandatory = false
}: UsernamePromptModalProps) {
  const [username, setUsername] = useState(currentUsername);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUsername(currentUsername || '');
      setErrorMsg('');
    }
  }, [isOpen, currentUsername]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    
    if (!cleanUsername) {
      setErrorMsg('Username tidak boleh kosong');
      return;
    }

    if (cleanUsername.length < 2 || cleanUsername.length > 30) {
      setErrorMsg('Username harus antara 2 hingga 30 karakter');
      return;
    }

    if (!/^[a-zA-Z0-9_.\- ]+$/.test(cleanUsername)) {
      setErrorMsg('Hanya boleh huruf, angka, spasi, titik, dash, dan underscore');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/update-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nik, username: cleanUsername })
      });
      const data = await res.json();

      if (data.status === 'success') {
        toast.success(`Username berhasil disetel ke "${cleanUsername}"!`);
        
        // Update local storage profile
        const savedProfileStr = localStorage.getItem('p2h_inspector_profile');
        if (savedProfileStr) {
          try {
            const p = JSON.parse(savedProfileStr);
            p.username = cleanUsername;
            localStorage.setItem('p2h_inspector_profile', JSON.stringify(p));
          } catch (e) {}
        }
        localStorage.setItem('p2h_inspector_username', cleanUsername);
        
        onUsernameUpdated(cleanUsername);
        window.dispatchEvent(new CustomEvent('preplab:show_daily_splash', { detail: { username: cleanUsername } }));
        onClose();
      } else {
        setErrorMsg(data.message || 'Gagal menyimpan username');
        toast.error(data.message || 'Gagal menyimpan username');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal terhubung ke server');
      toast.error('Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  const previewName = username.trim() || currentUsername || (fullName ? fullName.split(' ')[0] : 'User');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 flex flex-col"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white p-6 sm:p-7">
            {!isMandatory && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">Setel Username Panggilan</h3>
                <p className="text-xs text-teal-200/80 font-mono">NIK: {nik}</p>
              </div>
            </div>
          </div>

          {/* Body Content */}
          <form onSubmit={handleSave} className="p-6 space-y-5">
            {/* Info Cards */}
            <div className="space-y-2.5">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-teal-50/80 border border-teal-100 text-teal-900 text-xs leading-relaxed">
                <Key className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-teal-950 block">Bisa Digunakan untuk Login</strong>
                  Anda bisa login ke portal menggunakan Username ini selain menggunakan NIK.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-amber-50/80 border border-amber-100 text-amber-900 text-xs leading-relaxed">
                <User className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-amber-950 block">Nama Panggilan Portal</strong>
                  Akan digunakan sebagai sapaan resmi Anda di beranda Portal PrepLab.
                </div>
              </div>
            </div>

            {/* Input Field */}
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Username / Nama Panggilan
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="Contoh: naufal, budi_lab, dimas"
                  maxLength={30}
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                />
              </div>
              {errorMsg && (
                <p className="text-xs text-rose-500 font-medium flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errorMsg}
                </p>
              )}
            </div>

            {/* Live Preview Greeting Card */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-teal-400">Live Preview Sapaan Beranda</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-sm font-semibold flex items-center gap-1">
                <span>Selamat Pagi,</span>
                <span className="text-teal-300 font-bold">{previewName}</span>
                <span>!</span>
                <AnimatedSunCondition type="morning" />
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              {!isMandatory && (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
                >
                  Nanti Saja
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Menyimpan...' : 'Simpan Username'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
