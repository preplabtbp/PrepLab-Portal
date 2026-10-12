import React, { useState, useEffect } from 'react';
import { 
  Sliders, FileSpreadsheet, LineChart, Table, ArrowLeft, 
  Activity, ShieldCheck, CheckCircle2, AlertTriangle, Layers, 
  RefreshCw, Sparkles 
} from 'lucide-react';
import { XrfDailyInputTab } from './XrfDailyInputTab';
import { XrfHistoryLogsTab } from './XrfHistoryLogsTab';
import { XrfControlChartsTab } from './XrfControlChartsTab';
import { XrfMasterReferenceTab } from './XrfMasterReferenceTab';
import { toast } from 'sonner';

interface XrfCalibrationScreenProps {
  onBack?: () => void;
  userPt?: string;
  inspectorNik?: string;
  inspectorName?: string;
}

export const XrfCalibrationScreen: React.FC<XrfCalibrationScreenProps> = ({
  onBack,
  userPt,
  inspectorNik,
  inspectorName,
}) => {
  const [activeTab, setActiveTab] = useState<'daily-input' | 'history-logs' | 'control-charts' | 'master-references'>('control-charts');
  const [instruments, setInstruments] = useState<Array<{ code: string; name: string }>>([
    { code: 'EPSILON_A', name: 'EPSILON A' },
    { code: 'EPSILON_B', name: 'EPSILON B' },
    { code: 'EPSILON_C', name: 'EPSILON C' },
    { code: 'EPSILON_D', name: 'EPSILON D' },
    { code: 'EPSILON_E', name: 'EPSILON E' },
  ]);
  const [standards, setStandards] = useState<Array<{ code: string; name: string }>>([
    { code: 'LIM01', name: 'LIM 01' },
    { code: 'LIM02', name: 'LIM 02' },
    { code: 'LIM03', name: 'LIM 03' },
    { code: 'LIM04', name: 'LIM 04' },
    { code: 'LIM05', name: 'LIM 05' },
    { code: 'OREAS184', name: 'OREAS 184' },
    { code: 'OREAS187', name: 'OREAS 187' },
    { code: 'OREAS189', name: 'OREAS 189' },
    { code: 'OREAS190', name: 'OREAS 190' },
    { code: 'OREAS191', name: 'OREAS 191' },
    { code: 'OREAS192', name: 'OREAS 192' },
    { code: 'OREAS193', name: 'OREAS 193' },
    { code: 'SAP19', name: 'SAP 19' },
    { code: 'OREAS194', name: 'OREAS 194' },
    { code: 'OREAS195', name: 'OREAS 195' },
  ]);

  // Load master data
  useEffect(() => {
    fetch('/api/xrf/instruments')
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setInstruments(json.data);
        }
      })
      .catch(() => {});

    fetch('/api/xrf/standards')
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setStandards(json.data);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer"
                title="Kembali ke Menu Utama"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                  PT. GANE TAMBANG SENTOSA • QA/QC
                </span>
                <span className="text-xs text-slate-400">• PrepLab Portal</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                <Activity className="w-6 h-6 text-teal-500" />
                Rekap Kalibrasi & Verifikasi Hasil Analisa XRF
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Modul verifikasi standar harian, penentuan standar deviasi, toleransi batas tindakan (±2σ / ±3σ), dan komparasi inter-alat
              </p>
            </div>
          </div>

          {/* Quick Info Badges */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-right">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Mesin XRF</div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{instruments.length} Unit Aktif</div>
            </div>
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-right">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Standar CRM</div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{standards.length} Standar</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('control-charts')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'control-charts'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <LineChart className="w-4 h-4" />
            Grafik Kontrol QC Inter-Alat (Gambar 6 & 4)
          </button>

          <button
            onClick={() => setActiveTab('daily-input')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'daily-input'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Input Verifikasi Harian (Gambar 1)
          </button>

          <button
            onClick={() => setActiveTab('history-logs')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'history-logs'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            Log Riwayat Mesin (Gambar 2 & 3)
          </button>

          <button
            onClick={() => setActiveTab('master-references')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'master-references'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Table className="w-4 h-4" />
            Master Acuan STDEV (Gambar 5)
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div>
        {activeTab === 'control-charts' && (
          <XrfControlChartsTab
            instruments={instruments}
            standards={standards}
          />
        )}

        {activeTab === 'daily-input' && (
          <XrfDailyInputTab
            instruments={instruments}
            standards={standards}
            onSuccessSave={() => setActiveTab('history-logs')}
          />
        )}

        {activeTab === 'history-logs' && (
          <XrfHistoryLogsTab
            instruments={instruments}
            standards={standards}
          />
        )}

        {activeTab === 'master-references' && (
          <XrfMasterReferenceTab
            standards={standards}
          />
        )}
      </div>
    </div>
  );
};

export default XrfCalibrationScreen;
