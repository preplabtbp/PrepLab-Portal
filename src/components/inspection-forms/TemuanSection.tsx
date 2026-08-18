import React from 'react';
import { Card, Button, Input, Select } from '../ui';
import { PlusCircle, Trash2, Camera } from 'lucide-react';

export interface TemuanItem {
  id: number;
  temuan: string;
  risiko: string;
  pengendalian: string;
  status: string;
  foto?: string;
}

export function TemuanSection({ temuan, setTemuan }: { temuan: TemuanItem[], setTemuan: React.Dispatch<React.SetStateAction<TemuanItem[]>> }) {
  const addTemuan = () => {
    setTemuan(prev => [
      ...prev,
      { id: Date.now(), temuan: '', risiko: '', pengendalian: '', status: 'Open' }
    ]);
  };

  const updateTemuan = (id: number, field: string, value: string) => {
    setTemuan(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const removeTemuan = (id: number) => {
    setTemuan(prev => prev.filter(t => t.id !== id));
  };

  return (
    <Card className="border-t-4 border-t-rose-500">
      <div className="flex items-center justify-between mb-4">
        <label className="text-sm font-semibold text-rose-800 flex items-center gap-2">
          Daftar Temuan Tambahan
        </label>
      </div>

      <div className="space-y-4 mb-4">
        {temuan.map((t, i) => (
          <div key={t.id} className="p-4 border border-rose-100 bg-rose-50/30 rounded-xl relative">
            <div className="absolute top-2 right-2 flex items-center gap-2">
              <span className="text-xs font-bold text-rose-300">#{i + 1}</span>
              <button onClick={() => removeTemuan(t.id)} className="p-1.5 bg-white text-rose-500 hover:bg-rose-100 rounded-lg shadow-sm transition-colors border border-rose-100">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="space-y-3">
                <Input 
                  placeholder="Deskripsi Temuan KTA/TTA..." 
                  value={t.temuan} 
                  onChange={e => updateTemuan(t.id, 'temuan', e.target.value)}
                  className="border-rose-200 focus:border-rose-400"
                />
                <Input 
                  placeholder="Risiko bahaya (Misal: Terpeleset, Kebakaran)..." 
                  value={t.risiko} 
                  onChange={e => updateTemuan(t.id, 'risiko', e.target.value)}
                  className="border-rose-200 focus:border-rose-400"
                />
                <Input 
                  placeholder="Saran Pengendalian..." 
                  value={t.pengendalian} 
                  onChange={e => updateTemuan(t.id, 'pengendalian', e.target.value)}
                  className="border-rose-200 focus:border-rose-400"
                />
                <Select 
                  value={t.status} 
                  onChange={e => updateTemuan(t.id, 'status', e.target.value)}
                  className="border-rose-200 focus:border-rose-400 font-medium text-rose-700"
                >
                  <option value="Open">Open (Masih Berlangsung)</option>
                  <option value="Closed">Closed (Sudah Diselesaikan)</option>
                </Select>
              </div>

              <div>
                {t.foto ? (
                  <div className="relative h-full min-h-32">
                    <img src={t.foto} alt="Bukti Temuan" className="w-full h-full object-cover rounded-lg border border-rose-200" />
                    <button onClick={() => updateTemuan(t.id, 'foto', '')} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg shadow-sm hover:bg-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="h-full min-h-32">
                    <label className="flex flex-col items-center justify-center gap-3 w-full h-full bg-white border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer font-medium p-4 text-center">
                      <Camera className="w-6 h-6 opacity-70" />
                      <span className="text-sm">Tambah Foto Temuan</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if(file) {
                           const reader = new FileReader();
                           reader.onload = async (evt) => {
                             const img = new Image();
                             img.onload = () => {
                               const canvas = document.createElement('canvas');
                               let width = img.width;
                               let height = img.height;
                               const maxD = 600;
                               if (width > height) { if (width > maxD) { height *= maxD / width; width = maxD; } } 
                               else { if (height > maxD) { width *= maxD / height; height = maxD; } }
                               canvas.width = width; canvas.height = height;
                               const ctx = canvas.getContext('2d');
                               ctx?.drawImage(img, 0, 0, width, height);
                               const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
                               updateTemuan(t.id, 'foto', compressedBase64);
                             };
                             img.src = evt.target?.result as string;
                           };
                           reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={addTemuan} variant="secondary" className="w-full border-dashed border-2 py-6 text-rose-600 hover:bg-rose-50 border-rose-200">
        <PlusCircle className="w-5 h-5 mr-2" /> Tambah Baris Temuan
      </Button>
    </Card>
  );
}
