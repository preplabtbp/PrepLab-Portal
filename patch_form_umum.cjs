const fs = require('fs');
let code = fs.readFileSync('src/components/inspection-forms/FormUmum.tsx', 'utf8');

// 1. Update State signature
code = code.replace(
  "const [temuan, setTemuan] = useState<{ id: number, temuan: string, risiko: string, pengendalian: string, status: string }[]>([]);",
  "const [temuan, setTemuan] = useState<{ id: number, temuan: string, risiko: string, pengendalian: string, status: string, foto?: string }[]>([]);"
);

// 2. Add photo upload button per temuan
const oldTemuanInput = `<Input 
                    placeholder="Tingkat Risiko (Misal: Tinggi, Rendah)..." 
                    value={t.risiko} 
                    onChange={e => updateTemuan(t.id, 'risiko', e.target.value)}
                    className="border-rose-200 focus:border-rose-400"
                  />`;

const newTemuanInput = `<Input 
                    placeholder="Risiko bahaya (Misal: Terpeleset, Kebakaran)..." 
                    value={t.risiko} 
                    onChange={e => updateTemuan(t.id, 'risiko', e.target.value)}
                    className="border-rose-200 focus:border-rose-400"
                  />
                  {t.foto ? (
                    <div className="relative mt-2">
                      <img src={t.foto} alt="Bukti Temuan" className="w-full h-32 object-cover rounded-lg border border-rose-200" />
                      <button onClick={() => updateTemuan(t.id, 'foto', '')} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <label className="flex items-center justify-center gap-2 w-full py-2 bg-white border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer text-sm font-medium">
                        <Camera className="w-4 h-4" />
                        Tambah Foto Temuan
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if(file) {
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                              if(evt.target?.result) {
                                updateTemuan(t.id, 'foto', evt.target.result.toString());
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }} />
                      </label>
                    </div>
                  )}`;
code = code.replace(oldTemuanInput, newTemuanInput);

// 3. Extract fotoTemuanArray in onSubmit
const oldOnSubmit = `onSubmit({
      lokasiUmum: subArea,
      payload,
      temuanUmum: finalTemuan,
      catatanUmum: catatan,
      fotoProses: fotoBukti,
      signatures: signatureData
    });`;
const newOnSubmit = `const fotoTemuanArray = finalTemuan.map(t => t.foto || '').slice(0, 3);
    onSubmit({
      lokasiUmum: subArea,
      payload,
      temuanUmum: finalTemuan,
      catatanUmum: catatan,
      fotoTemuanArray,
      fotoProses: fotoBukti,
      signatures: signatureData
    });`;
code = code.replace(oldOnSubmit, newOnSubmit);

fs.writeFileSync('src/components/inspection-forms/FormUmum.tsx', code);
