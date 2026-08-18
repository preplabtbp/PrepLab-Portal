const fs = require('fs');
let code = fs.readFileSync('src/components/weekly-inspection-screen.tsx', 'utf8');

const oldSubmit = `        payload.signatures?.ttd2 || '',
        payload.signatures?.ttd3 || '',
        [], // no photos of findings yet
        payload.fotoProses`;

const newSubmit = `        payload.signatures?.ttd2 || '',
        payload.signatures?.ttd3 || '',
        payload.fotoTemuanArray || [], // photos of findings
        payload.fotoProses`;

code = code.replace(oldSubmit, newSubmit);
fs.writeFileSync('src/components/weekly-inspection-screen.tsx', code);
