import { db, pool } from '../src/db/index.js';
import { sql } from 'drizzle-orm';
import fs from 'fs';

interface StdDef {
  code: string;
  name: string;
  matrixType: string;
  displayOrder: number;
}

const standardsList: StdDef[] = [
  // Limonite Standards
  { code: 'LIM01', name: 'LIM 01', matrixType: 'LIMONITE', displayOrder: 1 },
  { code: 'LIM02', name: 'LIM 02', matrixType: 'LIMONITE', displayOrder: 2 },
  { code: 'LIM03', name: 'LIM 03', matrixType: 'LIMONITE', displayOrder: 3 },
  { code: 'LIM04', name: 'LIM 04', matrixType: 'LIMONITE', displayOrder: 4 },
  { code: 'LIM05', name: 'LIM 05', matrixType: 'LIMONITE', displayOrder: 5 },
  // Saprolite Standards in exact order
  { code: 'OREAS184', name: 'OREAS 184', matrixType: 'CRM', displayOrder: 6 },
  { code: 'OREAS187', name: 'OREAS 187', matrixType: 'CRM', displayOrder: 7 },
  { code: 'OREAS189', name: 'OREAS 189', matrixType: 'CRM', displayOrder: 8 },
  { code: 'OREAS190', name: 'OREAS 190', matrixType: 'CRM', displayOrder: 9 },
  { code: 'LIM',      name: 'LIM',       matrixType: 'CRM', displayOrder: 10 },
  { code: 'SAP16',    name: 'SAP 16',    matrixType: 'SAPROLITE', displayOrder: 11 },
  { code: 'OREAS193', name: 'OREAS 193', matrixType: 'CRM', displayOrder: 12 },
  { code: 'SAP19',    name: 'SAP 19',    matrixType: 'SAPROLITE', displayOrder: 13 },
  { code: 'OREAS194', name: 'OREAS 194', matrixType: 'CRM', displayOrder: 14 },
  { code: 'SAP',      name: 'SAP',       matrixType: 'SAPROLITE', displayOrder: 15 },
  // Additional historical standards
  { code: 'OREAS191', name: 'OREAS 191', matrixType: 'CRM', displayOrder: 16 },
  { code: 'OREAS192', name: 'OREAS 192', matrixType: 'CRM', displayOrder: 17 },
  { code: 'OREAS195', name: 'OREAS 195', matrixType: 'CRM', displayOrder: 18 },
  { code: 'OREAS182', name: 'OREAS 182', matrixType: 'CRM', displayOrder: 19 },
];

