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
import { WhatsAppModal } from './whatsapp-modal';
import { PageHeader } from './PageHeader';

export function WeeklyInspectionScreen({ inspectorName, inspectorNik, inspectorJabatan }: { inspectorName: string, inspectorNik: string, inspectorJabatan?: string }) {
  const [loading, setLoading] = useState(true);
  const [masterForms, setMasterForms] = useState<any[]>([]);
  const [selectedForm, setSelectedForm] = useState<string>('');
  const [waMessageToModal, setWaMessageToModal] = useState('');
  
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
      if (data?.waMessageText) {
          setWaMessageToModal(data.waMessageText);
      }
    }).catch(() => {
      setIsSubmitting(false);
    });

    toast.promise(promise, {
      loading: 'Mengirim laporan inspeksi ke server...',
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
            setWaMessageToModal(data.waMessageText);
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

  const tipeFormActive = uniqueForms.find(f => f.id === selectedForm)?.tipe;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 w-full">
      <PageHeader 
        title="Inspeksi Terpadu JSA"
        description="Formulir dinamis terintegrasi Preparation & Laboratory"
        icon={<ClipboardCheck />}
      />

      <DevModeAccordion inspectorNik={inspectorNik} devOptions={devOptions} setDevOptions={setDevOptions} />

      <Card className="border-t-4 border-t-primary">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-primary" />
          Pilih Jenis Inspeksi
        </h3>
        {loading ? (
          <div className="text-center py-6 text-slate-500 text-sm flex items-center justify-center gap-2">
             <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
             Memuat Form dari Server...
          </div>
        ) : (
          <Select value={selectedForm} onChange={(e) => setSelectedForm(e.target.value)} className="font-semibold text-primary shadow-sm border-primary/20">
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
        />
      )}

      {selectedForm && tipeFormActive === "P3K" && (
        <FormP3K
          data={masterForms?.filter(f => (f.id_form || f.idForm) === selectedForm) || []}
          inspectorName={inspectorName}
          inspectorNik={inspectorNik}
          onSubmit={handleSubmitUniversal}
        />
      )}

      {selectedForm && tipeFormActive === "PERKAKAS" && (
        <FormPerkakas
          data={masterForms?.filter(f => (f.id_form || f.idForm) === selectedForm) || []}
          inspectorName={inspectorName}
          inspectorNik={inspectorNik}
          onSubmit={handleSubmitUniversal}
        />
      )}

      {selectedForm && (tipeFormActive === "TABUNG_MINGGUAN" || tipeFormActive === "TABUNG") && (
        <FormTabung
          data={masterForms?.filter(f => (f.id_form || f.idForm) === selectedForm) || []}
          inspectorName={inspectorName}
          inspectorNik={inspectorNik}
          onSubmit={handleSubmitUniversal}
        />
      )}

      {selectedForm && tipeFormActive === "SARANA" && (
        <FormSarana
          inspectorName={inspectorName}
          inspectorNik={inspectorNik}
          onSubmit={handleSubmitUniversal}
        />
      )}

      {selectedForm && tipeFormActive === "TANGGA" && (
        <FormTangga
          data={masterForms?.filter(f => (f.id_form || f.idForm) === selectedForm) || []}
          inspectorName={inspectorName}
          inspectorNik={inspectorNik}
          onSubmit={handleSubmitUniversal}
        />
      )}

      {selectedForm && (!tipeFormActive || tipeFormActive === "APD") && (
        <FormAPD
          formId={selectedForm}
          inspectorName={inspectorName}
          inspectorNik={inspectorNik}
          onSubmit={handleSubmitAPD}
        />
      )}

      {/* Modals */}
      <WhatsAppModal
        isOpen={!!waMessageToModal}
        onClose={() => setWaMessageToModal('')}
        messageText={waMessageToModal}
        title="Laporan Inspeksi Berhasil"
        description="Kirim laporan ke supervisor via WhatsApp."
      />
    </div>
  );
}
