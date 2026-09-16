import { toast } from 'sonner';
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input, Select } from './ui';
import { ClipboardCheck, Server, AlertTriangle, Eye, Wrench, ChevronLeft, Loader2, Users, CheckCircle2, MapPin } from 'lucide-react';
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
import fallbackQuestions from '../data/master-questions.json';
import { InspectionCompletionData } from './InspectionCompletionModal';

export function WeeklyInspectionScreen({ 
  inspectorName, 
  inspectorNik, 
  inspectorJabatan, 
  onInspectionComplete 
}: { 
  inspectorName: string, 
  inspectorNik: string, 
  inspectorJabatan?: string, 
  onInspectionComplete?: (result: InspectionCompletionData | string) => void 
}) {
  const [loading, setLoading] = useState(true);
  const [masterForms, setMasterForms] = useState<any[]>(fallbackQuestions);
  const [selectedForm, setSelectedForm] = useState<string>('');
  
  const { devOptions, setDevOptions, parsedDevOptions } = useDevOptions(inspectorNik);

  // Extract unique forms from questions data
  const extractUniqueForms = (data: any[]) => {
    const listUniqueForm: {id: string, judul: string, tipe: string}[] = [];
    const mapForm = new Map();
    
    if (Array.isArray(data)) {
      data.forEach((item: any) => {
        const formId = item.id_form || item.idForm;
        if (formId && !mapForm.has(formId)) {
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
    return listUniqueForm;
  };

  const [uniqueForms, setUniqueForms] = useState<{id: string, judul: string, tipe: string}[]>(() => extractUniqueForms(fallbackQuestions));
  const [userScheduledTask, setUserScheduledTask] = useState<any | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [showManualFormSelector, setShowManualFormSelector] = useState(false);

  const refreshSchedule = () => {
    if (inspectorName || inspectorNik) {
      const q = new URLSearchParams();
      if (inspectorName) q.append('name', inspectorName);
      if (inspectorNik) q.append('nik', inspectorNik);
      fetch(`/api/inspection-schedule?${q.toString()}&refresh=true`)
        .then(r => r.json())
        .then(d => {
          if (d.found && d.schedule) {
            setUserScheduledTask(d.schedule);
          }
        })
        .catch(console.error);
    }
  };

  useEffect(() => {
    fetchMasterData();

    // 1. Check URL query parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const urlFormId = urlParams.get('formId');
    const urlSubArea = urlParams.get('subArea');
    if (urlSubArea) {
      sessionStorage.setItem('preselected_sub_area', urlSubArea);
    }
    if (urlFormId) {
      setSelectedForm(urlFormId);
    }

    // 2. Check preselected form from sessionStorage
    const preForm = sessionStorage.getItem('preselected_form_id');
    if (preForm && !urlFormId) {
      setSelectedForm(preForm);
      sessionStorage.removeItem('preselected_form_id');
    }

    // 3. Live sync personal schedule from Google Sheet (otomatis kunci form terjadwal)
    if (inspectorName || inspectorNik) {
      setLoadingSchedule(true);
      const q = new URLSearchParams();
      if (inspectorName) q.append('name', inspectorName);
      if (inspectorNik) q.append('nik', inspectorNik);
      fetch(`/api/inspection-schedule?${q.toString()}`)
        .then(r => r.json())
        .then(d => {
          setLoadingSchedule(false);
          if (d.found && d.schedule && !d.schedule.isCuti) {
            setUserScheduledTask(d.schedule);
            if (d.schedule.formInfo?.subArea) {
              sessionStorage.setItem('preselected_sub_area', d.schedule.formInfo.subArea);
            }
            // Otomatis tentukan formulir inspeksi sesuai jadwal (personil tidak perlu memilih form manual)
            if (!urlFormId && d.schedule.formInfo?.formId) {
              setSelectedForm(d.schedule.formInfo.formId);
            }
          }
        })
        .catch(err => {
          console.error(err);
          setLoadingSchedule(false);
        });
    } else {
      setLoadingSchedule(false);
    }
  }, [inspectorName, inspectorNik]);

  const fetchMasterData = async () => {
    try {
      const data = await getMasterPertanyaan();
      if (Array.isArray(data) && data.length > 0) {
        setMasterForms(data);
        setUniqueForms(extractUniqueForms(data));
      } else {
        setMasterForms(fallbackQuestions);
        setUniqueForms(extractUniqueForms(fallbackQuestions));
      }
    } catch (err) {
      console.warn("Using offline master questions fallback:", err);
      setMasterForms(fallbackQuestions);
      setUniqueForms(extractUniqueForms(fallbackQuestions));
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

    const formJudul = uniqueForms.find(f => f.id === selectedForm)?.judul || '';
    let resolvedLokasi = payload.lokasiUmum || '-';
    if ((!resolvedLokasi || resolvedLokasi === '-') && tipeFormActive === 'P3K') {
      if (/preparasi basah/i.test(formJudul)) resolvedLokasi = 'Preparasi Basah';
      else if (/preparasi kering/i.test(formJudul)) resolvedLokasi = 'Preparasi Kering';
      else if (/laboratorium|lab/i.test(formJudul)) resolvedLokasi = 'Laboratorium';
      else resolvedLokasi = 'Kotak P3K';
    }

    const finalData = {
      idForm: selectedForm,
      judulForm: formJudul,
      tipe: tipeFormActive,
      wkt: '-',
      insp1: inspectorName + ' | ' + (inspectorJabatan || inspectorNik),
      insp2: payload.signatures?.insp2Name ? `${payload.signatures.insp2Name} | ${payload.signatures.insp2Jabatan || payload.signatures.insp2Nik}` : '',
      insp3: payload.signatures?.insp3Name ? `${payload.signatures.insp3Name} | ${payload.signatures.insp3Jabatan || payload.signatures.insp3Nik}` : '',
      catatanUmum: payload.catatanUmum || '-',
      temuanUmum: payload.temuanUmum || [],
      lokasiUmum: resolvedLokasi,
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
      refreshSchedule();
      if (userScheduledTask?.formInfo?.formId) {
        setSelectedForm(userScheduledTask.formInfo.formId);
      }

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

      if (onInspectionComplete) {
        // Lift to App-level modal so navigating away doesn't lose it
        onInspectionComplete({
          waMessageText: data?.waMessageText || '',
          pdfUrl: data?.pdfUrl,
          linkPdf2: data?.linkPdf2,
          formTitle: finalData.judulForm || 'Inspeksi Rutin Mingguan',
          location: finalData.lokasiUmum || (finalData as any).subArea || '',
          id: data?.data?.id || data?.id,
          inspectorName,
          inspectorNik
        });
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

         const ket = (r.kehadiran === "Cuti" && (!r.ket || r.ket.trim() === "-" || !r.ket.trim())) ? "Cuti" : (r.ket || "-");

         dataF.push([
           jamWIT, today, bgn, payload.waktuKerja, bgn, num, r.nama, r.jabatan, r.kehadiran,
           ser, hlm, spt, msk, ear, kcm, ket, 
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
        refreshSchedule();
        if (userScheduledTask?.formInfo?.formId) {
          setSelectedForm(userScheduledTask.formInfo.formId);
        }
        if (onInspectionComplete) {
          onInspectionComplete({
            waMessageText: data?.waMessageText || '',
            pdfUrl: data?.pdfUrl,
            linkPdf2: data?.linkPdf2,
            formTitle: `Inspeksi APD - ${bgn}`,
            location: bgn,
            id: data?.id,
            inspectorName,
            inspectorNik
          });
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

  const handleJsaClickDirect = (showToast = false) => {
    setAutoFillTrigger(Date.now());
    if (showToast) {
      toast.success('⚡ Auto-Fill YA Aktif!');
    }
  };

  const handleJsaClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextCount = jsaClickCount + 1;
    setJsaClickCount(nextCount);
    
    if (nextCount >= 6) {
      setJsaClickCount(0);
      handleJsaClickDirect(false); // Silent activation - zero toasts!
    }
  };

  const tipeFormActive = useMemo(() => {
    const found = uniqueForms.find(f => f.id === selectedForm);
    if (found) return found.tipe;
    if (['17', '18', '19', '20', '21'].includes(selectedForm)) return 'APD';
    if (userScheduledTask?.formInfo?.tipe) return userScheduledTask.formInfo.tipe;
    return undefined;
  }, [uniqueForms, selectedForm, userScheduledTask]);

  const activeFormTitle = useMemo(() => {
    const found = uniqueForms.find(f => f.id === selectedForm);
    if (found) return found.judul;
    const apdMap: Record<string, string> = {
      '17': 'Inspeksi APD - Shift A Lab',
      '18': 'Inspeksi APD - Shift B Lab',
      '19': 'Inspeksi APD - Shift A Prep',
      '20': 'Inspeksi APD - Shift B Prep',
      '21': 'Inspeksi APD - Maintenance'
    };
    if (apdMap[selectedForm]) return apdMap[selectedForm];
    if (userScheduledTask?.formInfo?.formTitle) return userScheduledTask.formInfo.formTitle;
    if (userScheduledTask?.inspeksi) return userScheduledTask.inspeksi;
    return selectedForm || '';
  }, [uniqueForms, selectedForm, userScheduledTask]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 w-full max-w-3xl mx-auto px-4 sm:px-0">
      <PageHeader 
        title={
          <span className="select-none">
            Inspeksi Terpadu{' '}
            <span 
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleJsaClick} 
              className="cursor-pointer select-none font-bold text-white hover:text-emerald-300 transition-colors"
              style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
              title="Formulir Terpadu Mingguan"
            >
              Mingguan
            </span>
          </span>
        }
        description="Formulir dinamis terintegrasi Preparation & Laboratory"
        icon={<ClipboardCheck />}
      />

      <DevModeAccordion 
        inspectorNik={inspectorNik} 
        devOptions={devOptions} 
        setDevOptions={setDevOptions} 
        onTriggerAutoFill={handleJsaClickDirect}
      />

      {/* Form & Schedule Card (Auto-determined, no form selection needed) */}
      <Card className="border-t-4 border-t-[var(--primary)] bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-main)] shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-600">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2 flex-wrap">
                <span>Formulir Inspeksi Terjadwal</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold border border-emerald-500/25">
                  <CheckCircle2 className="w-3 h-3" /> Otomatis Ditentukan
                </span>
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Formulir telah ditentukan otomatis sesuai jadwal kerja personil tanpa perlu memilih form secara manual.
              </p>
            </div>
          </div>

          <span 
            onClick={handleJsaClick}
            className="text-[10px] text-[var(--text-muted)] cursor-pointer select-none font-bold px-2 py-0.5 rounded-full bg-[var(--input-bg)] hover:bg-[var(--primary)] hover:text-white transition-colors"
            title="Klik 6x untuk Developer Cheat (Auto Fill YA)"
          >
            Mingguan
          </span>
        </div>

        {/* Task Details Banner */}
        {userScheduledTask ? (
          <div className={`p-3.5 rounded-2xl border text-xs flex flex-col gap-2.5 transition-all ${
            userScheduledTask.isCompleted 
              ? 'bg-emerald-500/10 border-emerald-500/40 text-[var(--text-main)]' 
              : 'bg-emerald-500/10 border-emerald-500/30'
          }`}>
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold tracking-wider uppercase text-emerald-800 dark:text-emerald-200">
                  Tugas Terjadwal Anda:
                </span>
                <h4 className="font-black text-sm sm:text-base text-[var(--text-main)]">
                  {userScheduledTask.inspeksi}
                </h4>
              </div>

              {userScheduledTask.isCompleted ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white font-extrabold text-[10.5px] uppercase tracking-wider shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" /> SUDAH DILAKSANAKAN
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-extrabold text-[10.5px] uppercase border border-amber-500/30">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  SIAP DILAKSANAKAN
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[11px] text-[var(--text-muted)] font-medium pt-1 border-t border-emerald-500/20">
              <div>
                Shift: <span className="font-bold text-emerald-700 dark:text-emerald-300">{userScheduledTask.shift}</span>
              </div>
              <div>•</div>
              <div>
                Peran: <span className="font-bold text-emerald-700 dark:text-emerald-300">Inspektor {userScheduledTask.roleIndex} {userScheduledTask.roleIndex === 1 ? '(Utama)' : '(Pendamping)'}</span>
              </div>
              {activeFormTitle && (
                <>
                  <div>•</div>
                  <div className="truncate max-w-xs">
                    Form: <span className="font-bold text-[var(--text-main)]">{activeFormTitle}</span>
                  </div>
                </>
              )}
            </div>

            {userScheduledTask.partners && userScheduledTask.partners.length > 0 && (
              <div className="text-[11px] text-[var(--text-muted)] font-medium pt-1 flex flex-wrap items-center gap-1.5 border-t border-emerald-500/15">
                <span className="inline-flex items-center gap-1 font-bold text-teal-700 dark:text-teal-300 bg-teal-500/15 border border-teal-500/30 px-2 py-0.5 rounded-md text-[10px]">
                  <Users className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                  {userScheduledTask.partners.length === 1 ? 'Pasangan:' : 'Rekan Tim:'}
                </span>
                {userScheduledTask.partners.map((p: any, idx: number) => (
                  <span key={idx} className="font-bold text-[var(--text-main)]">
                    {p.name} <span className="text-[10px] text-[var(--text-muted)] font-normal">({p.roleIndex === 1 ? 'Inspektor 1' : `Inspektor ${p.roleIndex}`} • {p.jabatan})</span>{idx < userScheduledTask.partners.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : loadingSchedule ? (
          <div className="p-4 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-main)] flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
            <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
            <span>Menghubungkan ke jadwal inspeksi personil...</span>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <span>⚠️ Jadwal otomatis tidak terdeteksi untuk akun ini. Anda dapat memilih formulir inspeksi secara manual di bawah.</span>
          </div>
        )}

        {/* Location Notice for Form Umum */}
        {tipeFormActive === "UMUM" && (
          <div className="mt-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center gap-2.5 text-xs text-blue-700 dark:text-blue-300">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="leading-relaxed">
              {userScheduledTask?.formInfo?.subArea ? (
                <>
                  <strong>Formulir & Lokasi Terkunci:</strong> Formulir dan lokasi inspeksi (<strong>{userScheduledTask.formInfo.subArea}</strong>) telah ditentukan otomatis oleh tim admin sesuai jadwal. Anda dapat langsung mengisi checklist di bawah.
                </>
              ) : (
                <>
                  <strong>Penentuan Formulir:</strong> Formulir inspeksi telah dikunci otomatis sesuai jadwal. Lokasi sub-area akan otomatis dimuat pada formulir di bawah.
                </>
              )}
            </p>
          </div>
        )}

        {/* Collapsible Manual Selector (For dev / admin / special override) */}
        <div className="mt-3 pt-2 border-t border-[var(--border-main)] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowManualFormSelector(!showManualFormSelector)}
              className="text-[11px] text-[var(--text-muted)] hover:text-teal-600 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>{showManualFormSelector ? '▲ Sembunyikan Pilihan Manual' : '▼ Butuh ganti formulir lain? (Opsional / Manual)'}</span>
            </button>
            {selectedForm && (
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                Form ID: {selectedForm}
              </span>
            )}
          </div>

          {(showManualFormSelector || (!userScheduledTask && !loadingSchedule)) && (
            <div className="pt-2 animate-in fade-in duration-200">
              {loading ? (
                <div className="text-center py-3 text-[var(--text-muted)] text-xs flex items-center justify-center gap-2">
                   <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin"></div>
                   Memuat Form dari Server...
                </div>
              ) : (
                <Select 
                  value={selectedForm} 
                  onChange={(e) => setSelectedForm(e.target.value)} 
                  className="font-bold text-[var(--text-main)] shadow-sm border-[var(--border-main)] bg-[var(--input-bg)] w-full text-xs"
                >
                  <option value="">-- Pilih Formulir Inspeksi Lain --</option>
                  
                  <optgroup label="[ AREA ]">
                    {uniqueForms.filter(f => f.tipe === "UMUM").map(f => (
                      <option key={f.id} value={f.id}>{f.judul}</option>
                    ))}
                  </optgroup>
                  
                  <optgroup label="[ P3K ]">
                    {uniqueForms.filter(f => f.tipe === "P3K").map(f => (
                      <option key={f.id} value={f.id}>{f.judul}</option>
                    ))}
                  </optgroup>
                  
                  <optgroup label="[ SARANA ]">
                    {uniqueForms.filter(f => f.tipe === "SARANA").map(f => (
                      <option key={f.id} value={f.id}>{f.judul}</option>
                    ))}
                  </optgroup>
                  
                  <optgroup label="[ PERKAKAS ]">
                    {uniqueForms.filter(f => f.tipe === "PERKAKAS").map(f => (
                      <option key={f.id} value={f.id}>{f.judul}</option>
                    ))}
                  </optgroup>
                  
                  <optgroup label="[ TABUNG GAS ]">
                    {uniqueForms.filter(f => f.tipe === "TABUNG" || f.tipe === "TABUNG_MINGGUAN").map(f => (
                      <option key={f.id} value={f.id}>{f.judul}</option>
                    ))}
                  </optgroup>
                  
                  <optgroup label="[ TANGGA ]">
                    {uniqueForms.filter(f => f.tipe === "TANGGA").map(f => (
                      <option key={f.id} value={f.id}>{f.judul}</option>
                    ))}
                  </optgroup>

                  <optgroup label="[ KEPATUHAN APD ]">
                     <option value="17">Inspeksi APD - Shift A Lab</option>
                     <option value="18">Inspeksi APD - Shift B Lab</option>
                     <option value="19">Inspeksi APD - Shift A Prep</option>
                     <option value="20">Inspeksi APD - Shift B Prep</option>
                     <option value="21">Inspeksi APD - Maintenance</option>
                  </optgroup>
                </Select>
              )}
            </div>
          )}
        </div>
      </Card>

      

      {selectedForm && tipeFormActive === "UMUM" && (
        <FormUmum 
          data={masterForms?.filter(f => (f.id_form || f.idForm) === selectedForm) || []} 
          inspectorName={inspectorName}
          inspectorNik={inspectorNik}
          onSubmit={handleSubmitUniversal} 
          autoFillAllYa={autoFillTrigger}
          defaultSubArea={userScheduledTask?.formInfo?.subArea || sessionStorage.getItem('preselected_sub_area') || ''}
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