// Exact nominals from Gambar 3
const exactNominalsFromImage3: Record<string, Record<string, number>> = {
  LIM01: {
    Ni: 1.11725000000000,
    Co: 0.14085000000000,
    Fe: 47.598164335664300,
    CaO: 0.02800000000000,
    SiO2: 6.80700000000000,
    Al2O3: 4.42075000000000,
    MgO: 3.14575000000000,
    Cr2O3: 2.30330000000000,
    MnO: 1.07400000000000,
    P: 0.003,
    S: 0.149,
  },
  LIM02: {
    Ni: 1.20437500000000,
    Co: 0.13262500000000,
    Fe: 45.625786713286700,
    CaO: 0.05700000000000,
    SiO2: 8.86475000000000,
    Al2O3: 3.50150000000000,
    MgO: 4.94500000000000,
    Cr2O3: 2.16205000000000,
    MnO: 1.01075000000000,
    P: 0.003,
    S: 0.120,
  },
  LIM03: {
    Ni: 1.29237500000000,
    Co: 0.13595000000000,
    Fe: 45.277597902097900,
    CaO: 0.04800000000000,
    SiO2: 8.54850000000000,
    Al2O3: 4.20275000000000,
    MgO: 4.83850000000000,
    Cr2O3: 2.04675000000000,
    MnO: 1.00825000000000,
    P: 0.002,
    S: 0.131,
  },
  LIM04: {
    Ni: 1.40777500000000,
    Co: 0.12490000000000,
    Fe: 42.6509545454500,
    CaO: 0.05900000000000,
    SiO2: 10.83500000000000,
    Al2O3: 3.86200000000000,
    MgO: 6.92075000000000,
    Cr2O3: 1.91815000000000,
    MnO: 0.86925000000000,
    P: 0.003,
    S: 0.130,
  },
  LIM05: {
    Ni: 1.49747500000000,
    Co: 0.12362500000000,
    Fe: 36.994860139860100,
    CaO: 0.07825000000000,
    SiO2: 15.26900000000000,
    Al2O3: 3.54525000000000,
    MgO: 10.92925000000000,
    Cr2O3: 1.91680000000000,
    MnO: 0.85275000000000,
    P: 0.003,
    S: 0.098,
  },
  OREAS184: {
    Ni: 1.02000000000000,
    Co: 0.09030000000000,
    Fe: 27.510000000000000,
    CaO: 0.21600000000000,
    SiO2: 42.25000000000000,
    Al2O3: 4.62000000000000,
    MgO: 3.05000000000000,
    Cr2O3: 1.75000000000000,
    MnO: 0.67600000000000,
  },
  OREAS187: {
    Ni: 1.37000000000000,
    Co: 0.06360000000000,
    Fe: 13.601398601398600,
    CaO: 0.34100000000000,
    SiO2: 46.66000000000000,
    Al2O3: 2.80000000000000,
    MgO: 17.99000000000000,
    Cr2O3: 0.98690000000000,
    MnO: 0.35600000000000,
  },
  OREAS189: {
    Ni: 1.48000000000000,
    Co: 0.03260000000000,
    Fe: 10.520000000000000,
    CaO: 0.33000000000000,
    SiO2: 46.20000000000000,
    Al2O3: 2.09000000000000,
    MgO: 23.09000000000000,
    Cr2O3: 0.76000000000000,
    MnO: 0.23000000000000,
  },
  OREAS190: {
    Ni: 1.64000000000000,
    Co: 0.09000000000000,
    Fe: 24.840000000000000,
    CaO: 0.13000000000000,
    SiO2: 38.22000000000000,
    Al2O3: 6.00000000000000,
    MgO: 6.91000000000000,
    Cr2O3: 1.73000000000000,
    MnO: 0.58000000000000,
  },
  LIM: {
    Ni: 1.71240000000000,
    Co: 0.24600000000000,
    Fe: 23.896400000000000,
    CaO: 0.011428571428571,
    SiO2: 26.47600000000000,
    Al2O3: 1.41400000000000,
    MgO: 20.78280000000000,
    Cr2O3: 2.29160000000000,
    MnO: 0.50720000000000,
  },
  SAP16: {
    Ni: 1.76700000000000,
    Co: 0.08900000000000,
    Fe: 29.750000000000000,
    CaO: 0.08000000000000,
    SiO2: 21.50000000000000,
    Al2O3: 3.42000000000000,
    MgO: 15.44000000000000,
    Cr2O3: 2.52800000000000,
    MnO: 0.70400000000000,
  },
  OREAS193: {
    Ni: 1.93000000000000,
    Co: 0.04950000000000,
    Fe: 13.657000000000000,
    CaO: 0.36200000000000,
    SiO2: 42.72000000000000,
    Al2O3: 3.08000000000000,
    MgO: 20.25000000000000,
    Cr2O3: 0.96200000000000,
    MnO: 0.31700000000000,
  },
  SAP19: {
    Ni: 2.03000000000000,
    Co: 0.06600000000000,
    Fe: 17.556000000000000,
    CaO: 0.06758300000000,
    SiO2: 31.54000000000000,
    Al2O3: 1.70000000000000,
    MgO: 25.21000000000000,
    Cr2O3: 1.16400000000000,
    MnO: 0.45000000000000,
  },
  OREAS194: {
    Ni: 2.13000000000000,
    Co: 0.04280000000000,
    Fe: 11.529000000000000,
    CaO: 0.31100000000000,
    SiO2: 43.02000000000000,
    Al2O3: 2.74000000000000,
    MgO: 22.83000000000000,
    Cr2O3: 0.81900000000000,
    MnO: 0.26100000000000,
  },
  SAP: {
    Ni: 2.300370370370,
    Co: 0.13000000000000,
    Fe: 9.910000000000000,
    CaO: 0.01000000000000,
    SiO2: 36.39000000000000,
    Al2O3: 0.97000000000000,
    MgO: 30.41000000000000,
    Cr2O3: 1.98000000000000,
    MnO: 0.22000000000000,
  },
};

