const fs = require('fs');

let code = fs.readFileSync('src/components/settings-screen.tsx', 'utf8');

// Replace all the GAS config blocks with nothing, or just re-write the component
const replacement = `import React, { useState } from 'react';
import { Card, Button, Input } from './ui';
import { LogOut, FileSpreadsheet, Server, Settings2 } from 'lucide-react';

export function SettingsScreen({ inspectorName, onLogoutKaryawan }: { inspectorName: string | null, onLogoutKaryawan: () => void }) {
  const [ktaUrl, setKtaUrlState] = useState(localStorage.getItem('KTA_URL') || '');

  const handleSaveConnections = () => {
    localStorage.setItem('KTA_URL', ktaUrl);
    alert('Konfigurasi berhasil disimpan!');
    window.location.reload();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-1">
        <h2 className="text-2xl font-display font-semibold text-slate-800">Pengaturan Sistem</h2>
        <p className="text-sm text-slate-500 mt-1">Status sesi dan konfigurasi aplikasi</p>
      </div>

      {inspectorName && (
        <Card>
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
            <div className="w-14 h-14 rounded-xl bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-700 font-display font-semibold text-xl shadow-sm"> 
              {inspectorName.charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-slate-800 font-display">
                {inspectorName}
              </div>
              <div className="text-xs text-slate-500 mt-1"> 
                Sesi Aktif (Berdasarkan NIK)
              </div>
            </div>
          </div>
          <Button variant="danger" onClick={onLogoutKaryawan}>
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </Card>
      )}

      <div className="space-y-4">
        {/* Eksternal URL */}
        <Card className="border-t-4 border-t-purple-500">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Settings2 className="w-4 h-4 text-purple-600" />
            Konfigurasi URL Eksternal
          </h3>
          <div className="space-y-3">
            <Input 
              label="Form URL KTA/TTA" 
              value={ktaUrl} 
              onChange={e => setKtaUrlState(e.target.value)} 
            />
          </div>
        </Card>
      </div>

      <div className="pt-2 sticky bottom-24 z-10">
        <Button onClick={handleSaveConnections} className="w-full shadow-lg shadow-teal-500/20">
          <Server className="w-5 h-5 mr-2" /> Simpan Konfigurasi & Sistem
        </Button>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/components/settings-screen.tsx', replacement);
