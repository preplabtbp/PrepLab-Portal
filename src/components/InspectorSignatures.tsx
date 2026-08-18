import React, { useRef, useState, useEffect } from 'react';
import { Card, Button, Input } from './ui';
import SignatureCanvas from 'react-signature-canvas';
import { Trash2, PenTool, Search, Users } from 'lucide-react';
import { getEmployees } from '../sheets-api';

interface InspectorSignaturesProps {
  inspectorName: string;
  inspectorNik: string;
  onChange: (data: SignatureData) => void;
}

export interface SignatureData {
  ttd1: string;
  insp2Name: string;
  insp2Nik: string;
  insp2Jabatan?: string;
  ttd2: string;
  insp3Name: string;
  insp3Nik: string;
  insp3Jabatan?: string;
  ttd3: string;
}

export function InspectorSignatures({ inspectorName, inspectorNik, onChange }: InspectorSignaturesProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  
  const sigPad1 = useRef<SignatureCanvas>(null);
  const sigPad2 = useRef<SignatureCanvas>(null);
  const sigPad3 = useRef<SignatureCanvas>(null);

  const [ttd1, setTtd1] = useState('');
  const [ttd2, setTtd2] = useState('');
  const [ttd3, setTtd3] = useState('');

  const [insp2, setInsp2] = useState<any>(null);
  const [insp3, setInsp3] = useState<any>(null);

  const [search2, setSearch2] = useState('');
  const [search3, setSearch3] = useState('');

  useEffect(() => {
    getEmployees().then(setEmployees).catch(console.error);
  }, []);

  const triggerChange = (newValues: Partial<SignatureData>) => {
    onChange({
      ttd1,
      insp2Name: insp2?.nama || '',
      insp2Nik: insp2?.nik || '',
      insp2Jabatan: insp2?.jabatan || '',
      ttd2,
      insp3Name: insp3?.nama || '',
      insp3Nik: insp3?.nik || '',
      insp3Jabatan: insp3?.jabatan || '',
      ttd3,
      ...newValues
    });
  };

  const handleClear1 = () => { sigPad1.current?.clear(); setTtd1(''); triggerChange({ ttd1: '' }); };
  const handleClear2 = () => { sigPad2.current?.clear(); setTtd2(''); triggerChange({ ttd2: '' }); };
  const handleClear3 = () => { sigPad3.current?.clear(); setTtd3(''); triggerChange({ ttd3: '' }); };

  const handleEnd1 = () => { const val = sigPad1.current?.getCanvas().toDataURL() || ''; setTtd1(val); triggerChange({ ttd1: val }); };
  const handleEnd2 = () => { const val = sigPad2.current?.getCanvas().toDataURL() || ''; setTtd2(val); triggerChange({ ttd2: val }); };
  const handleEnd3 = () => { const val = sigPad3.current?.getCanvas().toDataURL() || ''; setTtd3(val); triggerChange({ ttd3: val }); };

  return (
    <div className="space-y-4">
      {/* Inspector 1 */}
      <Card className="border-l-4 border-l-slate-400">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
          <PenTool className="w-4 h-4 text-slate-500" />
          Tanda Tangan Inspektor Utama <span className="text-rose-500">*</span>
        </label>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-700 text-sm mb-3">
          {inspectorName}
        </div>
        <div className="relative border-2 border-dashed border-blue-300 rounded-xl bg-slate-50">
          <Button onClick={handleClear1} variant="secondary" className="absolute top-2 right-2 h-7 px-2 text-xs z-10 bg-white/80 backdrop-blur text-rose-600 border-rose-200 hover:bg-rose-50">
            <Trash2 className="w-3 h-3 mr-1" /> Ulangi
          </Button>
          <SignatureCanvas 
            ref={sigPad1} 
            penColor="black"
            onEnd={handleEnd1}
            clearOnResize={false}
                canvasProps={{ className: 'w-full h-40 rounded-xl' }} 
          />
        </div>
      </Card>

      {/* Inspector 2 */}
      <Card className="border-l-4 border-l-blue-400">
        <label className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1">
          <Users className="w-4 h-4 text-blue-500" />
          Inspektor 2 (Opsional)
        </label>
        
        {!insp2 ? (
          <div className="relative mb-3">
            <div className="flex relative items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3" />
              <Input
                placeholder="Cari nama karyawan..."
                value={search2}
                onChange={e => setSearch2(e.target.value)}
                className="w-full text-sm pl-9"
              />
            </div>
            {search2 && (
              <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl z-50">
                {employees
                  .filter(e => e.nama.toLowerCase().includes(search2.toLowerCase()) && e.nama !== inspectorName)
                  .slice(0, 5)
                  .map(e => (
                    <div
                      key={e.nama}
                      onClick={() => {
                        setInsp2(e);
                        setSearch2('');
                        triggerChange({ insp2Name: e.nama, insp2Nik: e.nik });
                      }}
                      className="px-3 py-2 border-b border-slate-100 hover:bg-blue-50 cursor-pointer flex flex-col"
                    >
                      <span className="font-semibold text-sm text-slate-800">{e.nama}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 font-medium text-blue-800 text-sm flex-1">
                {insp2.nama}
              </div>
              <Button onClick={() => { setInsp2(null); handleClear2(); triggerChange({ insp2Name: '', insp2Nik: '', ttd2: '' }); }} variant="ghost" className="text-rose-500 ml-2">
                Hapus
              </Button>
            </div>
            <div className="relative border-2 border-dashed border-blue-300 rounded-xl bg-slate-50">
              <Button onClick={handleClear2} variant="secondary" className="absolute top-2 right-2 h-7 px-2 text-xs z-10 bg-white/80 backdrop-blur text-rose-600 border-rose-200 hover:bg-rose-50">
                <Trash2 className="w-3 h-3 mr-1" /> Ulangi
              </Button>
              <SignatureCanvas 
                ref={sigPad2} 
                penColor="black"
                onEnd={handleEnd2}
                clearOnResize={false}
                canvasProps={{ className: 'w-full h-40 rounded-xl' }} 
              />
            </div>
          </>
        )}
      </Card>

      {/* Inspector 3 */}
      {insp2 && (
        <Card className="border-l-4 border-l-purple-400">
          <label className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Users className="w-4 h-4 text-purple-500" />
            Inspektor 3 (Opsional)
          </label>
          
          {!insp3 ? (
            <div className="relative mb-3">
              <div className="flex relative items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3" />
                <Input
                  placeholder="Cari nama karyawan..."
                  value={search3}
                  onChange={e => setSearch3(e.target.value)}
                  className="w-full text-sm pl-9"
                />
              </div>
              {search3 && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl z-50">
                  {employees
                    .filter(e => e.nama.toLowerCase().includes(search3.toLowerCase()) && e.nama !== inspectorName && e.nama !== insp2.nama)
                    .slice(0, 5)
                    .map(e => (
                      <div
                        key={e.nama}
                        onClick={() => {
                          setInsp3(e);
                          setSearch3('');
                          triggerChange({ insp3Name: e.nama, insp3Nik: e.nik });
                        }}
                        className="px-3 py-2 border-b border-slate-100 hover:bg-blue-50 cursor-pointer flex flex-col"
                      >
                        <span className="font-semibold text-sm text-slate-800">{e.nama}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-3">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 font-medium text-purple-800 text-sm flex-1">
                  {insp3.nama}
                </div>
                <Button onClick={() => { setInsp3(null); handleClear3(); triggerChange({ insp3Name: '', insp3Nik: '', ttd3: '' }); }} variant="ghost" className="text-rose-500 ml-2">
                  Hapus
                </Button>
              </div>
              <div className="relative border-2 border-dashed border-purple-300 rounded-xl bg-slate-50">
                <Button onClick={handleClear3} variant="secondary" className="absolute top-2 right-2 h-7 px-2 text-xs z-10 bg-white/80 backdrop-blur text-rose-600 border-rose-200 hover:bg-rose-50">
                  <Trash2 className="w-3 h-3 mr-1" /> Ulangi
                </Button>
                <SignatureCanvas 
                  ref={sigPad3} 
                  penColor="black"
                  onEnd={handleEnd3}
                  clearOnResize={false}
                canvasProps={{ className: 'w-full h-40 rounded-xl' }} 
                />
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
