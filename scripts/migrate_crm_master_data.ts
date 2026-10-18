import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

interface StandardItem {
  code: string;
  name: string;
  matrixType: 'SAPROLITE' | 'LIMONITE' | 'CRM' | 'BLANK';
  displayOrder: number;
  ev: Record<string, number>;
  stdevWdxrf: Record<string, number>;
}

const standardsData: StandardItem[] = [
  {
    code: 'OREAS70B',
    name: 'OREAS 70B',
    matrixType: 'CRM',
    displayOrder: 1,
    ev: { Ni:0.223, Co:0.008, Fe:5.51, CaO:4.30, SiO2:48.05, Al2O3:7.20, MgO:22.45, Cr2O3:0.18, MnO:0.15 },
    stdevWdxrf: { Ni:0.006, Co:0.001, Fe:0.09, CaO:0.03, SiO2:0.37, Al2O3:0.07, MgO:0.14, Cr2O3:0.01, MnO:0.005 }
  },
  {
    code: 'BRK03',
    name: 'BRK 03',
    matrixType: 'CRM',
    displayOrder: 2,
    ev: { Ni:0.285, Co:0.011, Fe:5.75, CaO:0.64, SiO2:41.51, Al2O3:0.66, MgO:40.08, Cr2O3:0.44, MnO:0.11 },
    stdevWdxrf: { Ni:0.004, Co:0.003, Fe:0.04, CaO:0.01, SiO2:0.12, Al2O3:0.02, MgO:0.18, Cr2O3:0.01, MnO:0.005 }
  },
  {
    code: 'OREAS182',
    name: 'OREAS 182',
    matrixType: 'CRM',
    displayOrder: 3,
    ev: { Ni:0.707, Co:0.073, Fe:20.56, CaO:0.25, SiO2:46.77, Al2O3:4.07, MgO:9.16, Cr2O3:1.29, MnO:0.58 },
    stdevWdxrf: { Ni:0.008, Co:0.002, Fe:0.11, CaO:0.01, SiO2:0.25, Al2O3:0.03, MgO:0.07, Cr2O3:0.01, MnO:0.01 }
  },
  {
    code: 'NILTRT11',
    name: 'NILTRT 11',
    matrixType: 'CRM',
    displayOrder: 4,
    ev: { Ni:0.740, Co:0.030, Fe:43.85, CaO:0.01, SiO2:3.36, Al2O3:11.62, MgO:0.81, Cr2O3:4.22, MnO:0.30 },
    stdevWdxrf: { Ni:0.010, Co:0.003, Fe:0.15, CaO:0.01, SiO2:0.08, Al2O3:0.08, MgO:0.03, Cr2O3:0.05, MnO:0.02 }
  },
  {
    code: 'OREAS184',
    name: 'OREAS 184',
    matrixType: 'CRM',
    displayOrder: 5,
    ev: { Ni:1.018, Co:0.090, Fe:27.48, CaO:0.22, SiO2:42.25, Al2O3:4.62, MgO:3.05, Cr2O3:1.75, MnO:0.68 },
    stdevWdxrf: { Ni:0.009, Co:0.001, Fe:0.14, CaO:0.01, SiO2:0.18, Al2O3:0.03, MgO:0.02, Cr2O3:0.01, MnO:0.01 }
  },
  {
    code: 'LIM13',
    name: 'LIM 13',
    matrixType: 'LIMONITE',
    displayOrder: 6,
    ev: { Ni:1.332, Co:0.184, Fe:48.96, CaO:0.03, SiO2:4.41, Al2O3:4.54, MgO:2.49, Cr2O3:3.35, MnO:1.48 },
    stdevWdxrf: { Ni:0.012, Co:0.003, Fe:0.11, CaO:0.005, SiO2:0.04, Al2O3:0.05, MgO:0.03, Cr2O3:0.05, MnO:0.02 }
  },
  {
    code: 'OB',
    name: 'OB',
    matrixType: 'LIMONITE',
    displayOrder: 7,
    ev: { Ni:1.351, Co:0.234, Fe:41.46, CaO:0.01, SiO2:9.10, Al2O3:4.03, MgO:7.01, Cr2O3:5.28, MnO:1.24 },
    stdevWdxrf: { Ni:0.011, Co:0.005, Fe:0.12, CaO:0.005, SiO2:0.04, Al2O3:0.03, MgO:0.03, Cr2O3:0.08, MnO:0.02 }
  },
  {
    code: 'OREAS187',
    name: 'OREAS 187',
    matrixType: 'CRM',
    displayOrder: 8,
    ev: { Ni:1.374, Co:0.064, Fe:13.60, CaO:0.34, SiO2:46.66, Al2O3:2.80, MgO:17.99, Cr2O3:0.99, MnO:0.36 },
    stdevWdxrf: { Ni:0.009, Co:0.001, Fe:0.07, CaO:0.005, SiO2:0.23, Al2O3:0.03, MgO:0.10, Cr2O3:0.01, MnO:0.005 }
  },
  {
    code: 'NILTRT45',
    name: 'NILTRT 45',
    matrixType: 'CRM',
    displayOrder: 9,
    ev: { Ni:1.442, Co:0.328, Fe:40.79, CaO:0.09, SiO2:11.72, Al2O3:5.85, MgO:3.53, Cr2O3:3.16, MnO:2.76 },
    stdevWdxrf: { Ni:0.012, Co:0.004, Fe:0.05, CaO:0.01, SiO2:0.04, Al2O3:0.03, MgO:0.02, Cr2O3:0.03, MnO:0.02 }
  },
  {
    code: 'OREAS189',
    name: 'OREAS 189',
    matrixType: 'CRM',
    displayOrder: 10,
    ev: { Ni:1.480, Co:0.033, Fe:10.52, CaO:0.33, SiO2:46.20, Al2O3:2.09, MgO:23.09, Cr2O3:0.76, MnO:0.23 },
    stdevWdxrf: { Ni:0.015, Co:0.001, Fe:0.07, CaO:0.01, SiO2:0.22, Al2O3:0.02, MgO:0.14, Cr2O3:0.01, MnO:0.005 }
  },
  {
    code: 'OREAS190',
    name: 'OREAS 190',
    matrixType: 'CRM',
    displayOrder: 11,
    ev: { Ni:1.636, Co:0.089, Fe:24.81, CaO:0.13, SiO2:38.22, Al2O3:6.00, MgO:6.91, Cr2O3:1.73, MnO:0.58 },
    stdevWdxrf: { Ni:0.012, Co:0.001, Fe:0.10, CaO:0.005, SiO2:0.17, Al2O3:0.05, MgO:0.06, Cr2O3:0.02, MnO:0.005 }
  },
  {
    code: 'LIM',
    name: 'LIM',
    matrixType: 'LIMONITE',
    displayOrder: 12,
    ev: { Ni:1.712, Co:0.246, Fe:23.90, CaO:0.01, SiO2:26.48, Al2O3:1.41, MgO:20.78, Cr2O3:2.29, MnO:0.51 },
    stdevWdxrf: { Ni:0.022, Co:0.005, Fe:0.11, CaO:0.005, SiO2:0.08, Al2O3:0.02, MgO:0.06, Cr2O3:0.02, MnO:0.01 }
  },
  {
    code: 'OREAS191',
    name: 'OREAS 191',
    matrixType: 'CRM',
    displayOrder: 13,
    ev: { Ni:1.753, Co:0.067, Fe:17.38, CaO:0.28, SiO2:47.97, Al2O3:4.27, MgO:10.06, Cr2O3:1.22, MnO:0.40 },
    stdevWdxrf: { Ni:0.017, Co:0.002, Fe:0.11, CaO:0.01, SiO2:0.26, Al2O3:0.03, MgO:0.08, Cr2O3:0.01, MnO:0.005 }
  },
  {
    code: 'OREAS192',
    name: 'OREAS 192',
    matrixType: 'CRM',
    displayOrder: 14,
    ev: { Ni:1.772, Co:0.040, Fe:12.66, CaO:0.31, SiO2:43.58, Al2O3:2.76, MgO:21.32, Cr2O3:0.91, MnO:0.28 },
    stdevWdxrf: { Ni:0.015, Co:0.001, Fe:0.06, CaO:0.01, SiO2:0.16, Al2O3:0.03, MgO:0.13, Cr2O3:0.01, MnO:0.005 }
  },
  {
    code: 'SAP16',
    name: 'SAP 16',
    matrixType: 'SAPROLITE',
    displayOrder: 15,
    ev: { Ni:1.767, Co:0.089, Fe:29.72, CaO:0.08, SiO2:21.50, Al2O3:3.42, MgO:15.44, Cr2O3:2.53, MnO:0.70 },
    stdevWdxrf: { Ni:0.014, Co:0.002, Fe:0.16, CaO:0.005, SiO2:0.08, Al2O3:0.03, MgO:0.10, Cr2O3:0.04, MnO:0.01 }
  },
  {
    code: 'OREAS193',
    name: 'OREAS 193',
    matrixType: 'CRM',
    displayOrder: 16,
    ev: { Ni:1.926, Co:0.050, Fe:13.64, CaO:0.36, SiO2:42.72, Al2O3:3.08, MgO:20.25, Cr2O3:0.96, MnO:0.32 },
    stdevWdxrf: { Ni:0.019, Co:0.001, Fe:0.07, CaO:0.005, SiO2:0.19, Al2O3:0.02, MgO:0.13, Cr2O3:0.01, MnO:0.005 }
  },
  {
    code: 'SAP19',
    name: 'SAP 19',
    matrixType: 'SAPROLITE',
    displayOrder: 17,
    ev: { Ni:2.029, Co:0.066, Fe:17.54, CaO:0.07, SiO2:31.54, Al2O3:1.70, MgO:25.21, Cr2O3:1.16, MnO:0.45 },
    stdevWdxrf: { Ni:0.017, Co:0.003, Fe:0.13, CaO:0.005, SiO2:0.06, Al2O3:0.02, MgO:0.12, Cr2O3:0.02, MnO:0.01 }
  },
  {
    code: 'OREAS194',
    name: 'OREAS 194',
    matrixType: 'CRM',
    displayOrder: 18,
    ev: { Ni:2.129, Co:0.043, Fe:11.52, CaO:0.31, SiO2:43.02, Al2O3:2.74, MgO:22.83, Cr2O3:0.82, MnO:0.26 },
    stdevWdxrf: { Ni:0.020, Co:0.001, Fe:0.06, CaO:0.01, SiO2:0.22, Al2O3:0.03, MgO:0.15, Cr2O3:0.01, MnO:0.005 }
  },
  {
    code: 'SAP',
    name: 'SAP',
    matrixType: 'SAPROLITE',
    displayOrder: 19,
    ev: { Ni:2.300, Co:0.129, Fe:9.91, CaO:0.01, SiO2:36.39, Al2O3:0.97, MgO:30.41, Cr2O3:1.98, MnO:0.22 },
    stdevWdxrf: { Ni:0.015, Co:0.003, Fe:0.11, CaO:0.005, SiO2:0.11, Al2O3:0.01, MgO:0.07, Cr2O3:0.02, MnO:0.005 }
  },
  {
    code: 'OREAS72B',
    name: 'OREAS 72B',
    matrixType: 'CRM',
    displayOrder: 20,
    ev: { Ni:0.709, Co:0.013, Fe:6.80, CaO:3.96, SiO2:51.27, Al2O3:8.98, MgO:15.93, Cr2O3:0.14, MnO:0.13 },
    stdevWdxrf: { Ni:0.018, Co:0.002, Fe:0.09, CaO:0.03, SiO2:0.29, Al2O3:0.14, MgO:0.16, Cr2O3:0.01, MnO:0.005 }
  },
  {
    code: 'OREAS185',
    name: 'OREAS 185',
    matrixType: 'CRM',
    displayOrder: 21,
    ev: { Ni:1.140, Co:0.039, Fe:12.88, CaO:0.38, SiO2:45.93, Al2O3:2.48, MgO:20.22, Cr2O3:0.91, MnO:0.30 },
    stdevWdxrf: { Ni:0.009, Co:0.001, Fe:0.07, CaO:0.01, SiO2:0.20, Al2O3:0.02, MgO:0.11, Cr2O3:0.01, MnO:0.005 }
  },
  {
    code: 'ZBK411',
    name: 'ZBK 411',
    matrixType: 'CRM',
    displayOrder: 22,
    ev: { Ni:1.170, Co:0.042, Fe:18.57, CaO:0.82, SiO2:37.41, Al2O3:2.90, MgO:20.75, Cr2O3:1.39, MnO:0.42 },
    stdevWdxrf: { Ni:0.012, Co:0.001, Fe:0.15, CaO:0.02, SiO2:0.49, Al2O3:0.04, MgO:0.26, Cr2O3:0.02, MnO:0.01 }
  }
];

