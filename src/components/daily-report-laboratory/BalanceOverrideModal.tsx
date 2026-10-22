import React, { useState } from 'react';
import { 
  X, AlertTriangle, ShieldAlert, History, UserCheck, 
  ArrowRight, FileSpreadsheet, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  ShiftType, 
  BalanceOverrideAuditLog 
} from '../daily-performance-v2/daily-performance-v2-types';
import { saveBalanceAuditLog } from '../daily-performance-v2/daily-performance-v2-utils';

interface PreviousShiftSummary {
  date: string;
  shift: string;
  regu: string;
  foreman: string;
  originalBalance: number;
  intake?: number;
  finished?: number;
  stationName: string;
}

interface BalanceOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationKey: 'press' | 'edxrf' | 'fusion' | 'loi' | 'wdxrf' | 'qc' | 'report';
  stationName: string;
  currentValue: number;
  previousShiftInfo: PreviousShiftSummary;
  currentDate: string;
  currentShift: ShiftType;
  currentRegu: string;
  availableEmployees: Array<{ nik: string; name: string }>;
  onApplyOverride: (newValue: number, log: BalanceOverrideAuditLog) => void;
}

export const BalanceOverrideModal: React.FC<BalanceOverrideModalProps> = ({
  isOpen,
  onClose,
  stationKey,
  stationName,
  currentValue,
  previousShiftInfo,
  currentDate,
  currentShift,
  currentRegu,
  availableEmployees,
  onApplyOverride
}) => {
  if (!isOpen) return null;

  const [newValue, setNewValue] = useState<number>(currentValue);
  const [modifiedBy, setModifiedBy] = useState<string>(availableEmployees[0]?.name || '');
  const [customModifiedBy, setCustomModifiedBy] = useState<string>('');
  const [reasonCategory, setReasonCategory] = useState<string>('Salah catat sisa fisik di akhir shift sebelumnya');
  const [investigationNotes, setInvestigationNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const finalModifiedBy = modifiedBy === 'OTHER' ? customModifiedBy : modifiedBy;

  const handleSave = () => {
    if (!finalModifiedBy.trim()) {
      toast.error('Harap masukkan nama personil yang melakukan koreksi.');
      return;
    }
    if (newValue < 0 || isNaN(newValue)) {
      toast.error('Nilai saldo terkoreksi tidak valid.');
      return;
    }
    if (newValue === currentValue) {
      toast.warning('Nilai baru sama dengan nilai saat ini. Tidak ada perubahan yang disimpan.');
      onClose();
      return;
    }

    setIsSubmitting(true);
    const nowIso = new Date().toISOString();
    const finalReason = `${reasonCategory}${investigationNotes ? `: ${investigationNotes}` : ''}`;

    const auditLog: BalanceOverrideAuditLog = {
      id: `audit_bal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: nowIso,
      date: currentDate,
      shift: currentShift,
      regu: currentRegu,
      stationKey,
      stationName,
      previousShiftInfo: {
        date: previousShiftInfo.date,
        shift: previousShiftInfo.shift,
        regu: previousShiftInfo.regu,
        foreman: previousShiftInfo.foreman,
        originalBalance: previousShiftInfo.originalBalance,
        intake: previousShiftInfo.intake,
        finished: previousShiftInfo.finished
      },
      originalValue: currentValue,
      correctedValue: newValue,
      modifiedBy: finalModifiedBy.trim(),
      reason: finalReason,
      investigationNotes: investigationNotes.trim()
    };

    saveBalanceAuditLog(auditLog);
    onApplyOverride(newValue, auditLog);
    toast.success(`Saldo awal ${stationName} berhasil dikoreksi menjadi ${newValue} spl dan terekam di Audit Trail.`);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-200/50 dark:border-amber-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                Koreksi Saldo Awal (Audit Override)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Stasiun: <strong className="text-amber-700 dark:text-amber-400">{stationName}</strong>
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Box Peringatan Traceback */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-amber-900 dark:text-amber-200 block text-xs">
                Perhatian Integritas Data & Traceback Alur
              </span>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                Nilai saldo awal secara default ditarik otomatis dari saldo akhir (OS) shift sebelumnya.
                Apabila nilai fisik di lapangan berbeda, kemungkinan terjadi kesalahan pada 
                <strong> penginputan awal hulu</strong> atau <strong>penginputan selesai (finish)</strong> pada shift sebelumnya.
                Setiap perubahan akan terekap secara permanen dalam Audit Log.
              </p>
            </div>
          </div>

          {/* Laporan Shift Sebelumnya */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
                <History className="w-4 h-4 text-slate-500" />
                Data Rekam Laporan Shift Sebelumnya
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 font-mono font-bold text-slate-700 dark:text-slate-300">
                {previousShiftInfo.date} • Shift {previousShiftInfo.shift}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">Foreman Bertugas</span>
                <strong className="text-slate-800 dark:text-slate-200 truncate block">
                  {previousShiftInfo.foreman || 'Foreman Shift Lalu'}
                </strong>
                <span className="text-[9px] text-slate-500">{previousShiftInfo.regu || 'Regu -'}</span>
              </div>

              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">Sampel Masuk (Intake)</span>
                <strong className="text-slate-800 dark:text-slate-200 font-mono">
                  {previousShiftInfo.intake !== undefined ? `${previousShiftInfo.intake} spl` : '-'}
                </strong>
              </div>

              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">Selesai (Finished)</span>
                <strong className="text-slate-800 dark:text-slate-200 font-mono">
                  {previousShiftInfo.finished !== undefined ? `${previousShiftInfo.finished} spl` : '-'}
                </strong>
              </div>

              <div className="p-2 rounded-xl bg-amber-100/60 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
                <span className="text-amber-700 dark:text-amber-400 block text-[10px] font-semibold">Saldo Sisa Resmi (OS)</span>
                <strong className="text-amber-900 dark:text-amber-200 font-mono text-sm">
                  {previousShiftInfo.originalBalance} spl
                </strong>
              </div>
            </div>
          </div>

          {/* Form Penggantian / Koreksi */}
          <div className="space-y-3.5">
            <span className="font-bold text-slate-800 dark:text-white block text-xs">
              Formulir Penyesuaian Nilai & Perekaman Personil
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Nilai Saldo Terkoreksi (Baru)
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number"
                    min={0}
                    value={newValue}
                    onChange={e => setNewValue(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-base text-slate-900 dark:text-white"
                  />
                  <span className="text-xs text-slate-500 font-semibold">sampel</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Nilai sistem sebelumnya: <strong className="font-mono">{currentValue} spl</strong>
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Personil yang Melakukan Penggantian
                </label>
                <select
                  value={modifiedBy}
                  onChange={e => setModifiedBy(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                >
                  {availableEmployees.map(emp => (
                    <option key={emp.nik} value={emp.name}>
                      {emp.name} ({emp.nik})
                    </option>
                  ))}
                  <option value="OTHER">+ Input Personil Lain...</option>
                </select>

                {modifiedBy === 'OTHER' && (
                  <input 
                    type="text"
                    placeholder="Ketik nama personil pengubah..."
                    value={customModifiedBy}
                    onChange={e => setCustomModifiedBy(e.target.value)}
                    className="w-full mt-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Kategori Alasan Penggantian
              </label>
              <select
                value={reasonCategory}
                onChange={e => setReasonCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                <option value="Salah catat sisa fisik di akhir shift sebelumnya">
                  Salah catat sisa fisik di akhir shift sebelumnya (aktual di meja berbeda)
                </option>
                <option value="Kekeliruan input intake sampel masuk di shift sebelumnya">
                  Kekeliruan input intake sampel masuk di shift sebelumnya
                </option>
                <option value="Kekeliruan input finished stasiun alur sebelumnya">
                  Kekeliruan input finished stasiun alur sebelumnya
                </option>
                <option value="Sampel tertahan terlambat diserahkan dari preparasi">
                  Sampel tertahan terlambat diserahkan dari preparasi
                </option>
                <option value="Lainnya (penjelasan detail pada catatan)">
                  Lainnya (penjelasan detail pada catatan)
                </option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Catatan Investigasi / Keterangan Tambahan <span className="text-slate-400">(Opsional)</span>
              </label>
              <textarea 
                rows={2}
                placeholder="Contoh: Ditemukan 4 serbuk tertinggal di samping mesin press yang belum terhitung oleh foreman shift malam..."
                value={investigationNotes}
                onChange={e => setInvestigationNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Foreman shift lalu: <strong>{previousShiftInfo.foreman || 'Terekam'}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Koreksi & Catat Audit Log</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
