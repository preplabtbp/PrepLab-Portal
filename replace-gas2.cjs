const fs = require('fs');
let code = fs.readFileSync('src/sheets-api.ts', 'utf8');

// Replace everything with mock fetch endpoints or real fetch endpoints

// 1. inspections
code = code.replace(/export const submitInspeksiUniversal[\s\S]*?^\}/m, `export const submitInspeksiUniversal = async (finalData: any, ttd1: string, ttd2: string, ttd3: string, fotoTemuanArray: string[], fotoProses: string) => {
  const res = await fetch('/api/inspections/universal', { method: 'POST', body: JSON.stringify({ finalData }) });
  return await res.json();
}`);

code = code.replace(/export const submitInspeksi =[\s\S]*?^\}/m, `export const submitInspeksi = async (dataF: any[][], ttd1: string, ttd2: string, ttd3: string, fotoProses: string, devOptions: any) => {
  const res = await fetch('/api/inspections', { method: 'POST', body: JSON.stringify({ dataF }) });
  return await res.json();
}`);

code = code.replace(/export const getMasterPertanyaan[\s\S]*?^\}/m, `export const getMasterPertanyaan = async () => {
  const res = await fetch('/api/questions');
  return await res.json();
}`);

// 2. Pemantauan
code = code.replace(/export const submitPemantauanBatch[\s\S]*?^\}/m, `export const submitPemantauanBatch = async (data: any) => {
  const res = await fetch('/api/pemantauan', { method: 'POST', body: JSON.stringify(data) });
  return await res.json();
}`);
code = code.replace(/export const getRekapanPemantauan[\s\S]*?^\}/m, `export const getRekapanPemantauan = async (tglMulai: string, tglAkhir: string) => {
  return [];
}`);
code = code.replace(/export const buatPdfRekapan[\s\S]*?^\}/m, `export const buatPdfRekapan = async (tglMulai: string, tglAkhir: string, tipeLaporan: string) => {
  return { url: "https://via.placeholder.com/150" };
}`);

// 3. APD
code = code.replace(/export const getApdSettings[\s\S]*?^\}/m, `export const getApdSettings = async () => {
  const res = await fetch('/api/apd/settings');
  return await res.json();
}`);
code = code.replace(/export const saveApdSettings[\s\S]*?^\}/m, `export const saveApdSettings = async (intervals: Record<string, number>) => {
  const res = await fetch('/api/apd/settings', { method: 'POST', body: JSON.stringify(intervals) });
  return await res.json();
}`);
code = code.replace(/export const getApdHistoryByNik[\s\S]*?^\}/m, `export const getApdHistoryByNik = async (nik: string) => {
  const res = await fetch('/api/apd/history');
  return await res.json();
}`);
code = code.replace(/export const recordApdTakes[\s\S]*?^\}/m, `export const recordApdTakes = async (nik: string, nama: string, entries: any[], pdfUrl\?: string) => {
  const res = await fetch('/api/apd/history', { method: 'POST', body: JSON.stringify({ entries }) });
  return await res.json();
}`);
code = code.replace(/export const getPendingApdDocuments[\s\S]*?^\}/m, `export const getPendingApdDocuments = async () => {
  const res = await fetch('/api/apd/documents');
  return await res.json();
}`);
code = code.replace(/export const signApdDocument[\s\S]*?^\}/m, `export const signApdDocument = async (docId: string, role: 'spt' | 'manager', signatureData: string) => {
  const res = await fetch('/api/apd/documents', { method: 'POST', body: JSON.stringify({ docId, signatureData }) });
  return await res.json();
}`);
code = code.replace(/export const generateApdDocument[\s\S]*?^\}/m, `export const generateApdDocument = async (data: any) => {
  return { url: "https://via.placeholder.com/150" };
}`);
code = code.replace(/export const uploadApdProof[\s\S]*?^\}/m, `export const uploadApdProof = async (nik: string, apd: string, date: string, base64: string, fileName: string) => {
  return "https://via.placeholder.com/150";
}`);
code = code.replace(/export const uploadDocumentProof[\s\S]*?^\}/m, `export const uploadDocumentProof = async (docId: string, base64: string, fileName: string) => {
  return "https://via.placeholder.com/150";
}`);

// 4. Photos and misc
code = code.replace(/export const getGalleryPhotos[\s\S]*?^\}/m, `export const getGalleryPhotos = async () => {
  return [];
}`);

code = code.replace(/export const triggerReminderManual[\s\S]*?^\}/m, `export const triggerReminderManual = async (devOpt: any) => {
  return { status: "ok" };
}`);

code = code.replace(/export const triggerRutinitasJumatManual[\s\S]*?^\}/m, `export const triggerRutinitasJumatManual = async (devOpt: any) => {
  return { status: "ok" };
}`);

code = code.replace(/export const appendRowsToSheet[\s\S]*?^\}/m, `export const appendRowsToSheet = async (sheetName: string, rows: any[][], devOptions\?: any) => {
  console.log("appendRowsToSheet called but ignored (no GAS)");
}`);

code = code.replace(/export const updateToolPhotoUrl[\s\S]*?^\}/m, `export const updateToolPhotoUrl = async (sheetOrigin: string, rowIndex: number, photoUrl: string) => {
  console.log("updateToolPhotoUrl called but ignored (no GAS)");
}`);

code = code.replace(/export const addEmployee[\s\S]*?^\}/m, `export const addEmployee = async (employee: { nama: string, jabatan: string, divisi: string, grup: string, nik: string }) => {
  const res = await fetch('/api/employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: employee.nama, position: employee.jabatan, department: employee.divisi, nik: employee.nik }) });
  return await res.json();
}`);

// Finally remove the generic gasRequest functions
code = code.replace(/export async function gasRequest[\s\S]*?(?=export const getEmployees)/m, '');

fs.writeFileSync('src/sheets-api.ts', code);
