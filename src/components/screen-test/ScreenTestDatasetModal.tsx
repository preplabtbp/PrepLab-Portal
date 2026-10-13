import React, { useState } from 'react';
import { X, Plus, Layers, Trash2, CheckCircle2 } from 'lucide-react';
import { ScreenTestDataset } from './screen-test-types';

interface ScreenTestDatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasets: ScreenTestDataset[];
  onAddDataset: (newDataset: ScreenTestDataset) => void;
  onDeleteDataset: (id: string) => void;
  activeDatasetId: string;
}

export const ScreenTestDatasetModal: React.FC<ScreenTestDatasetModalProps> = ({
  isOpen,
  onClose,
  datasets,
  onAddDataset,
  onDeleteDataset,
  activeDatasetId,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [specLimit, setSpecLimit] = useState(95.00);
  const [meshSize, setMeshSize] = useState('200 mesh (74 µm)');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const shortCode = code.trim() || name.substring(0, 4).toUpperCase();
    const id = `dataset-${shortCode.toLowerCase()}-${Date.now().toString(36)}`;

    onAddDataset({
      id,
      name: name.trim(),
      code: shortCode,
      specLimit: Number(specLimit) || 95.00,
      meshSize: meshSize.trim() || '200 mesh (74 µm)',
      description: description.trim(),
      records: [],
      isDefault: false,
    });

    setName('');
    setCode('');
    setDescription('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white border border-slate-300 rounded-2xl shadow-xl flex flex-col overflow-hidden text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-800">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Kelola Dataset / Jenis Sampel</h3>
              <p className="text-xs text-slate-500">Tambah jenis sampel baru selain HPL (contoh: RKEF, MSP, Ore Feed)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* List of Current Datasets */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase">
              Daftar Dataset Aktif:
            </label>
            <div className="space-y-1.5">
              {datasets.map((ds) => (
                <div 
                  key={ds.id} 
                  className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                    ds.id === activeDatasetId 
                      ? 'bg-blue-50/80 border-blue-300' 
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold px-2 py-0.5 rounded bg-white border border-slate-300 font-mono text-slate-800">
                      {ds.code}
                    </span>
                    <div>
                      <span className="font-semibold text-slate-900">{ds.name}</span>
                      <span className="text-[11px] text-slate-500 block">
                        Standar: &ge; {ds.specLimit.toFixed(2)}% • {ds.records.length} sampel
                      </span>
                    </div>
                  </div>

                  {!ds.isDefault && (
                    <button
                      type="button"
                      onClick={() => onDeleteDataset(ds.id)}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                      title="Hapus Dataset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-teal-600" />
              <span>Tambah Jenis Sampel Baru:</span>
            </h4>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-slate-600 block mb-1 font-medium">Nama Dataset / Sampel:</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Sample Smelter RKEF"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1 font-medium">Kode Singkat:</label>
                  <input
                    type="text"
                    required
                    placeholder="RKEF"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono uppercase focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-600 block mb-1 font-medium">Batas Min Lolos (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="50"
                    max="100"
                    value={specLimit}
                    onChange={(e) => setSpecLimit(parseFloat(e.target.value) || 95.00)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1 font-medium">Ukuran Ayakan (Mesh):</label>
                  <input
                    type="text"
                    value={meshSize}
                    onChange={(e) => setMeshSize(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-medium">Keterangan / Proses (Opsional):</label>
                <input
                  type="text"
                  placeholder="Contoh: Pengujian ayakan tungku listrik pirometalurgi"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg shadow-xs active:scale-95 cursor-pointer"
                >
                  Tambah Dataset
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