async function runMigration() {
  console.log("=== MEMULAI MIGRASI MASTER CRM & STDEV WDXRF ===");

  // 1. Pastikan kolom stdev_wdxrf ada di tabel xrf_standard_references
  await db.execute(sql`
    ALTER TABLE xrf_standard_references 
    ADD COLUMN IF NOT EXISTS stdev_wdxrf DOUBLE PRECISION;
  `);

  // 2. Insert atau Update Standards di xrf_standards
  for (const std of standardsData) {
    // Insert code tanpa spasi dan dengan spasi jika perlu
    await db.execute(sql`
      INSERT INTO xrf_standards (code, name, matrix_type, display_order, is_active)
      VALUES (${std.code}, ${std.name}, ${std.matrixType}, ${std.displayOrder}, true)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        matrix_type = EXCLUDED.matrix_type,
        display_order = EXCLUDED.display_order;
    `);

    // Insert juga versi dengan spasi jika code != name
    if (std.code !== std.name) {
      await db.execute(sql`
        INSERT INTO xrf_standards (code, name, matrix_type, display_order, is_active)
        VALUES (${std.name}, ${std.name}, ${std.matrixType}, ${std.displayOrder}, true)
        ON CONFLICT (code) DO NOTHING;
      `);
    }

    // 3. Update atau Insert Nilai Referensi (EV & STDEV WDXRF)
    for (const [el, evVal] of Object.entries(std.ev)) {
      const wdxrfSigma = std.stdevWdxrf[el] !== undefined ? std.stdevWdxrf[el] : 0.010;
      
      // Ambil stdevFixed existing jika sudah ada di DB agar EDXRF tidak terganggu
      const existingRef = await db.execute(sql`
        SELECT stdev_fixed, lower_warning, upper_warning, lower_action, upper_action
        FROM xrf_standard_references
        WHERE standard_code = ${std.code} AND element_name = ${el}
        LIMIT 1
      `);

      let currentEdxrfSigma = 0.022;
      let lowerWarn: any = null;
      let upperWarn: any = null;
      let lowerAct: any = null;
      let upperAct: any = null;

      if (existingRef.rows.length > 0) {
        const row = existingRef.rows[0] as any;
        currentEdxrfSigma = Number(row.stdev_fixed) || wdxrfSigma;
        lowerWarn = row.lower_warning;
        upperWarn = row.upper_warning;
        lowerAct = row.lower_action;
        upperAct = row.upper_action;
      } else {
        // Standar baru (seperti BRK03, OREAS 70B, ZBK411)
        currentEdxrfSigma = wdxrfSigma;
        lowerWarn = Number((evVal - 2 * wdxrfSigma).toFixed(3));
        upperWarn = Number((evVal + 2 * wdxrfSigma).toFixed(3));
        lowerAct = Number((evVal - 3 * wdxrfSigma).toFixed(3));
        upperAct = Number((evVal + 3 * wdxrfSigma).toFixed(3));
      }

      // Khusus OREAS 182: update juga batas EDXRF karena nilai EV lamanya salah (1.0 vs 0.707)
      if (std.code === 'OREAS182') {
        lowerWarn = Number((evVal - 2 * currentEdxrfSigma).toFixed(3));
        upperWarn = Number((evVal + 2 * currentEdxrfSigma).toFixed(3));
        lowerAct = Number((evVal - 3 * currentEdxrfSigma).toFixed(3));
        upperAct = Number((evVal + 3 * currentEdxrfSigma).toFixed(3));
      }

      // Upsert code tanpa spasi
      await db.execute(sql`
        INSERT INTO xrf_standard_references (
          standard_code, element_name, nominal_value, stdev_fixed, stdev_wdxrf,
          lower_warning, upper_warning, lower_action, upper_action, updated_at
        )
        VALUES (
          ${std.code}, ${el}, ${evVal}, ${currentEdxrfSigma}, ${wdxrfSigma},
          ${lowerWarn}, ${upperWarn}, ${lowerAct}, ${upperAct}, NOW()
        )
        ON CONFLICT (standard_code, element_name) DO UPDATE SET
          nominal_value = EXCLUDED.nominal_value,
          stdev_wdxrf = EXCLUDED.stdev_wdxrf,
          lower_warning = EXCLUDED.lower_warning,
          upper_warning = EXCLUDED.upper_warning,
          lower_action = EXCLUDED.lower_action,
          upper_action = EXCLUDED.upper_action,
          updated_at = NOW();
      `);

      // Upsert juga untuk alias kode dengan spasi (misal: "OREAS 182", "BRK 03", "ZBK 411")
      if (std.code !== std.name) {
        await db.execute(sql`
          INSERT INTO xrf_standard_references (
            standard_code, element_name, nominal_value, stdev_fixed, stdev_wdxrf,
            lower_warning, upper_warning, lower_action, upper_action, updated_at
          )
          VALUES (
            ${std.name}, ${el}, ${evVal}, ${currentEdxrfSigma}, ${wdxrfSigma},
            ${lowerWarn}, ${upperWarn}, ${lowerAct}, ${upperAct}, NOW()
          )
          ON CONFLICT (standard_code, element_name) DO UPDATE SET
            nominal_value = EXCLUDED.nominal_value,
            stdev_wdxrf = EXCLUDED.stdev_wdxrf,
            lower_warning = EXCLUDED.lower_warning,
            upper_warning = EXCLUDED.upper_warning,
            lower_action = EXCLUDED.lower_action,
            upper_action = EXCLUDED.upper_action,
            updated_at = NOW();
        `);
      }
    }
    console.log(`[OK] Diproses: ${std.name} (${std.code}) -> EV & WDXRF STDEV berhasil dimutakhirkan`);
  }

  console.log("\n=== SELESAI: SEMUA MASTER DATA CRM & WDXRF STDEV BERHASIL DISINKRONISASI ===");
  process.exit(0);
}

runMigration().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
