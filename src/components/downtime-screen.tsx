import { toast } from 'sonner';
import React, { useState, useEffect } from 'react';
import { Activity, Wrench, CheckCircle2 } from 'lucide-react';
import { Button, Card } from './ui';
import { getDowntimeRecords, updateDowntimeRepair, ToolRecord } from '../sheets-api';
import { DevModeAccordion, useDevOptions } from './dev-mode-accordion';

export function DowntimeScreen({ equipmentCategories, inspectorNik }: { equipmentCategories: {category: string, tools: ToolRecord[]}[], inspectorNik: string }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [hasShownDevMode, setHasShownDevMode] = useState(false);
  
  const { devOptions, setDevOptions, parsedDevOptions } = useDevOptions(inspectorNik);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const data = await getDowntimeRecords();
      setRecords(data.filter((r: any) => r.status !== 'Fixed')); // Only active downtime
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleEndDowntime = async (id: string) => {
    const confirm = window.confirm('Konfirmasi bahwa perbaikan telah selesai dan alat kembali beroperasi?');
    if (!confirm) return;

    try {
      setLoading(true);
      const repairTime = new Date().toISOString();
      let notes = window.prompt("Catatan perbaikan yang dilakukan?", "Perbaikan selesai");
      await updateDowntimeRepair(id, repairTime, notes || "", parsedDevOptions);
      toast('Status alat diperbarui menjadi Beroperasi.');
      fetchRecords();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-full md:px-8">
      <div className="px-1">
        <h2 className="text-2xl font-display font-semibold text-slate-800">Downtime</h2>
        <p className="text-sm text-slate-500 mt-1">Status Alat Breakdown</p>
      </div>

      <DevModeAccordion inspectorNik={inspectorNik} devOptions={devOptions} setDevOptions={setDevOptions} />

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center p-8"><Activity className="animate-spin text-teal-600" /></div>
        ) : records.length === 0 ? (
          <Card className="text-center p-10 border-transparent shadow-none bg-slate-100 flex flex-col items-center">
            <CheckCircle2 className="w-10 h-10 text-teal-500/50 mb-3" />
            <p className="text-slate-500 font-medium font-display">Semua Alat Beroperasi Normal</p>
            <p className="text-sm text-slate-400 mt-1">Tidak ada catatan breakdown saat ini.</p>
          </Card>
        ) : (
          records.map((record: any, rIdx: number) => (
            <Card key={`${record.id}-${rIdx}`} className="border-l-4 border-l-rose-400 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Wrench className="w-16 h-16" />
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-slate-800 text-lg">{record.toolName}</h4>
                    <p className="text-xs text-slate-500 mt-1">Mulai: {new Date(record.breakdownTime).toLocaleString('id-ID')}</p>
                    <p className="text-sm text-slate-600 mt-3 bg-rose-50/50 p-3 rounded-xl border border-rose-100 inline-block">Issue: {record.notes}</p>
                  </div>
                </div>
                <div className="mt-5">
                  <Button variant="primary" className="!w-auto text-sm px-6" onClick={() => handleEndDowntime(record.id)}>
                     Selesai Perbaikan
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
