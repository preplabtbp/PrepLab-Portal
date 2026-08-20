import { toast } from 'sonner';
import React, { useState } from 'react';
import { Card, Button, Input, Select } from './ui';
import { getRekapanPemantauan, buatPdfRekapan } from '../sheets-api';
import { Loader2, FileDown, CalendarRange, ThermometerSun, Wind } from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export function MonitoringDashboard({ inspectorNik }: { inspectorNik?: string }) {
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [dataSuhu, setDataSuhu] = useState<Record<string, any>>({});
  const [dataGas, setDataGas] = useState<Record<string, any>>({});
  const [pdfLinks, setPdfLinks] = useState<any[]>([]);

  // Default dates
  const td = new Date();
  const defEnd = td.toISOString().split('T')[0];
  const tm = new Date();
  tm.setDate(td.getDate() - 30);
  const defStart = tm.toISOString().split('T')[0];

  const [tglMulai, setTglMulai] = useState(defStart);
  const [tglAkhir, setTglAkhir] = useState(defEnd);

  const handleFilter = async () => {
    setLoading(true);
    setPdfLinks([]);
    try {
      const resp = await getRekapanPemantauan(tglMulai, tglAkhir);
      const parsedSuhu: any = {};
      const parsedGas: any = {};

      const parseVal = (v: any) => (v === '-' || !v) ? null : parseFloat(v);
      resp.forEach((row: any) => {
        let tglValue = row.tanggal || row.date || row.timestamp;
        
        // Handle Excel date format (e.g. "45432" or 45432)
        if (typeof tglValue === 'string' && /^\d{5}$/.test(tglValue)) {
            tglValue = new Date(Math.round((parseInt(tglValue) - 25569) * 86400 * 1000));
        } else if (typeof tglValue === 'number' && tglValue > 40000 && tglValue < 50000) {
            tglValue = new Date(Math.round((tglValue - 25569) * 86400 * 1000));
        }

        const dObjDate = new Date(tglValue);
        const tMulai = new Date(tglMulai);
        const tAkhir = new Date(tglAkhir);
        tAkhir.setHours(23,59,59,999);
        if (dObjDate < tMulai || dObjDate > tAkhir) return;
        const dObj = new Date(tglValue);
        const tglStr = dObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        const lok = row.lokasiArea || row.lokasi;

        if (row.kategori === 'SUHU') {
          if (!parsedSuhu[lok]) parsedSuhu[lok] = { labels: [], suhu: [], kelembapan: [], sUp: [], sLow: [], kUp: [], kLow: [] };
          parsedSuhu[lok].labels.push(tglStr);
          parsedSuhu[lok].suhu.push(parseVal(row.suhuCelcius || row.suhu));
          parsedSuhu[lok].kelembapan.push(parseVal(row.kelembapanPersen || row.kelembapan));
          parsedSuhu[lok].sUp.push(parseVal(row.suhuUpper));
          parsedSuhu[lok].sLow.push(parseVal(row.suhuLower));
          parsedSuhu[lok].kUp.push(parseVal(row.kelembapanUpper));
          parsedSuhu[lok].kLow.push(parseVal(row.kelembapanLower));
        } else if (row.kategori === 'GAS') {
          if (!parsedGas[lok]) parsedGas[lok] = { labels: [], flow: [], pressure: [] };
          parsedGas[lok].labels.push(tglStr);
          parsedGas[lok].flow.push(parseVal(row.flowGas || row.flow));
          parsedGas[lok].pressure.push(parseVal(row.tekananGasPsi || row.tekananGas));
        }
      });

      setDataSuhu(parsedSuhu);
      setDataGas(parsedGas);
    } catch (e) {
      console.error(e);
      toast.error('Gagal memuat rekap pemantauan');
    }
    setLoading(false);
  };

  const generatePDF = async (tipe: string) => {
    setGeneratingPdf(true);
    try {
      const res = await buatPdfRekapan(tglMulai, tglAkhir, tipe);
      if (res.status === 'error') {
        toast(res.message);
      } else {
        setPdfLinks(res.links);
        toast.success(`PDF ${tipe} berhasil dibuat! Silakan cek daftar link.`);
      }
    } catch (e) {
      console.error(e);
      toast.error('Gagal membuat PDF');
    }
    setGeneratingPdf(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 pb-20">
      <div className="px-1 flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-800 leading-tight">Dashboard Monitoring</h2>
          <p className="text-xs text-slate-500">Rekap Suhu, Kelembapan & Gas</p>
        </div>
      </div>

      <Card className="border-t-4 border-t-cyan-500 space-y-4">
        <h4 className="font-semibold text-slate-700 flex items-center gap-2 mb-2"><CalendarRange className="w-4 h-4 text-cyan-500" /> Filter Waktu</h4>
        <div className="flex gap-2">
          <div className="flex-1"><Input type="date" label="Mulai" value={tglMulai} onChange={e => setTglMulai(e.target.value)} /></div>
          <div className="flex-1"><Input type="date" label="Akhir" value={tglAkhir} onChange={e => setTglAkhir(e.target.value)} /></div>
        </div>
        <Button onClick={handleFilter} disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-700 font-semibold focus:ring-cyan-500">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Terapkan Filter
        </Button>

        {Object.keys(dataSuhu).length > 0 || Object.keys(dataGas).length > 0 ? (
          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
            <Button onClick={() => generatePDF('SUHU')} variant="secondary" disabled={generatingPdf} className="border-rose-200 text-rose-600 hover:bg-rose-50">
              {generatingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <FileDown className="w-3.5 h-3.5 mr-1" />} PDF Suhu
            </Button>
            <Button onClick={() => generatePDF('GAS')} variant="secondary" disabled={generatingPdf} className="border-rose-200 text-rose-600 hover:bg-rose-50">
              {generatingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <FileDown className="w-3.5 h-3.5 mr-1" />} PDF Gas
            </Button>
          </div>
        ) : null}
      </Card>

      {pdfLinks.length > 0 && (
        <Card className="border-l-4 border-l-rose-500 bg-rose-50/50">
           <h4 className="font-bold text-rose-700 mb-3 text-sm">Hasil Generate PDF</h4>
           <div className="space-y-2">
             {pdfLinks.map((link, idx) => (
               <button key={idx} type="button" onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")} className="flex items-center p-2 bg-white rounded border border-rose-100 hover:border-rose-300 hover:shadow-sm transition-all text-sm font-medium text-slate-700">
                  <FileDown className="w-4 h-4 text-rose-500 mx-2" />
                  {link.nama}
               </button>
             ))}
           </div>
        </Card>
      )}

      <div className="space-y-6">
        {loading ? (
          <div className="flex flex-col items-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mb-2" />
            <p className="text-sm font-medium text-slate-500">Memuat Data Grafik...</p>
          </div>
        ) : (
          <>
            {/* Render SUHU */}
            {Object.keys(dataSuhu).map(lok => {
              const d = dataSuhu[lok];
              const suhuData = {
                labels: d.labels,
                datasets: [
                  { label: "Suhu (°C)", data: d.suhu, borderColor: "orange", backgroundColor: "orange", tension: 0.3 },
                  { label: "Limit Atas", data: d.sUp, borderColor: "rgba(255,99,132,0.8)", borderDash: [5,5], pointRadius: 0 },
                  { label: "Limit Bawah", data: d.sLow, borderColor: "rgba(54,162,235,0.8)", borderDash: [5,5], pointRadius: 0 },
                ]
              };
              const kelData = {
                labels: d.labels,
                datasets: [
                  { label: "Kelembapan (%)", data: d.kelembapan, borderColor: "#1F497D", backgroundColor: "#1F497D", tension: 0.3 },
                  { label: "Limit Atas", data: d.kUp, borderColor: "rgba(255,99,132,0.8)", borderDash: [5,5], pointRadius: 0 },
                  { label: "Limit Bawah", data: d.kLow, borderColor: "rgba(54,162,235,0.8)", borderDash: [5,5], pointRadius: 0 },
                ]
              };

              return (
                <Card key={lok} className="border-l-4 border-l-blue-500 shadow-sm p-4">
                  <h4 className="font-bold text-blue-700 mb-4 flex items-center gap-2"><ThermometerSun className="w-4 h-4" /> {lok}</h4>
                  <div className="space-y-6">
                    <div className="h-64"><Line data={suhuData as any} options={{ responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Tren Suhu' } }, scales: { y: { beginAtZero: true } } }} /></div>
                    <div className="h-64"><Line data={kelData as any} options={{ responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Tren Kelembapan' } }, scales: { y: { beginAtZero: true } } }} /></div>
                  </div>
                </Card>
              );
            })}

            {/* Render GAS */}
            {Object.keys(dataGas).map(lok => {
              const d = dataGas[lok];
              const flowData = {
                labels: d.labels,
                datasets: [{ label: "Flow (L/min)", data: d.flow, borderColor: "#ffc107", backgroundColor: "#ffc107", tension: 0.3 }]
              };
              const presData = {
                labels: d.labels,
                datasets: [{ label: "Pressure (psi)", data: d.pressure, borderColor: "#198754", backgroundColor: "#198754", tension: 0.3 }]
              };

              return (
                <Card key={lok} className="border-l-4 border-l-emerald-500 shadow-sm p-4">
                  <h4 className="font-bold text-emerald-700 mb-4 flex items-center gap-2"><Wind className="w-4 h-4" /> {lok}</h4>
                  <div className="space-y-6">
                    <div className="h-64"><Line data={flowData as any} options={{ responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Tren Flow' } }, scales: { y: { beginAtZero: true } } }} /></div>
                    <div className="h-64"><Line data={presData as any} options={{ responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Tren Pressure' } }, scales: { y: { beginAtZero: true } } }} /></div>
                  </div>
                </Card>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