// CSV Limits Data
const csvLimitsRaw = `
LIM01,1.0725,0.1023,46.9294,0.009,6.5157,4.0386,2.9329,2.1034,0.9968,,LIM01,1.162,0.179,48.27,0.05,7.1,4.8,3.36,2.5,1.15,,LIM01,1.05,0.083,46.59,0,6.37,3.85,2.83,2,0.96,,LIM01,1.184,0.199,48.6,0.06,7.24,4.99,3.47,2.6,1.19
LIM02,1.1616,0.0937,45.03,0.0397,8.4657,3.0855,4.6926,2.029,0.9499,,LIM02,1.247,0.172,46.22,0.07,9.26,3.92,5.2,2.3,1.07,,LIM02,1.14,0.074,44.73,0.03,8.27,2.88,4.57,1.96,0.92,,LIM02,1.269,0.191,46.52,0.08,9.46,4.13,5.32,2.36,1.1
LIM03,1.2418,0.1017,44.8436,0.0279,8.1534,3.8325,4.5819,1.9404,0.9472,,LIM03,1.343,0.17,45.71,0.07,8.94,4.57,5.1,2.15,1.07,,LIM03,1.217,0.085,44.63,0.02,7.96,3.65,4.45,1.89,0.92,,LIM03,1.368,0.187,45.93,0.08,9.14,4.76,5.22,2.21,1.1
LIM04,1.3557,0.0888,42.1744,0.042,10.3313,3.4545,6.493,1.823,0.8201,,LIM04,1.46,0.161,43.13,0.08,11.34,4.27,7.35,2.01,0.92,,LIM04,1.33,0.071,41.94,0.03,10.08,3.25,6.28,1.78,0.8,,LIM04,1.486,0.179,43.37,0.08,11.59,4.47,7.56,2.06,0.94
LIM05,1.4363,0.0905,36.3983,0.0623,14.5682,3.1618,10.521,1.8262,0.8166,,LIM05,1.559,0.157,37.59,0.09,15.97,3.93,11.34,2.01,0.89,,LIM05,1.406,0.074,36.1,0.05,14.22,2.97,10.32,1.78,0.8,,LIM05,1.589,0.173,37.89,0.1,16.32,4.12,11.54,2.05,0.91
OREAS184,0.9819,0.077,26.5106,0.1725,37.3771,3.8289,2.2337,1.6907,0.6414,,OREAS184,1.058,0.104,28.51,0.26,47.12,5.41,3.87,1.81,0.71,,OREAS184,0.963,0.07,26.01,0.15,34.94,3.43,1.83,1.66,0.62,,OREAS184,1.077,0.11,29.01,0.28,49.56,5.81,4.27,1.84,0.73
OREAS187,1.3254,0.0549,13.411,0.3249,42.3331,2.589,17.3638,0.9452,0.3328,,OREAS187,1.415,0.072,13.79,0.36,50.99,3.01,18.62,1.03,0.38,,OREAS187,1.303,0.051,13.32,0.32,40.17,2.48,17.05,0.92,0.32,,OREAS187,1.437,0.077,13.89,0.37,53.15,3.12,18.93,1.05,0.39
OREAS189,1.4407,0.0279,10.2321,0.3034,42.6479,1.8843,21.2122,0.7215,0.2173,,OREAS189,1.519,0.037,10.8,0.35,49.75,2.3,24.97,0.81,0.24,,OREAS189,1.421,0.026,10.09,0.29,40.87,1.78,20.27,0.7,0.21,,OREAS189,1.539,0.04,10.95,0.36,51.53,2.4,25.91,0.83,0.24
OREAS190,1.5871,0.078,24.1305,0.1155,35.0158,5.5725,6.3282,1.659,0.5527,,OREAS190,1.693,0.1,25.54,0.15,41.42,6.43,7.49,1.79,0.6,,OREAS190,1.561,0.072,23.78,0.11,33.41,5.36,6.04,1.63,0.54,,OREAS190,1.719,0.106,25.89,0.16,43.03,6.64,7.78,1.83,0.61
LIM,1.6855,0.196,23.2424,-0.0016,23.2488,1.1806,17.9246,2.1421,0.4833,,LIM,1.739,0.296,24.55,0.02,29.7,1.65,23.64,2.44,0.53,,LIM,1.672,0.171,22.92,-0.01,21.64,1.06,16.5,2.07,0.47,,LIM,1.753,0.321,24.88,0.03,31.32,1.76,25.07,2.52,0.54
SAP16,1.7368,0.0659,28.8062,0.0678,19.4399,2.9857,13.5459,2.3784,0.6656,,SAP16,1.803,0.114,30.69,0.09,23.56,3.85,17.33,2.68,0.73,,SAP16,1.72,0.054,28.33,0.06,18.41,2.77,12.6,2.3,0.65,,SAP16,1.82,0.126,31.17,0.1,24.59,4.07,18.28,2.76,0.75
OREAS193,1.8986,0.0308,13.1585,0.3353,39.5677,2.7187,17.9504,0.8959,0.3028,,OREAS193,1.961,0.068,14.16,0.39,45.87,3.44,22.55,1.03,0.33,,OREAS193,1.883,0.022,12.91,0.32,37.99,2.54,16.8,0.86,0.3,,OREAS193,1.977,0.077,14.4,0.4,47.45,3.62,23.7,1.06,0.34
SAP19,1.9973,0.0519,17.0936,0.0512,28.9113,1.4346,22.7618,1.1069,0.4321,,SAP19,2.063,0.088,18.03,0.09,34.17,1.97,27.66,1.21,0.47,,SAP19,1.981,0.043,16.86,0.04,27.6,1.3,21.54,1.08,0.42,,SAP19,2.079,0.097,18.26,0.1,35.48,2.1,28.88,1.24,0.48
OREAS194,2.0996,0.0279,11.1331,0.2897,40.3036,2.4162,21.2963,0.7607,0.2486,,OREAS194,2.16,0.058,11.92,0.33,45.74,3.06,24.36,0.88,0.27,,OREAS194,2.084,0.02,10.94,0.28,38.95,2.25,20.53,0.73,0.24,,OREAS194,2.176,0.065,12.12,0.34,47.09,3.23,25.13,0.91,0.28
SAP,2.2404,0.0843,9.5906,-0.0026,31.9444,0.795,26.4299,1.8911,0.1985,,SAP,2.36,0.176,10.23,0.02,40.84,1.14,34.39,2.07,0.24,,SAP,2.211,0.061,9.43,-0.01,29.72,0.71,24.44,1.85,0.19,,SAP,2.389,0.199,10.39,0.03,43.06,1.23,36.38,2.11,0.25
`;

