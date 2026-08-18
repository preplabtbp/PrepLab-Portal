const fs = require('fs');

let code = fs.readFileSync('src/sheets-api.ts', 'utf8');

code = code.replace(/export const loginEmployee = async \(nik: string\) => \{ return \{ success: true, employee: null, error: undefined \}; \};/m, `export const loginEmployee = async (nik: string) => { 
  try {
    const res = await fetch('/api/employees');
    const data = await res.json();
    const employee = data.find((e: any) => e.nik === nik);
    if (employee) {
      return { success: true, employee: { ...employee, name: employee.name || employee.nama, jabatan: employee.position || employee.jabatan } };
    }
    return { success: false, error: 'NIK tidak ditemukan di database.' };
  } catch (err) {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
};`);

fs.writeFileSync('src/sheets-api.ts', code);
