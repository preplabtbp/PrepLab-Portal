import React, { useState } from 'react';
import { Activity, Wrench, CheckCircle2 } from 'lucide-react';
import { Button, Card } from '../components/ui';
import { PageHeader } from '../components/PageHeader';
import { DevModeAccordion, useDevOptions } from '../components/dev-mode-accordion';
import { useDowntime } from '../hooks/useDowntime';

export function DowntimePage({ equipmentCategories, inspectorNik }: { equipmentCategories: any[], inspectorNik: string }) {
  const { devOptions, setDevOptions } = useDevOptions(inspectorNik);
  const { records, isLoading, isRepairing, handleEndDowntime } = useDowntime();

  const loading = isLoading || isRepairing;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 md:max-w-2xl md:mx-auto">
      <PageHeader 
        title="Downtime Alat"
        description="Pantau dan selesaikan status alat breakdown"
        icon={<Activity />}
      />

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
