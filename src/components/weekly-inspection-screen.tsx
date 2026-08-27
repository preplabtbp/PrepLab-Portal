import { toast } from 'sonner';
import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select } from './ui';
import { ClipboardCheck, Server, AlertTriangle, Eye, Wrench, ChevronLeft, Loader2 } from 'lucide-react';
import { getMasterPertanyaan, submitInspeksiUniversal, submitInspeksi } from '../sheets-api';
import { FormUmum } from './inspection-forms/FormUmum';
import { FormP3K } from './inspection-forms/FormP3K';
import { FormPerkakas } from './inspection-forms/FormPerkakas';
import { FormTabung } from './inspection-forms/FormTabung';
import { FormSarana } from './inspection-forms/FormSarana';
import { FormTangga } from './inspection-forms/FormTangga';
import { FormAPD } from './inspection-forms/FormAPD';
import { DevModeAccordion, useDevOptions } from './dev-mode-accordion';
import { PageHeader } from './PageHeader';

export function WeeklyInspectionScreen({ inspectorName, inspectorNik, inspectorJabatan, onInspectionComplete }: { inspectorName: string, inspectorNik: string, inspectorJabatan?: string, onInspectionComplete?: (message: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [masterForms, setMasterForms] = useState<any[]>([]);
  const [selectedForm, setSelectedForm] = useState<string>('');
  
  const { devOptions, setDevOptions, parsedDevOptions } = useDevOptions(inspectorNik);

  // Just for demonstrating that it's connecting to API and grouped form 
  const [uniqueForms, setUniqueForms] = useState<{id: string, judul: string, tipe: string}[]>([]);

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    setLoading(true);
    try {
      const data = await getMasterPertanyaan();
      
      const listUniqueForm: {id: string, judul: string, tipe: string}[] = [];
      const mapForm = new Map();
      
      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          if (!mapForm.has(item.id_form || item.idForm)) {
            const formId = item.id_form || item.idForm;
            mapForm.set(formId, true);
            let jdl = item.judul_form || item.judulForm || "";
            let tipe = (item.tipe_input || item.tipeInput || "").toString().trim().toUpperCase();
            
            // Clean up title
            let lowerJdl = jdl.toLowerCase();
            let keywords = ["inspeksi", "checklist", "formulir"];
            let cutIdx = -1;
            for (let i = 0; i < keywords.length; i++) {
              let idx = lowerJdl.indexOf(keywords[i]);
              if (idx !== -1) {
                cutIdx = idx;
                break;
              }
            }
            if (cutIdx !== -1) jdl = jdl.substring(cutIdx);
            jdl = jdl.charAt(0).toUpperCase() + jdl.slice(1).trim();
            
            listUniqueForm.push({ id: formId, judul: jdl, tipe: tipe });
          }
        });
      }
      setMasterForms(Array.isArray(data) ? data : []);
      setUniqueForms(listUniqueForm);
    } catch (err) {
      console.error(err);
      // Fallback for demonstration if API fails or needs to be updated by user
    } finally {
      setLoading(false);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitUniversal = async (payload: any) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const isUmum = tipeFormActive === 'UMUM';
    const isTabung = tipeFormActive === 'TABUNG_MINGGUAN' || tipeFormActive === 'TABUNG';

    const finalData = {
      idForm: selectedForm,
      judulForm: uniqueForms.find(f => f.id === selectedForm)?.judul || '',
      tipe: tipeFormActive,
      wkt: '-',
      insp1: inspectorName + ' | ' + (inspectorJabatan || inspectorNik),
      insp2: payload.signatures?.insp2Name ? `${payload.signatures.insp2Name} | ${payload.signatures.insp2Jabatan || payload.signatures.insp2Nik}` : '',
      insp3: payload.signatures?.insp3Name ? `${payload.signatures.insp3Name} | ${payload.signatures.insp3Jabatan || payload.signatures.insp3Nik}` : '',
      catatanUmum: payload.catatanUmum || '-',
      temuanUmum: payload.temuanUmum || [],
      lokasiUmum: payload.lokasiUmum || '-',
      payload: payload.payload,
      tabungMeta: payload.tabungMeta || {},
      devOptions: parsedDevOptions
    };

    const promise = submitInspeksiUniversal(
      finalData,
      payload.signatures?.ttd1 || '',
      payload.signatures?.ttd2 || '',
      payload.signatures?.ttd3 || '',
      payload.fotoTemuanArray || [], // photos of findings
      payload.fotoProses
    );

    promise.then((data) => {
      setIsSubmitting(false);
      setSelectedForm('');

      // Auto-post PDF report to Safety Group Feed (with multi-inspector NIKs support)
      const allNiks = [
        inspectorNik,
        inspectorName,
        payload.signatures?.insp2Nik,
        payload.signatures?.insp2Name,
        payload.signatures?.insp3Nik,
        payload.signatures?.insp3Name,
        payload.signatures?.nik1,
        payload.signatures?.nik2,
        payload.signatures?.nik3
      ].filter(Boolean);

      fetch('/api/group-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderNik: inspectorNik,
          senderName: inspectorName,
          senderRole: inspectorJabatan || 'Inspector',
          inspectorNiks: allNiks,
          text: `Formulir Inspeksi ${finalData.judulForm || ''} (${finalData.lokasiUmum || '-'}) telah selesai dilaksanakan.`,
          type: 'pdf_report',
          pdfTitle: finalData.judulForm || 'LAPORAN INSPEKSI TERPADU',
          pdfSubTitle: `Lokasi: ${finalData.lokasiUmum || '-'}`,
          pdfUrl: data?.pdfUrl || '#',
          pdfFileName: `Laporan_Inspeksi_${finalData.idForm || 'PrepLab'}.pdf`,
          photos: payload.fotoTemuanArray || []
        })
      }).catch(err => console.error('Failed auto posting to group', err));

      if (data?.waMessageText) {
        // Lift to App-level modal so navigating away doesn't lose it
        onInspectionComplete?.(data.waMessageText);
      }
    }).catch(() => {
      setIsSubmitting(false);
    });

    toast.promise(promise, {
      loading: 'Mengirim laporan inspeksi ke server...',
      success: (data) => {
        let pdfUrl = data?.pdfUrl;
        if (pdfUrl && pdfUrl !== 'GAS_GENERATED' && pdfUrl !== '-') {
          const fileIdMatch = pdfUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || pdfUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
          const previewUrl = fileIdMatch && fileIdMatch[1] 
            ? `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`
            : (pdfUrl.startsWith('http') ? `https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true` : pdfUrl);

          return (
            <div className="flex flex-col gap-1 text-xs font-semibold">
              <p>Laporan berhasil dikirim ke server!</p>
              <a 
                href={previewUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 mt-0.5"
              >
                <Eye className="w-3.5 h-3.5" /> Buka Viewer PDF
              </a>
            </div>
          );
        }
        return 'Laporan inspeksi berhasil tersimpan!';
      },
      error: (err) => `Gagal menyimpan: ${err.message || err}`
    });
  };

  const handleSubmitAPD = async (payload: any) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    // payload: { payload: currentRows[], waktuKerja, fotoProses }
    let formDivName = 'Laboratory';
    let formGrpName = 'A';
    if (selectedForm === "17") { formDivName = "Laboratory"; formGrpName = "A"; }
    else if (selectedForm === "18") { formDivName = "Laboratory"; formGrpName = "B"; }
    else if (selectedForm === "19") { formDivName = "Preparation"; formGrpName = "A"; }
    else if (selectedForm === "20") { formDivName = "Preparation"; formGrpName = "B"; }
    else if (selectedForm === "21") { formDivName = "Maintenance"; formGrpName = "Nonshift"; }

    const bgn = formDivName === "Maintenance" ? "Maintenance" : `${formDivName} (Shift ${formGrpName})`;
    
    const now = new Date();
    const jamWIT = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} WIT`;
    const today = now.toLocaleDateString('id-ID'); // MM/DD/YYYY typically, but GAS uses JS formats

    const dataF: any[][] = [];
    let num = 1;
    payload.payload.forEach((r: any) => {
         const isHadir = (r.kehadiran === "Hadir");
         const ser = isHadir ? (r.apd[0] ? "❌" : "✔") : "-"; 
         const hlm = isHadir ? (r.apd[1] ? "❌" : "✔") : "-"; 
         const spt = isHadir ? (r.apd[2] ? "❌" : "✔") : "-"; 
         const msk = isHadir ? (r.apd[3] ? "❌" : "✔") : "-"; 
         const ear = isHadir ? (r.apd[4] ? "❌" : "✔") : "-"; 
         const kcm = isHadir ? (r.apd[5] ? "❌" : "✔") : "-";

         dataF.push([
           jamWIT, today, bgn, payload.waktuKerja, bgn, num, r.nama, r.jabatan, r.kehadiran,
           ser, hlm, spt, msk, ear, kcm, r.ket || "-", 
           inspectorName, inspectorJabatan || inspectorNik, 
           payload.signatures?.insp2Name || "-", 
           payload.signatures?.insp2Jabatan || payload.signatures?.insp2Nik || "-", 
           payload.signatures?.insp3Name || "-", 
           payload.signatures?.insp3Jabatan || payload.signatures?.insp3Nik || "-"
         ]);
         num++;
      });

      const promise = submitInspeksi(
        dataF,
        payload.signatures?.ttd1 || '',
        payload.signatures?.ttd2 || '',
        payload.signatures?.ttd3 || '',
        payload.fotoProses,
        parsedDevOptions
      );

      promise.then((data) => {
        setIsSubmitting(false);
        setSelectedForm('');
        if (data?.waMessageText) {
            onInspectionComplete?.(data.waMessageText);
        }
      }).catch(() => {
        setIsSubmitting(false);
      });

      toast.promise(promise, {
        loading: 'Mengirim laporan APD ke server...',
        success: (data) => {
        if (data?.pdfUrl && data.pdfUrl !== 'GAS_GENERATED' && data.pdfUrl !== '-') {
          return (
            <div className="flex flex-col gap-2">
              <p className="font-semibold">Laporan berhasil dikirim ke server!</p>
              <a href={data.pdfUrl} target="_blank" rel="noreferrer" className="text-blue-500 underline text-sm font-medium hover:text-blue-600">
                Download Report PDF
              </a>
            </div>
          );
        }
        return 'Laporan berhasil dikirim ke server!';
      },
        error: (err) => 'Terjadi kesalahan saat mengirim: ' + err.message
      });
  };

  const [jsaClickCount, setJsaClickCount] = useState(0);
  const [autoFillTrigger, setAutoFillTrigger] = useState(0);

  const handleJsaClick = () => {
    const nextCount = jsaClickCount + 1;
    setJsaClickCount(nextCount);
    if (nextCount >= 6) {
      setJsaClickCount(0);
      setAutoFillTrigger(Date.now());
      toast.success('⚡ Cheat Developer Aktif! Semua item inspeksi berhasil otomatis diisi [ YA / BAIK ]', {
        icon: '🚀',
        duration: 4000
      });
    } else if (nextCount >= 3) {
      toast.info(`Cheat Mode: ${6 - nextCount} klik lagi pada "JSA"...`, { duration: 1000 });
    }
  };

  const tipeFormActive = uniqueForms.find(f => f.id === selectedForm)?.tipe;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 w-full max-w-3xl mx-auto px-4 sm:px-0">
      <PageHeader 
        title={
          <span>
            Inspeksi Terpadu{' '}
            <span 
              onClick={handleJsaClick} 
              className="cursor-pointer select-none border-b-2 border-dotted border-white/40 hover:border-emerald-400 hover:text-emerald-300 transition-colors"
              title="Klik 6x untuk Developer Cheat (Otomatis Pilih Ya All)"
            >
              JSA
            </span>
          </span>
        }
        description="Formulir dinamis terintegrasi Preparation & Laboratory"
        icon={<ClipboardCheck />}
      />

      <DevModeAccordion inspectorNik={inspectorNik} devOptions={devOptions} setDevOptions={setDevOptions} />

      <Card className="border-t-4 border-t-[var(--primary)] bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-main)]">
        <h3 className="text-sm font-bold text-[var(--text-main)] mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-[var(--primary)]" />
            Pilih Jenis Inspeksi
          </span>
          <span 
            onClick={handleJsaClick}
            className="text-[10px] text-[var(--text-muted)] cursor-pointer select-none font-bold px-2 py-0.5 rounded-full bg-[var(--input-bg)] hover:bg-[var(--primary)] hover:text-white transition-colors"
            title="Klik 6x untuk Developer Cheat (Auto Fill YA)"
          >
            JSA
          </span>
        </h3>
        {loading ? (
          <div className="text-center py-6 text-[var(--text-muted)] text-sm flex items-center justify-center gap-2">
             <div className="w-4 h-4 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin"></div>
             Memuat Form dari Server...
          </div>
        ) : (
          <Select value={selectedForm} onChange={(e) => setSelectedForm(e.target.value)} className="font-bold text-[var(--text-main)] shadow-sm border-[var(--border-main)] bg-[var(--input-bg)]">
            <option value="">-- Sedang Memuat Form / Pilih --</option>
            
            <optgroup label="[ AREA ]">
              {uniqueForms.filter(f => f.tipe === "UMUM").map(f => (
                <option key={f.id} value={f.id}>{f.judul}</option>
              ))}
            </optgroup>
            
            <optgroup label="[ KOTAK P3K ]">
              {uniqueForms.filter(f => f.tipe === "P3K").map(f => (
                <option key={f.id} value={f.id}>{f.judul}</option>
              ))}
            </optgroup>
            
            <optgroup label="[ ASSET & LAINNYA ]">
              {uniqueForms.filter(f => !["UMUM", "P3K", "APD"].includes(f.tipe)).map(f => (
                <option key={f.id} value={f.id}>{f.judul}</option>
              ))}
            </optgroup>

            <optgroup label="[ ALAT PELINDUNG DIRI ]">
               <option value="17">Inspeksi APD - Shift A Lab</option>
               <option value="18">Inspeksi APD - Shift B Lab</option>
               <option value="19">Inspeksi APD - Shift A Prep</option>
               <option value="20">Inspeksi APD - Shift B Prep</option>
               <option value="21">Inspeksi APD - Maintenance</option>
            </optgroup>
          </Select>
        )}
      </Card>

      

      {selectedForm && tipeFormActive === "UMUM" && (
        <FormUmum 
          data={masterForms?.filter(f => (f.id_form || f.idForm) === selectedForm) || []} 
          inspectorName={inspectorName}
          inspectorNik={inspectorNik}
          onSubmit={handleSubmitUniversal} 
          autoFillAllYa={autoFillTrigger}
        />
      )}

      {selectedForm && tipeFormActive === "P3K" && (
        <FormP3K
          data={masterForms?.filter(f => (f.id_form || f.idForm) === selectedForm) || []}
          inspectorName={inspectorName}
          inspectorNik={inspectorNik}
          onSubmit={handleSubmitUniversal}
          autoFillAllYa={autoFillTrigger}
        />
      )}

      {selectedForm && tipeFormActive === "PERKAKAS" && (
        <FormPerkakas
          data={masterForms?.filter(f => (f.id_form || f.idForm) === selectedForm) || []}
          inspectorName={inspectorName}
          inspectorNik={inspectorNik}
          onSubmit={handleSubmitUniversal}
          autoFillAllYa={autoFillTrigger}
        />
      )}

      {selectedForm && (tipeFormActive === "TABUNG_MINGGUAN" || tipeFormActive === "TABUNG") && (
        <FormTabung
          data={masterForms?.filter(f => (f.id_form || f.idForm) === selectedForm) || []}
          inspectorName={inspectorName}
          inspectorNik={inspectorNik}
          onSubmit={handleSubmitUniversal}
          autoFillAllYa={autoFillTrigger}
        />
      )}

      {selectedForm && tipeFormActive === "SARANA" && (
        <FormSarana
          inspectorName={inspectorName}
          inspectorNik={inspectorNik}
          onSubmit={handleSubmitUniversal}
          autoFillAllYa={autoFillTrigger}
        />
      )}

      {selectedForm && tipeFormActive === "TANGGA" && (
        <FormTangga
          data={masterForms?.filter(f => (f.id_form || f.idForm) === selectedForm) || []}
          inspectorName={inspectorName}
          inspectorNik={inspectorNik}
          onSubmit={handleSubmitUniversal}
          autoFillAllYa={autoFillTrigger}
        />
      )}

      {selectedForm && (!tipeFormActive || tipeFormActive === "APD") && (
        <FormAPD
          formId={selectedForm}
          inspectorName={inspectorName}
          inspectorNik={inspectorNik}
          onSubmit={handleSubmitAPD}
          autoFillAllYa={autoFillTrigger}
        />
      )}

      {/* WhatsApp modal is handled globally in App.tsx */}
    </div>
  );
}
