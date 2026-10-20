import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from './ui';
import { Search, Users, UserCheck } from 'lucide-react';
import { getEmployees } from '../sheets-api';
import { VerifiedSignaturePad } from './VerifiedSignaturePad';

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

  return (
    <div className="space-y-4">
      {/* 1. Inspector 1 (Inspektor Utama) */}
      <Card className="border-l-4 border-l-teal-500 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            Inspektor Utama <span className="text-rose-500">*</span>
          </label>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-bold">
            {inspectorNik || 'NIK -'}
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 font-bold text-slate-800 dark:text-slate-100 text-sm">
          {inspectorName}
        </div>

        <VerifiedSignaturePad
          signerName={inspectorName}
          signerNik={inspectorNik}
          label="Tanda Tangan Inspektor Utama"
          required
          value={ttd1}
          onChange={(val) => {
            setTtd1(val);
            triggerChange({ ttd1: val });
          }}
          accentColor="teal"
          heightClass="h-36"
        />
      </Card>

      {/* 2. Inspector 2 (Opsional) */}
      <Card className="border-l-4 border-l-blue-500 shadow-sm p-4 space-y-3">
        <label className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
          <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Inspektor 2 (Opsional)
        </label>
        
        {!insp2 ? (
          <div className="relative">
            <div className="flex relative items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3" />
              <Input
                placeholder="Cari nama karyawan rekan inspeksi..."
                value={search2}
                onChange={e => setSearch2(e.target.value)}
                className="w-full text-sm pl-9 rounded-xl"
              />
            </div>
            {search2 && (
              <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50">
                {employees
                  .filter(e => e.nama.toLowerCase().includes(search2.toLowerCase()) && e.nama !== inspectorName)
                  .slice(0, 6)
                  .map(e => (
                    <div
                      key={e.nama}
                      onClick={() => {
                        setInsp2(e);
                        setSearch2('');
                        setTtd2('');
                        triggerChange({ 
                          insp2Name: e.nama, 
                          insp2Nik: e.nik, 
                          insp2Jabatan: e.jabatan,
                          ttd2: '' 
                        });
                      }}
                      className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 block">{e.nama}</span>
                        <span className="text-[11px] text-slate-400">{e.jabatan || 'Crew'} • {e.nik}</span>
                      </div>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Pilih</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-2.5">
              <div>
                <span className="font-bold text-sm text-blue-950 dark:text-blue-100 block">{insp2.nama}</span>
                <span className="text-[11px] text-blue-600 dark:text-blue-300 font-mono">{insp2.jabatan || 'Crew'} • {insp2.nik}</span>
              </div>
              <Button 
                onClick={() => { 
                  setInsp2(null); 
                  setTtd2(''); 
                  triggerChange({ insp2Name: '', insp2Nik: '', insp2Jabatan: '', ttd2: '' }); 
                }} 
                variant="ghost" 
                className="text-rose-500 hover:bg-rose-50 text-xs px-2.5 py-1"
              >
                Ganti Rekan
              </Button>
            </div>

            <VerifiedSignaturePad
              signerName={insp2.nama}
              signerNik={insp2.nik}
              label={`Tanda Tangan Inspektor 2 (${insp2.nama})`}
              value={ttd2}
              onChange={(val) => {
                setTtd2(val);
                triggerChange({ ttd2: val });
              }}
              accentColor="blue"
              heightClass="h-36"
            />
          </div>
        )}
      </Card>

      {/* 3. Inspector 3 (Opsional) */}
      {insp2 && (
        <Card className="border-l-4 border-l-purple-500 shadow-sm p-4 space-y-3">
          <label className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            Inspektor 3 (Opsional)
          </label>
          
          {!insp3 ? (
            <div className="relative">
              <div className="flex relative items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3" />
                <Input
                  placeholder="Cari nama karyawan rekan inspeksi ke-3..."
                  value={search3}
                  onChange={e => setSearch3(e.target.value)}
                  className="w-full text-sm pl-9 rounded-xl"
                />
              </div>
              {search3 && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50">
                  {employees
                    .filter(e => e.nama.toLowerCase().includes(search3.toLowerCase()) && e.nama !== inspectorName && e.nama !== insp2.nama)
                    .slice(0, 6)
                    .map(e => (
                      <div
                        key={e.nama}
                        onClick={() => {
                          setInsp3(e);
                          setSearch3('');
                          setTtd3('');
                          triggerChange({ 
                            insp3Name: e.nama, 
                            insp3Nik: e.nik, 
                            insp3Jabatan: e.jabatan,
                            ttd3: '' 
                          });
                        }}
                        className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 block">{e.nama}</span>
                          <span className="text-[11px] text-slate-400">{e.jabatan || 'Crew'} • {e.nik}</span>
                        </div>
                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400">Pilih</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl p-2.5">
                <div>
                  <span className="font-bold text-sm text-purple-950 dark:text-purple-100 block">{insp3.nama}</span>
                  <span className="text-[11px] text-purple-600 dark:text-purple-300 font-mono">{insp3.jabatan || 'Crew'} • {insp3.nik}</span>
                </div>
                <Button 
                  onClick={() => { 
                    setInsp3(null); 
                    setTtd3(''); 
                    triggerChange({ insp3Name: '', insp3Nik: '', insp3Jabatan: '', ttd3: '' }); 
                  }} 
                  variant="ghost" 
                  className="text-rose-500 hover:bg-rose-50 text-xs px-2.5 py-1"
                >
                  Ganti Rekan
                </Button>
              </div>

              <VerifiedSignaturePad
                signerName={insp3.nama}
                signerNik={insp3.nik}
                label={`Tanda Tangan Inspektor 3 (${insp3.nama})`}
                value={ttd3}
                onChange={(val) => {
                  setTtd3(val);
                  triggerChange({ ttd3: val });
                }}
                accentColor="purple"
                heightClass="h-36"
              />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
