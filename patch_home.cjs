const fs = require('fs');
let code = fs.readFileSync('src/components/home-screen.tsx', 'utf8');

const ticketButton = `                  <button onClick={() => handleNav('create-internal-ticket')} className="w-full flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm transition-all hover:border-indigo-400 text-left active:scale-[0.98]">
                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center shrink-0">
                      <Folder className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 leading-tight">Form Job Ticket Internal</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Request engineering, alat bantu, dll</p>
                    </div>
                  </button>
`;
code = code.replace(ticketButton, '');

code = code.replace('Pemantauan WO & Job Ticket', 'Pemantauan WO');

fs.writeFileSync('src/components/home-screen.tsx', code);
