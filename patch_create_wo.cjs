const fs = require('fs');
let code = fs.readFileSync('src/components/create-wo-screen.tsx', 'utf8');

// We will add a Tab selector for "WO Kerusakan" and "WO Permintaan".
// Instead of replacing the whole file, we will add a state and tabs.

const importsAdd = `import { CreateInternalTicketScreen } from './create-internal-ticket-screen';\n`;
code = importsAdd + code;

const stateAdd = `
  const [activeWoTab, setActiveWoTab] = useState<'kerusakan' | 'permintaan'>('kerusakan');
`;
code = code.replace('const [submitting, setSubmitting] = useState(false);', stateAdd + '\n  const [submitting, setSubmitting] = useState(false);');

const headerReplace = `
       <div className="px-1">
        <h2 className="text-2xl font-display font-semibold text-slate-800">Pembuatan WO</h2>
        <p className="text-sm text-slate-500 mt-1">Laporan kerusakan dan perbaikan ke tim Maintenance</p>
      </div>
`;
const newHeader = `
       <div className="px-1 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-display font-semibold text-slate-800">Pembuatan WO</h2>
          <p className="text-sm text-slate-500 mt-1">Form laporan kerusakan dan permintaan</p>
        </div>
      </div>
      
      <div className="flex gap-2 p-1 bg-slate-100 rounded-lg max-w-sm">
        <button 
          onClick={() => setActiveWoTab('kerusakan')}
          className={\`flex-1 py-2 text-sm font-semibold rounded-md transition-colors \${activeWoTab === 'kerusakan' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}\`}
        >
          WO Kerusakan
        </button>
        <button 
          onClick={() => setActiveWoTab('permintaan')}
          className={\`flex-1 py-2 text-sm font-semibold rounded-md transition-colors \${activeWoTab === 'permintaan' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}\`}
        >
          WO Permintaan
        </button>
      </div>
`;
code = code.replace(headerReplace, newHeader);

// Now wrap the form in `{activeWoTab === 'kerusakan' && (`
code = code.replace('<DevModeAccordion', '{activeWoTab === \'kerusakan\' && (\n      <>\n      <DevModeAccordion');
code = code.replace('</form>\n    </div>', '</form>\n      </>\n      )}\n      {activeWoTab === \'permintaan\' && <CreateInternalTicketScreen inspectorName={inspectorName} inspectorNik={inspectorNik} onBack={() => {}} />}\n    </div>');

fs.writeFileSync('src/components/create-wo-screen.tsx', code);
