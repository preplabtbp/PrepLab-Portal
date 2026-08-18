import { toast } from 'sonner';
import React, { useState, useEffect } from 'react';
import { Package, FileText, CheckCircle2, Upload, Loader2, Calendar } from 'lucide-react';
import { Button, Select } from './ui';
import { getPendingApdDocuments, uploadDocumentProof } from '../sheets-api';
import { PageHeader } from './PageHeader';

export function ApdMonitoringScreen() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending'>('pending');
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const data = await getPendingApdDocuments();
      setDocuments(data || []);
    } catch (err) {
      console.error(err);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUploadProof = async (docId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(docId);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const res: any = await uploadDocumentProof(docId, base64, file.name);
        if (res && res.url) {
          // Update local state
          setDocuments(prev => prev.map(doc => {
            if (doc.id === docId) {
              return { ...doc, pdfUrl: res.url, status: 'Selesai' };
            }
            return doc;
          }));
          toast.success('Bukti berhasil diupload!');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengupload bukti');
    } finally {
      setUploadingDoc(null);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (filter === 'all') return true;
    if (filter === 'pending') return doc.status !== 'Selesai' && !doc.pdfUrl?.includes('App_Uploads');
    return true;
  });

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <PageHeader 
        title="Daftar Form Pengambilan APD"
        description="List dokumen permintaan APD yang dicetak dan membutuhkan upload dokumen hasil scan ber-TTD."
        icon={<FileText />}
      >
        <div className="w-full sm:w-auto mt-2 sm:mt-0">
          <Select 
            label="" 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as any)}
            options={[
              { value: 'all', label: 'Semua Dokumen' },
              { value: 'pending', label: 'Belum Ada Lampiran' }
            ]}
            className="bg-white/10 text-white border-white/20 shadow-sm backdrop-blur-md [&>option]:text-slate-800"
          />
        </div>
      </PageHeader>
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">


        {isLoading ? (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-sm text-slate-500">Memuat data...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-10 h-10 text-teal-400 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Tidak ada dokumen yang sesuai filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDocuments.map((doc, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg mb-1">{doc.nama}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(doc.timestamp).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                  {doc.pdfUrl && doc.status === 'Selesai' ? (
                    <button type="button" onClick={() => window.open(doc.pdfUrl, "_blank", "noopener,noreferrer")} className="flex-1 md:flex-none text-center px-4 py-2 bg-teal-50 text-teal-700 rounded-xl font-semibold border border-teal-200 hover:bg-teal-100 transition-colors text-sm">
                      Lihat Dokumen
                    </button>
                  ) : (
                    <div className="flex-1 md:flex-none flex items-center gap-2 w-full">
                      {doc.pdfUrl && (
                        <button type="button" onClick={() => window.open(doc.pdfUrl, "_blank", "noopener,noreferrer")} className="flex-1 text-center px-4 py-2 bg-white text-slate-700 rounded-xl font-semibold border border-slate-200 hover:bg-slate-50 transition-colors text-sm">
                          Lihat Draft
                          </button>
                      )}
                      <label className="flex-1 text-center cursor-pointer px-4 py-2 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors text-sm flex items-center justify-center gap-2">
                        {uploadingDoc === doc.id ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                        ) : (
                          <><Upload className="w-4 h-4" /> Upload Scan</>
                        )}
                        <input 
                          type="file" 
                          accept="application/pdf,image/*" 
                          className="hidden" 
                          onChange={(e) => handleUploadProof(doc.id, e)}
                          disabled={uploadingDoc === doc.id}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
