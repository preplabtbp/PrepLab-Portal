const fs = require('fs');
const file = 'src/components/preplab-cloud-screen.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
    'className={`p-4 flex items-center gap-3 ${i !== filteredFiles.length - 1 ? \'border-b border-slate-100\' : \'\'}',
    'className={`p-4 flex items-center gap-3 first:rounded-t-xl last:rounded-b-xl ${i !== filteredFiles.length - 1 ? \'border-b border-slate-100\' : \'\'}'
);
fs.writeFileSync(file, content, 'utf8');
