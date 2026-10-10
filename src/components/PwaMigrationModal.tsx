import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Sparkles, 
  ExternalLink, 
  Download, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  Trash2, 
  X, 
  ArrowRight, 
  Globe 
} from 'lucide-react';
import { isPwaInstalled } from '../push-notifications';

const OFFICIAL_DOMAIN = 'portal.preplabtbp.com';
const OFFICIAL_URL = 'https://portal.preplabtbp.com/';

export function isOldRunAppDomain(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);
  
  if (searchParams.get('test_migration_old') === '1') return true;

  return (
    hostname.includes('run.app') ||
    hostname.includes('preplab-portal-1034501170626')
  );
}

export function isNewOfficialDomain(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);

  if (searchParams.get('test_migration_new') === '1') return true;

  return (
    hostname === OFFICIAL_DOMAIN ||
    hostname.includes('preplabtbp.com')
  );
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaMigrationModal() {
  const [isOldDomain, setIsOldDomain] = useState(false);
  const [isNewDomain, setIsNewDomain] = useState(false);
  const [showOldModal, setShowOldModal] = useState(false);
  const [showOldBanner, setShowOldBanner] = useState(false);
  const [showNewWelcome, setShowNewWelcome] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalledSuccess, setIsInstalledSuccess] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onOld = isOldRunAppDomain();
    const onNew = isNewOfficialDomain();
    setIsOldDomain(onOld);
    setIsNewDomain(onNew);

    // 1. Logika untuk domain lama (*.run.app)
    if (onOld) {
      const dismissedUntil = localStorage.getItem('preplab_old_migration_dismissed_until');
      const now = Date.now();
      const isDismissedRecently = dismissedUntil && parseInt(dismissedUntil, 10) > now;

      if (!isDismissedRecently) {
        // Tampilkan modal setelah jeda sejenak agar halaman render stabil
        const timer = setTimeout(() => {
          setShowOldModal(true);
        }, 800);
        return () => clearTimeout(timer);
      } else {
        // Tampilkan banner ringkas di atas layar jika modal utama ditutup
        setShowOldBanner(true);
      }
    }

    // 2. Logika untuk domain baru resmi (portal.preplabtbp.com)
    if (onNew) {
      const searchParams = new URLSearchParams(window.location.search);
      const isFromMigration = searchParams.get('migrate') === '1' || searchParams.get('from_migration') === '1';
      const welcomeSeen = localStorage.getItem('preplab_new_domain_welcome_seen') === '1';

      if (isFromMigration || (!welcomeSeen && !isPwaInstalled())) {
        setShowNewWelcome(true);
      }
    }
  }, []);

  // Tangkap event install PWA dari browser
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalledSuccess(true);
      localStorage.setItem('preplab_new_domain_welcome_seen', '1');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Handler: Buka URL resmi dari domain lama
  const handleOpenOfficialSite = () => {
    const target = `${OFFICIAL_URL}?migrate=1`;
    window.location.href = target;
  };

  // Handler: Tutup modal domain lama sementara
  const handleDismissOldModal = () => {
    // Beri jeda 4 jam sebelum modal popup muncul lagi, agar tidak mengganggu jika sedang kerja darurat
    const fourHours = 4 * 60 * 60 * 1000;
    localStorage.setItem('preplab_old_migration_dismissed_until', String(Date.now() + fourHours));
    setShowOldModal(false);
    setShowOldBanner(true);
  };

  // Handler: Eksekusi install PWA di domain baru
  const handleTriggerInstall = async () => {
    if (!deferredPrompt) {
      // Jika browser tidak mendukung trigger otomatis (misal iOS Safari)
      return;
    }

    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalledSuccess(true);
        localStorage.setItem('preplab_new_domain_welcome_seen', '1');
      }
    } catch (err) {
      console.error('Install prompt error:', err);
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismissNewWelcome = () => {
    localStorage.setItem('preplab_new_domain_welcome_seen', '1');
    setShowNewWelcome(false);
  };

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  // ==========================================
  // CASE A: RUNNING ON OLD DOMAIN (*.run.app)
  // ==========================================
  if (isOldDomain) {
    return (
      <>
        {/* Banner Sticky Tipis di Bagian Atas jika modal ditutup */}
        {showOldBanner && !showOldModal && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white px-3 py-2 shadow-md flex items-center justify-between text-xs md:text-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 font-medium truncate">
              <span className="flex h-2 w-2 rounded-full bg-emerald-300 animate-ping" />
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="truncate">
                Domain Resmi Perusahaan: <span className="font-bold underline">portal.preplabtbp.com</span> (Akses 10x lebih cepat)
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <button
                onClick={handleOpenOfficialSite}
                className="bg-white text-emerald-800 hover:bg-emerald-50 px-2.5 py-1 rounded-md font-semibold text-xs flex items-center gap-1 transition shadow-sm"
              >
                <span>Beralih</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => setShowOldBanner(false)}
                className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition"
                title="Tutup banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Modal Pintar Pembaruan Aplikasi PWA */}
        {showOldModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
            <div className="relative w-full max-w-lg bg-white dark:bg-[#1e232d] text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-emerald-500/30 overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Header Gradient Accent */}
              <div className="relative px-6 pt-7 pb-5 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white">
                <button
                  onClick={handleDismissOldModal}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white/90 hover:text-white transition"
                  title="Tutup sementara"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white shadow-inner">
                    <Smartphone className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/25 border border-emerald-300/40 text-emerald-100">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      Domain Baru Resmi
                    </span>
                    <h3 className="text-xl font-bold tracking-tight text-white mt-0.5">
                      Pembaruan Aplikasi PrepLab Portal
                    </h3>
                  </div>
                </div>

                <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed">
                  Portal kini telah resmi menggunakan domain perusahaan{' '}
                  <span className="font-bold text-white underline decoration-amber-300 underline-offset-2">
                    portal.preplabtbp.com
                  </span>{' '}
                  dengan kecepatan akses <span className="font-bold text-amber-200">10x lebih kencang</span>.
                </p>
              </div>

              {/* Body Content */}
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
                    <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-emerald-950 dark:text-emerald-200">
                        Kecepatan 10x Lebih Cepat (Server Jakarta)
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-normal">
                        Koneksi langsung dari data center Jakarta memangkas latensi sehingga buka aplikasi, foto temuan, dan update tabel instan tanpa jeda.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/40">
                    <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-teal-600 dark:text-teal-400 shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-teal-950 dark:text-teal-200">
                        Data 100% Aman & Terintegrasi
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-normal">
                        Semua absensi, tiket, dan inspeksi langsung tersambung utuh di sistem baru. Tidak ada data yang hilang.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30">
                    <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-amber-950 dark:text-amber-200">
                        Langkah Mudah di HP Anda
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-normal">
                        Klik tombol di bawah untuk membuka versi resmi, pasang icon baru ke Layar Utama, lalu Anda cukup menghapus icon lama dari layar HP.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col gap-2.5">
                  <button
                    onClick={handleOpenOfficialSite}
                    className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transform active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <span>Buka & Pasang Versi Resmi</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleDismissOldModal}
                    className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition cursor-pointer"
                  >
                    Nanti Saja (Lanjutkan Kerja di Sini)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ====================================================
  // CASE B: RUNNING ON NEW DOMAIN (portal.preplabtbp.com)
  // ====================================================
  if (isNewDomain && showNewWelcome) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
        <div className="relative w-full max-w-lg bg-white dark:bg-[#1e232d] text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-emerald-500/30 overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="relative px-6 pt-7 pb-5 bg-gradient-to-br from-teal-600 via-emerald-600 to-cyan-700 text-white">
            <button
              onClick={handleDismissNewWelcome}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white/90 hover:text-white transition"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white shadow-inner">
                <Globe className="w-6 h-6 animate-spin-slow" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/25 border border-emerald-300/40 text-emerald-100">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  portal.preplabtbp.com
                </span>
                <h3 className="text-xl font-bold tracking-tight text-white mt-0.5">
                  Selamat Datang di Portal Resmi!
                </h3>
              </div>
            </div>

            <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed">
              Anda kini telah terhubung langsung ke domain resmi perusahaan dengan server Jakarta.
            </p>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {isInstalledSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/50 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-sm sm:text-base">
                  Aplikasi Berhasil Dipasang ke HP Anda!
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Jangan lupa untuk <strong>menghapus icon lama</strong> dari layar HP Anda agar tidak keliru membuka versi sebelumnya.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleDismissNewWelcome}
                    className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-md transition"
                  >
                    Siap, Masuk ke Aplikasi
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-semibold text-xs sm:text-sm">
                      <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Langkah 1: Pasang Versi Baru ke Layar Utama</span>
                    </div>
                    {deferredPrompt ? (
                      <button
                        onClick={handleTriggerInstall}
                        disabled={isInstalling}
                        className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>{isInstalling ? 'Menyiapkan...' : 'Pasang ke Layar Utama HP'}</span>
                      </button>
                    ) : isIOS ? (
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        Di browser Safari, klik tombol <strong>Bagikan (Share ⎋)</strong> di bawah layar, lalu pilih <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.
                      </p>
                    ) : (
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        Klik menu titik tiga (<strong>⋮</strong>) di sudut kanan atas Chrome, lalu pilih <strong>Tambahkan ke Layar Utama (Install App)</strong>.
                      </p>
                    )}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-amber-950 dark:text-amber-200">
                        Langkah 2: Hapus Icon Shortcut Lama
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-normal">
                        Setelah icon baru terpasang di layar HP, hapus icon PrepLab yang lama agar Anda selalu membuka versi terbaru yang 10x lebih cepat.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleDismissNewWelcome}
                    className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Mengerti, Lanjutkan ke Portal
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
