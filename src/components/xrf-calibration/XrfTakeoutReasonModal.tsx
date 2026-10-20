import React, { useState } from 'react';
import { 
  ShieldAlert, UserCheck, AlertTriangle, X, Check, 
  HelpCircle, Sparkles, Activity, FileText 
} from 'lucide-react';
import { CurrentUserInfo, XrfOffspecAuditLog } from '../../utils/xrfTakeoutAuth';
import { XrfChartLimitData, XrfPointData } from './XrfQcChartCard';

interface XrfTakeoutReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  userInfo: CurrentUserInfo;
  targetPoint: {
    point: XrfPointData;
    element: string;
    limits: XrfChartLimitData;
    instrumentCode: string;
    instrumentName: string;
    standardCode: string;
  };
  onConfirm: (reason: string) => void;
}

const PREDEFINED_REASONS = [
  'Fluktuasi tabung X-Ray / drift sensor instrumen',
  'Preparasi pelet / sample cup tidak homogen atau retak',
  'Kontaminasi film Mylar / debu pada sample chamber',
  'Hasil pengulangan kalibrasi ulang (re-run verification)',
  'Gangguan tekanan vakum / sistem sirkulasi spektrometer',
  'Sampel standar CRM mendekati masa expired / degradasi',
];

export const XrfTakeoutReasonModal: React.FC<XrfTakeoutReasonModalProps> = ({
  isOpen,
  onClose,
  userInfo,
  targetPoint,
  onConfirm,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(PREDEFINED_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [useCustom, setUseCustom] = useState<boolean>(false);

  if (!isOpen) return null;

  const { point, element, limits, instrumentName, standardCode } = targetPoint;
  const diff = point.value - limits.nominalValue;
  const sigmaDist = limits.stdevFixed > 0 ? (diff / limits.stdevFixed) : 0;
  const absSigma = Math.abs(sigmaDist);
  const statusLabel = absSigma > 3.0 ? 'Action Limit (>3σ)' : absSigma > 2.0 ? 'Warning Limit (2-3σ)' : 'In-Control';

  const finalReason = useCustom ? (customReason.trim() || selectedReason) : selectedReason;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(finalReason);
  };

  const roleColorBadge = {
    DEV: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    MANAGER: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    SPT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    SPV: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    UNAUTHORIZED: 'bg-rose-100 text-rose-800 border-rose-300',
  }[userInfo.category] || 'bg-slate-100 text-slate-800';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Konfirmasi Take Out Data Off-Spec
              </h3>
              <p className="text-xs text-slate-500">
                Aksi ini akan dicatat dalam Audit Trail Kepatuhan ISO 17025
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Identity & Role Authorization Badge */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <div>
              <div className="font-bold text-slate-900 dark:text-white">
                {userInfo.name} <span className="font-mono text-slate-500 text-[11px]">[{userInfo.nik}]</span>
              </div>
              <div className="text-[11px] text-slate-500">{userInfo.jabatan}</div>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-black border ${roleColorBadge}`}>
            {userInfo.role}
          </span>
        </div>

        {/* Target Data Point Summary */}
        <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900/40 text-xs space-y-2">
          <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-rose-600" />
              <span>{instrumentName} • {standardCode}</span>
            </span>
            <span className="font-mono text-teal-600 dark:text-teal-400 font-extrabold text-sm">
              Unsur {element}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono text-[11.5px] pt-1 border-t border-rose-200/60 dark:border-rose-900/40">
            <div>
              <span className="text-[10px] text-slate-500 block font-sans">Terukur</span>
              <strong className="text-rose-600 font-bold">{point.value.toFixed(4)}%</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block font-sans">Nominal CRM</span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">{limits.nominalValue.toFixed(4)}%</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block font-sans">Jarak Sigma</span>
              <strong className="text-rose-600 font-black">{sigmaDist > 0 ? `+${sigmaDist.toFixed(2)}` : sigmaDist.toFixed(2)}σ</strong>
            </div>
          </div>

          <div className="flex justify-between items-center text-[10.5px] text-slate-500 pt-1">
            <span>Titik #{point.index} • Tanggal: {point.date || '-'}</span>
            <span className="font-bold text-rose-600">{statusLabel}</span>
          </div>
        </div>

        {/* Reason Selection Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Alasan & Justifikasi Take Out Data <span className="text-rose-500">*</span></span>
              <span className="text-[10.5px] font-normal text-slate-400">Wajib diisi</span>
            </label>

            {/* Predefined Quick Buttons */}
            <div className="space-y-1.5 mb-2.5">
              {PREDEFINED_REASONS.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedReason(r);
                    setUseCustom(false);
                  }}
                  className={`w-full text-left p-2 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between border ${
                    !useCustom && selectedReason === r
                      ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 text-teal-900 dark:text-teal-200 font-bold shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span className="line-clamp-1">{r}</span>
                  {!useCustom && selectedReason === r && (
                    <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0 ml-1.5" />
                  )}
                </button>
              ))}
            </div>

            {/* Custom Input Option */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setUseCustom(!useCustom)}
                className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline mb-1.5 inline-block cursor-pointer"
              >
                {useCustom ? '← Pilih dari daftar rekomendasi' : '+ Ketik alasan spesifik lainnya...'}
              </button>

              {useCustom && (
                <textarea
                  rows={2}
                  required
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Ketik keterangan teknis alasan data dikeluarkan dari kalkulasi grafik kendali..."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Simpan & Take Out Data</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
