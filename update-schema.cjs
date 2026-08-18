const fs = require('fs');
let code = fs.readFileSync('src/db/schema.ts', 'utf8');

const newEmployees = `export const employees = pgTable('employees', {
  id: serial('id').primaryKey(),
  nik: text('nik').notNull().unique(),
  name: text('name').notNull(),
  jabatan: text('jabatan'),
  jobGrade: text('job_grade'),
  section: text('section'),
  gol: text('gol'),
  shift: text('shift'),
  poh: text('poh'),
  pt: text('pt'),
  statusMess: text('status_mess'),
  rotation: text('rotation'),
  tanggalAwalBergabung: text('tanggal_awal_bergabung'),
  tanggalBergabungTerbaru: text('tanggal_bergabung_terbaru'),
  statusKontrak: text('status_kontrak'),
  department: text('department'),
  position: text('position'),
  createdAt: timestamp('created_at').defaultNow(),
});`;

code = code.replace(
  /export const employees = pgTable\('employees', \{[\s\S]*?\}\);/,
  newEmployees
);

const newRoster = `export const roster = pgTable('roster', {
  id: serial('id').primaryKey(),
  nik: text('nik'),
  date: text('date'), // YYYY-MM-DD
  status: text('status'), // DS, NS, OFF, CT, etc
});`;

code = code.replace(
  /export const roster = pgTable\('roster', \{[\s\S]*?\}\);/,
  newRoster
);

fs.writeFileSync('src/db/schema.ts', code);
