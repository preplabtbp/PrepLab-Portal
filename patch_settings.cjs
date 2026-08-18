const fs = require('fs');
let code = fs.readFileSync('src/components/settings-screen.tsx', 'utf8');

const soundSection = `
            <Card className="space-y-4">
              <h3 className="text-base font-bold flex items-center gap-2 pb-3 border-b border-slate-100" style={{ color: 'var(--primary)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bell"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                Notifikasi & Suara
              </h3>
              <p className="text-sm opacity-70">Aktifkan suara peringatan saat ada notifikasi masuk di dalam aplikasi.</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Suara In-App</span>
                <input 
                  type="checkbox" 
                  checked={soundEnabled} 
                  onChange={(e) => {
                    setSoundEnabled(e.target.checked);
                    localStorage.setItem('p2h_sound_enabled', e.target.checked ? '1' : '0');
                    if (e.target.checked) toast.success('Suara notifikasi diaktifkan');
                  }} 
                  className="w-5 h-5 accent-slate-900" 
                />
              </div>
            </Card>
`;

code = code.replace(
  /const \[email, setEmail\] = useState\(''\);/,
  `const [email, setEmail] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('p2h_sound_enabled') !== '0';
  });`
);

code = code.replace(
  /<Card className="space-y-4">\s*<h3 className="text-base font-bold flex items-center gap-2 pb-3 border-b border-slate-100" style=\{\{ color: 'var\(--primary\)' \}\}>\s*<Palette className="w-5 h-5" \/>\s*Preferensi Tampilan\s*<\/h3>/,
  soundSection + `\n            <Card className="space-y-4">\n              <h3 className="text-base font-bold flex items-center gap-2 pb-3 border-b border-slate-100" style={{ color: 'var(--primary)' }}>\n                <Palette className="w-5 h-5" />\n                Preferensi Tampilan\n              </h3>`
);

fs.writeFileSync('src/components/settings-screen.tsx', code);
console.log("Patched settings");
