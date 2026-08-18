import React from 'react';
import { Card, Button } from '@/src/components/ui';
import { Wrench, Clock, CheckCircle2 } from 'lucide-react';

interface WorkOrderCardProps {
  wo: any;
  formatTanggal: (date: string) => string;
  getStatusColor: (status: string) => string;
  isCompleted: (status: string) => boolean;
  resolvingId: string | null;
  setResolvingId: (id: string | null) => void;
  resolveFormRenderer: (woId: string) => React.ReactNode;
}

export function WorkOrderCard({
  wo,
  formatTanggal,
  getStatusColor,
  isCompleted,
  resolvingId,
  setResolvingId,
  resolveFormRenderer
}: WorkOrderCardProps) {
  return (
    <Card key={wo.WO_ID} className={`p-4 md:p-5 flex flex-col md:flex-row gap-4 border-l-4 ${
      isCompleted(wo.Status) ? 'border-l-teal-500' : 'border-l-rose-500'
    } transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-2`}>
      <div className="flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="font-mono text-sm font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">{wo.WO_ID}</span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${getStatusColor(wo.Status)}`}>
            {wo.Status}
          </span>
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatTanggal(wo.Timestamp)}
          </span>
        </div>
        
        <div>
          <h3 className="font-bold text-slate-800 text-lg">{wo.Nama_Alat || '-'} <span className="text-slate-500 font-normal text-sm">({wo.Alat_ID})</span></h3>
          <p className="text-sm text-slate-600 mt-1 font-medium bg-slate-50 inline-block px-2.5 py-1 rounded-md border border-slate-100">
            📍 Lokasi: {wo.Lokasi_Ruangan || '-'}
          </p>
        </div>

        <div className="bg-rose-50 text-rose-900 p-3 rounded-lg border border-rose-100 text-sm">
          <span className="font-semibold block mb-1">Masalah Dilaporkan:</span>
          {wo.Deskripsi_Masalah || '-'}
        </div>

        {isCompleted(wo.Status) && (
          <div className="bg-teal-50 p-3 rounded-lg border border-teal-100 text-sm mt-3 animate-in fade-in">
            <span className="font-semibold text-teal-800 block mb-1 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4"/> Tindakan Penyelesaian:</span>
            <p className="text-teal-900 whitespace-pre-line">{wo.Hasil_Tindakan || '-'}</p>
            
            <div className="text-xs text-teal-700 mt-2 font-medium">
              Teknisi: {wo.Teknisi_PIC || '-'} 
              {wo.Selesai_Perbaikan && <span> • Selesai pada: {new Date(wo.Selesai_Perbaikan).toLocaleString('id-ID')}</span>}
            </div>
          </div>
        )}
      </div>

      {!isCompleted(wo.Status) && resolvingId !== wo.WO_ID && (
        <div className="flex items-end md:items-start shrink-0">
          <Button onClick={() => setResolvingId(wo.WO_ID)} className="bg-teal-600 hover:bg-teal-700 w-full md:w-auto text-white shadow-sm">
            <Wrench className="w-4 h-4 mr-2" />
            Tandai Selesai
          </Button>
        </div>
      )}

      {resolvingId === wo.WO_ID && resolveFormRenderer(wo.WO_ID)}
    </Card>
  );
}
