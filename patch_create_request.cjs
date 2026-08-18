const fs = require('fs');
let code = fs.readFileSync('src/components/create-internal-ticket-screen.tsx', 'utf8');

code = code.replace('<button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">', '{onBack && <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">');
code = code.replace('<ChevronLeft className="w-6 h-6 text-slate-600" />\n          </button>', '<ChevronLeft className="w-6 h-6 text-slate-600" />\n          </button>}');
code = code.replace('export function CreateInternalTicketScreen({ inspectorName, inspectorNik, onBack }: { inspectorName: string, inspectorNik: string, onBack: () => void })', 'export function CreateInternalTicketScreen({ inspectorName, inspectorNik, onBack }: { inspectorName: string, inspectorNik: string, onBack?: () => void })');
code = code.replace('pb-24', 'pb-4'); // remove large bottom padding since it's inside a tab

fs.writeFileSync('src/components/create-internal-ticket-screen.tsx', code);
