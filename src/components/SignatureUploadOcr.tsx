import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Sparkles, 
  Sliders, 
  RotateCcw, 
  Shield, 
  Palette, 
  RefreshCw,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Layers
} from 'lucide-react';
import { 
  processSignatureImage, 
  SignatureAspectRatio,
  ProcessSignatureOptions, 
  DEFAULT_SIGNATURE_OPTIONS 
} from '../utils/signatureProcessing';

interface SignatureUploadOcrProps {
  inspectorName?: string | null;
  inspectorNik?: string | null;
  onProcessedSignatureChange: (dataUrl: string | null) => void;
}

export function SignatureUploadOcr({ 
  inspectorName, 
  inspectorNik, 
  onProcessedSignatureChange 
}: SignatureUploadOcrProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawPreviewUrl, setRawPreviewUrl] = useState<string | null>(null);
  const [processedDataUrl, setProcessedDataUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Proportional & Formatting Settings
  const [aspectRatio, setAspectRatio] = useState<SignatureAspectRatio>('standard');
  const [scale, setScale] = useState<number>(1.0);
  const [trimPadding, setTrimPadding] = useState<number>(24);
  const [threshold, setThreshold] = useState<number>(205);
  const [colorMode, setColorMode] = useState<'black' | 'dark-blue' | 'original'>('black');
  const [contrast, setContrast] = useState<number>(1.3);
  const [invert, setInvert] = useState<boolean>(false);
  
  // Watermark Settings
  const [watermarkEnabled, setWatermarkEnabled] = useState<boolean>(true);
  const [watermarkText, setWatermarkText] = useState<string>('HANYA UNTUK PREPLAB PORTAL');
  const [watermarkSubText, setWatermarkSubText] = useState<string>(
    inspectorNik && inspectorName ? `${inspectorName} • ${inspectorNik}` : ''
  );
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.18);
  const [watermarkStyle, setWatermarkStyle] = useState<'diagonal' | 'corner' | 'pattern'>('diagonal');
  const [watermarkSize, setWatermarkSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [watermarkLayer, setWatermarkLayer] = useState<'behind' | 'front'>('behind');

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Silakan pilih file gambar yang valid (JPG, PNG, WEBP)');
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setRawPreviewUrl(url);
    }
  };

  // Re-run processing whenever file or options change
  useEffect(() => {
    if (!selectedFile && !rawPreviewUrl) {
      setProcessedDataUrl(null);
      onProcessedSignatureChange(null);
      return;
    }

    let isMounted = true;
    const runProcessing = async () => {
      try {
        setProcessing(true);
        const source = selectedFile || rawPreviewUrl!;
        const res = await processSignatureImage(source, {
          threshold,
          colorMode,
          contrast,
          invert,
          aspectRatio,
          scale,
          trimPadding,
          watermark: {
            enabled: watermarkEnabled,
            text: watermarkText,
            subText: watermarkSubText,
            opacity: watermarkOpacity,
            style: watermarkStyle,
            size: watermarkSize,
            layer: watermarkLayer,
            color: '#0f766e'
          }
        });

        if (isMounted) {
          setProcessedDataUrl(res.dataUrl);
          onProcessedSignatureChange(res.dataUrl);
        }
      } catch (err) {
        console.warn('Gagal memproses gambar tanda tangan:', err);
      } finally {
        if (isMounted) {
          setProcessing(false);
        }
      }
    };

    const timer = setTimeout(runProcessing, 150); // debounce slider
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [
    selectedFile,
    rawPreviewUrl,
    threshold,
    colorMode,
    contrast,
    invert,
    aspectRatio,
    scale,
    trimPadding,
    watermarkEnabled,
    watermarkText,
    watermarkSubText,
    watermarkOpacity,
    watermarkStyle,
    watermarkSize,
    watermarkLayer
  ]);

  // Clean up object URL
  useEffect(() => {
    return () => {
      if (rawPreviewUrl && rawPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(rawPreviewUrl);
      }
    };
  }, [rawPreviewUrl]);

  return (
    <div className="space-y-4">
      {/* Upload Dropzone if no file selected */}
      {!rawPreviewUrl ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[var(--border-main)] hover:border-teal-500 rounded-2xl p-6 text-center cursor-pointer bg-[var(--input-bg)]/60 hover:bg-teal-500/5 transition-all group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900/60 text-teal-600 dark:text-teal-400 mx-auto flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-2xs">
            <Upload className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-[var(--text-main)] mb-1">
            Klik atau Tarik Foto Tanda Tangan ke Sini
          </p>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
            Mendukung foto tanda tangan di atas kertas putih dari kamera HP atau file scan (JPG, PNG). Otomatis dibuat transparan dan proporsional.
          </p>
          <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-[11px] font-semibold text-teal-700 dark:text-teal-300">
            <Sparkles className="w-3.5 h-3.5 text-teal-500" /> Auto OCR &amp; Format Proporsional Resmi
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {/* Action Bar Above Preview */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Pratinjau TTD Transparan
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> PNG Transparan
              </span>
              {processing && (
                <span className="inline-flex items-center gap-1 text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Memproses...
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold border transition-colors flex items-center gap-1 ${
                  showAdvanced 
                    ? 'bg-teal-100 dark:bg-teal-900/60 border-teal-300 text-teal-800 dark:text-teal-200' 
                    : 'bg-[var(--input-bg)] border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <Sliders className="w-3 h-3" />
                {showAdvanced ? 'Tutup Opsi' : 'Pengaturan Lanjutan'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setRawPreviewUrl(null);
                  setProcessedDataUrl(null);
                  onProcessedSignatureChange(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--input-bg)] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 border border-[var(--border-main)] font-semibold text-[var(--text-muted)] transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Ganti Foto
              </button>
            </div>
          </div>

          {/* Proportional Transparent Checkerboard Canvas Preview */}
          <div className="relative rounded-2xl border-2 border-dashed border-teal-500/40 overflow-hidden shadow-inner p-6 h-52 sm:h-56 flex items-center justify-center bg-slate-100 dark:bg-slate-900">
            {/* Checkerboard Pattern for Transparency Indicator */}
            <div 
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{
                backgroundImage: `
                  linear-gradient(45deg, #cbd5e1 25%, transparent 25%), 
                  linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), 
                  linear-gradient(45deg, transparent 75%, #cbd5e1 75%), 
                  linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)
                `,
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px'
              }}
            />

            {processedDataUrl ? (
              <img
                src={processedDataUrl}
                alt="Pratinjau Tanda Tangan Proporsional"
                className="relative max-h-full max-w-full object-contain filter drop-shadow-xs transition-opacity duration-150"
              />
            ) : (
              <div className="relative text-center text-xs text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-1 text-teal-500" />
                Mengekstrak tanda tangan...
              </div>
            )}
          </div>

          {/* Card Pengaturan Tampilan & Format TTD */}
          <div className="p-3.5 rounded-2xl bg-[var(--input-bg)]/80 border border-[var(--border-main)] space-y-3 text-xs">
            {/* Baris 1: Proporsi Kanvas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold text-[var(--text-main)] flex items-center gap-1.5 text-xs shrink-0">
                <Maximize2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                Format Proporsi:
              </span>
              <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto">
                {(['standard', 'wide', 'fit'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setAspectRatio(mode)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer ${
                      aspectRatio === mode
                        ? 'bg-teal-600 text-white shadow-2xs font-bold'
                        : 'bg-[var(--card-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-main)]'
                    }`}
                  >
                    {mode === 'standard' ? '2:1 Standar' : mode === 'wide' ? '2.5:1 Lebar' : 'Fit Pas'}
                  </button>
                ))}
              </div>
            </div>

            {/* Baris 2: Warna Tinta */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t border-[var(--border-main)]/60">
              <span className="font-bold text-[var(--text-main)] flex items-center gap-1.5 text-xs shrink-0">
                <Palette className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                Warna Tinta:
              </span>
              <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setColorMode('black')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    colorMode === 'black'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs font-bold'
                      : 'bg-[var(--card-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-main)]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-black border border-white/40" />
                  Hitam Resmi
                </button>

                <button
                  type="button"
                  onClick={() => setColorMode('dark-blue')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    colorMode === 'dark-blue'
                      ? 'bg-blue-700 text-white shadow-2xs font-bold'
                      : 'bg-[var(--card-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-main)]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-700 border border-white/40" />
                  Biru Pena
                </button>

                <button
                  type="button"
                  onClick={() => setColorMode('original')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    colorMode === 'original'
                      ? 'bg-teal-600 text-white shadow-2xs font-bold'
                      : 'bg-[var(--card-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-main)]'
                  }`}
                >
                  Asli Foto
                </button>
              </div>
            </div>
          </div>

          {/* Watermark Protection Box */}
          <div className="p-3.5 rounded-2xl bg-[var(--card-bg)] border border-teal-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5 cursor-pointer">
                <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Watermark Pengaman Digital
              </label>
              <input
                type="checkbox"
                checked={watermarkEnabled}
                onChange={(e) => setWatermarkEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
              />
            </div>

            {watermarkEnabled && (
              <div className="space-y-3 pt-1 text-xs">
                {/* Preset Chips */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-[var(--text-muted)]">Pilihan Cepat Teks:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setWatermarkText('HANYA UNTUK PREPLAB PORTAL');
                        setWatermarkSubText(inspectorNik && inspectorName ? `${inspectorName} • ${inspectorNik}` : '');
                      }}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border text-center transition-colors cursor-pointer truncate ${
                        watermarkText === 'HANYA UNTUK PREPLAB PORTAL'
                          ? 'bg-teal-50 dark:bg-teal-950/80 border-teal-400 text-teal-700 dark:text-teal-300 font-bold shadow-2xs'
                          : 'bg-[var(--input-bg)] border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      PrepLab Portal
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setWatermarkText(inspectorName ? inspectorName.toUpperCase() : 'TANDA TANGAN RESMI');
                        setWatermarkSubText(inspectorNik ? `NIK: ${inspectorNik}` : 'INTERNAL TBP');
                      }}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border text-center transition-colors cursor-pointer truncate ${
                        watermarkText === (inspectorName ? inspectorName.toUpperCase() : 'TANDA TANGAN RESMI')
                          ? 'bg-teal-50 dark:bg-teal-950/80 border-teal-400 text-teal-700 dark:text-teal-300 font-bold shadow-2xs'
                          : 'bg-[var(--input-bg)] border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      Nama &amp; NIK Personil
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setWatermarkText('DOKUMEN RESMI TBP');
                        setWatermarkSubText('PREP & LAB PORTAL');
                      }}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border text-center transition-colors cursor-pointer truncate ${
                        watermarkText === 'DOKUMEN RESMI TBP'
                          ? 'bg-teal-50 dark:bg-teal-950/80 border-teal-400 text-teal-700 dark:text-teal-300 font-bold shadow-2xs'
                          : 'bg-[var(--input-bg)] border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      Dokumen Resmi TBP
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                      Teks Watermark Utama
                    </label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      placeholder="Contoh: HANYA UNTUK PREPLAB"
                      className="w-full bg-[var(--input-bg)] border border-[var(--border-main)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                      Keterangan Tambahan
                    </label>
                    <input
                      type="text"
                      value={watermarkSubText}
                      onChange={(e) => setWatermarkSubText(e.target.value)}
                      placeholder="Contoh: NIK / Tanggal"
                      className="w-full bg-[var(--input-bg)] border border-[var(--border-main)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Gaya & Ukuran Watermark Baris Rapi */}
                <div className="space-y-2 pt-1 border-t border-[var(--border-main)]/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <span className="text-[11px] font-semibold text-[var(--text-muted)]">Gaya Watermark:</span>
                    <div className="grid grid-cols-3 gap-1 w-full sm:w-auto">
                      {(['diagonal', 'corner', 'pattern'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setWatermarkStyle(st)}
                          className={`py-1 px-2.5 rounded-lg text-[11px] font-semibold text-center transition-all cursor-pointer ${
                            watermarkStyle === st
                              ? 'bg-teal-600 text-white font-bold shadow-2xs'
                              : 'bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-main)]'
                          }`}
                        >
                          {st === 'diagonal' ? 'Miring' : st === 'corner' ? 'Pojok' : 'Pola'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <span className="text-[11px] font-semibold text-[var(--text-muted)]">Ukuran Watermark:</span>
                    <div className="grid grid-cols-3 gap-1 w-full sm:w-auto">
                      {(['sm', 'md', 'lg'] as const).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setWatermarkSize(sz)}
                          className={`py-1 px-2.5 rounded-lg text-[11px] font-semibold text-center transition-all cursor-pointer ${
                            watermarkSize === sz
                              ? 'bg-teal-600 text-white font-bold shadow-2xs'
                              : 'bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-main)]'
                          }`}
                        >
                          {sz === 'sm' ? 'Kecil' : sz === 'md' ? 'Sedang' : 'Besar'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Advanced Adjustment Panel (Foldable) */}
          {showAdvanced && (
            <div className="p-3.5 rounded-2xl bg-[var(--input-bg)]/80 border border-[var(--border-main)] space-y-3 text-xs animate-in fade-in duration-150">
              {/* Zoom / Skala Goresan */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--text-main)] flex items-center gap-1">
                    <ZoomIn className="w-3 h-3 text-teal-600" /> Ukuran Goresan TTD (Zoom):
                  </span>
                  <span className="font-mono text-teal-600 font-bold">{Math.round(scale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.25"
                  step="0.05"
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              {/* Jarak Tepi / Margin Padding */}
              <div className="space-y-1.5 pt-2 border-t border-[var(--border-main)]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--text-main)]">
                    Jarak Tepi / Margin Kanvas:
                  </span>
                  <span className="font-mono text-teal-600 font-bold">{trimPadding}px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="48"
                  step="4"
                  value={trimPadding}
                  onChange={(e) => setTrimPadding(Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              {/* Sensitivitas Pembersihan Kertas */}
              <div className="space-y-1.5 pt-2 border-t border-[var(--border-main)]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--text-main)]">
                    Sensitivitas Pembersihan Kertas (Threshold):
                  </span>
                  <span className="font-mono text-teal-600 font-bold">{threshold}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="245"
                  step="1"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              {/* Kepekatan Watermark */}
              <div className="space-y-1.5 pt-2 border-t border-[var(--border-main)]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--text-main)]">
                    Transparansi Watermark:
                  </span>
                  <span className="font-mono text-teal-600 font-bold">
                    {Math.round(watermarkOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.06"
                  max="0.45"
                  step="0.02"
                  value={watermarkOpacity}
                  onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              {/* Invert & Reset */}
              <div className="pt-2 border-t border-[var(--border-main)] flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-[var(--text-main)]">
                  <input
                    type="checkbox"
                    checked={invert}
                    onChange={(e) => setInvert(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-teal-600 cursor-pointer"
                  />
                  Invert Foto (Tulisan Terang di Background Gelap)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setAspectRatio('standard');
                    setScale(1.0);
                    setTrimPadding(24);
                    setThreshold(205);
                    setContrast(1.3);
                    setInvert(false);
                    setWatermarkOpacity(0.18);
                    setWatermarkSize('md');
                    setWatermarkLayer('behind');
                  }}
                  className="text-[10px] text-teal-600 hover:underline font-semibold"
                >
                  Reset Default
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