async function main() {
  console.log("=== UPDATING XRF STANDARDS & REFERENCES WITH EXACT VALUES ===");

  // 1. Ensure columns in table
  await db.execute(sql`
    ALTER TABLE xrf_standard_references 
    ADD COLUMN IF NOT EXISTS lower_warning DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS upper_warning DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS lower_action DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS upper_action DOUBLE PRECISION;
  `);

  // 2. Insert/Update Standards
  for (const std of standardsList) {
    await db.execute(sql`
      INSERT INTO xrf_standards (code, name, matrix_type, display_order, is_active)
      VALUES (${std.code}, ${std.name}, ${std.matrixType}, ${std.displayOrder}, true)
      ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          matrix_type = EXCLUDED.matrix_type,
          display_order = EXCLUDED.display_order;
    `);
  }
  console.log(`Updated ${standardsList.length} standards.`);

  // 3. Parse CSV rows
  const elems = ['Ni', 'Co', 'Fe', 'CaO', 'SiO2', 'Al2O3', 'MgO', 'Cr2O3', 'MnO'];
  const lines = csvLimitsRaw.split('\n').map(l => l.trim()).filter(Boolean);
  let updatedCount = 0;

  for (const line of lines) {
    const parts = line.split(',');
    const code = parts[0];
    const m2 = parts.slice(1, 10).map(Number);
    const p2 = parts.slice(12, 21).map(Number);
    const m3 = parts.slice(23, 32).map(Number);
    const p3 = parts.slice(34, 43).map(Number);

    const stdNominals = exactNominalsFromImage3[code] || {};

    for (let i = 0; i < elems.length; i++) {
      const el = elems[i];
      const nominal = stdNominals[el];
      const lowerWarning = m2[i];
      const upperWarning = p2[i];
      const lowerAction = m3[i];
      const upperAction = p3[i];

      if (nominal === undefined || isNaN(lowerWarning)) continue;

      const stdev = Number(((upperAction - lowerAction) / 6).toFixed(6));

      await db.execute(sql`
        INSERT INTO xrf_standard_references (
          standard_code, element_name, nominal_value, stdev_fixed,
          lower_warning, upper_warning, lower_action, upper_action,
          warning_sigma, action_sigma, extreme_sigma, updated_at
        )
        VALUES (
          ${code}, ${el}, ${nominal}, ${stdev},
          ${lowerWarning}, ${upperWarning}, ${lowerAction}, ${upperAction},
          2.0, 3.0, 5.0, NOW()
        )
        ON CONFLICT (standard_code, element_name) DO UPDATE
        SET nominal_value = EXCLUDED.nominal_value,
            stdev_fixed = EXCLUDED.stdev_fixed,
            lower_warning = EXCLUDED.lower_warning,
            upper_warning = EXCLUDED.upper_warning,
            lower_action = EXCLUDED.lower_action,
            upper_action = EXCLUDED.upper_action,
            warning_sigma = EXCLUDED.warning_sigma,
            action_sigma = EXCLUDED.action_sigma,
            extreme_sigma = EXCLUDED.extreme_sigma,
            updated_at = NOW();
      `);

      updatedCount++;
    }

    // Default P & S if limonite
    if (code.startsWith('LIM') && code !== 'LIM') {
      const pNominal = code === 'LIM03' ? 0.002 : 0.003;
      const sNominal = code === 'LIM01' ? 0.149 : code === 'LIM02' ? 0.120 : code === 'LIM03' ? 0.131 : code === 'LIM04' ? 0.130 : 0.098;
      
      await db.execute(sql`
        INSERT INTO xrf_standard_references (standard_code, element_name, nominal_value, stdev_fixed, lower_warning, upper_warning, lower_action, upper_action, warning_sigma, action_sigma, extreme_sigma, updated_at)
        VALUES (${code}, 'P', ${pNominal}, 0.001, ${pNominal - 0.002}, ${pNominal + 0.002}, ${pNominal - 0.003}, ${pNominal + 0.003}, 2.0, 3.0, 5.0, NOW())
        ON CONFLICT (standard_code, element_name) DO UPDATE
        SET nominal_value = EXCLUDED.nominal_value, stdev_fixed = EXCLUDED.stdev_fixed, lower_warning = EXCLUDED.lower_warning, upper_warning = EXCLUDED.upper_warning, lower_action = EXCLUDED.lower_action, upper_action = EXCLUDED.upper_action;
      `);

      await db.execute(sql`
        INSERT INTO xrf_standard_references (standard_code, element_name, nominal_value, stdev_fixed, lower_warning, upper_warning, lower_action, upper_action, warning_sigma, action_sigma, extreme_sigma, updated_at)
        VALUES (${code}, 'S', ${sNominal}, 0.007, ${sNominal - 0.014}, ${sNominal + 0.014}, ${sNominal - 0.021}, ${sNominal + 0.021}, 2.0, 3.0, 5.0, NOW())
        ON CONFLICT (standard_code, element_name) DO UPDATE
        SET nominal_value = EXCLUDED.nominal_value, stdev_fixed = EXCLUDED.stdev_fixed, lower_warning = EXCLUDED.lower_warning, upper_warning = EXCLUDED.upper_warning, lower_action = EXCLUDED.lower_action, upper_action = EXCLUDED.upper_action;
      `);
      updatedCount += 2;
    }
  }

  console.log(`Successfully updated ${updatedCount} parameters in xrf_standard_references!`);

  const summary = await db.execute(sql`
    SELECT standard_code, count(*) as count, 
           round(min(nominal_value)::numeric, 3) as min_nom,
           round(max(nominal_value)::numeric, 3) as max_nom
    FROM xrf_standard_references
    GROUP BY standard_code
    ORDER BY standard_code;
  `);
  console.table(summary.rows);

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
