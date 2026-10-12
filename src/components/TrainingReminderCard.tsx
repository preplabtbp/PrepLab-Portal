import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ShieldAlert, GraduationCap } from 'lucide-react';
import type { TrainingAlert } from '../utils/training-import';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const fmt = (d: string) => `${d.slice(8, 10)} ${MONTHS_SHORT[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;

// Kartu pengingat di Home: tampil selama karyawan masih punya training WARNING / EXPIRED
// (hilang otomatis setelah tanggal training diperbarui di Database Training)
export function TrainingReminderCard({ inspectorNik }: { inspectorNik: string }) {
  const { data: alerts = [] } = useQuery({
    queryKey: ['training-reminder', inspectorNik],
    queryFn: async (): Promise<TrainingAlert[]> => {
      const res = await fetch('/api/training-records/me');
      if (!res.ok) return [];
      const json = await res.json();
      return json?.data?.alerts || [];
    },
    enabled: !!inspectorNik,
    staleTime: 10 * 60 * 1000,
  });

  if (alerts.length === 0) return null;
  const expired = alerts.filter(a => a.state === 'expired');
  const hasExpired = expired.length > 0;

  return (
    <div
      className={`rounded-3xl p-4 sm:p-5 border-2 shadow-sm ${hasExpired ? 'border-red-300 bg-red-50/80 dark:bg-red-950/30' : 'border-yellow-300 bg-yellow-50/80 dark:bg-yellow-950/30'}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${hasExpired ? 'bg-red-600 text-white' : 'bg-yellow-400 text-yellow-950'}`}>
          {hasExpired ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={`text-sm font-black leading-tight ${hasExpired ? 'text-red-900 dark:text-red-200' : 'text-yellow-900 dark:text-yellow-200'}`}>
            {hasExpired ? 'Training Anda Sudah Expired' : 'Training Anda Akan Expired'}
          </h3>
          <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
            Segera ikuti training ulang. Hubungi Admin / Safety untuk jadwal.
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-1.5">
        {alerts.map(a => (
          <li
            key={`${a.program}-${a.key}`}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700"
          >
            <div className="flex items-center gap-2 min-w-0">
              <GraduationCap className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">{a.desc}</p>
                <p className="text-[10px] font-semibold text-slate-500">
                  Training {fmt(a.date)} · {a.state === 'expired' ? 'expired sejak' : 'berlaku s/d'} {fmt(a.expiryDate)}
                </p>
              </div>
            </div>
            <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-black border ${a.state === 'expired' ? 'bg-red-600 text-white border-red-700' : 'bg-yellow-100 text-yellow-800 border-yellow-300'}`}>
              {a.state === 'expired' ? 'EXPIRED' : 'WARNING'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TrainingReminderCard;
