import { Router } from "express";
import Papa from "papaparse";
import { db } from "../../src/db/index.js";
import { eq, desc, asc, and, or, gte, lte, sql } from "drizzle-orm";
import {
  xrfInstruments,
  xrfStandards,
  xrfStandardReferences,
  xrfVerifications,
  xrfVerificationItems
} from "../../src/db/schema.js";

export const xrfRouter = Router();

// Flag migration status
let xrfTablesEnsured = false;

export async function ensureXrfTables() {
  if (xrfTablesEnsured) return;
  try {
    // 1. Table Instruments
    await db.execute(sql`CREATE TABLE IF NOT EXISTS xrf_instruments (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      brand_model TEXT DEFAULT 'PANalytical Epsilon 4',
      channel_type TEXT DEFAULT 'LIMONITE',
      color_tag TEXT DEFAULT 'cyan',
      site TEXT DEFAULT 'GTS',
      method_type TEXT DEFAULT 'EDXRF',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    );`);
    await db.execute(sql`ALTER TABLE xrf_instruments ADD COLUMN IF NOT EXISTS site TEXT DEFAULT 'GTS';`);
    await db.execute(sql`ALTER TABLE xrf_instruments ADD COLUMN IF NOT EXISTS method_type TEXT DEFAULT 'EDXRF';`);

    // 2. Table Standards
    await db.execute(sql`CREATE TABLE IF NOT EXISTS xrf_standards (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      matrix_type TEXT DEFAULT 'LIMONITE',
      certificate_date TEXT,
      is_active BOOLEAN DEFAULT true,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );`);

    // 3. Table Standard References (Expected & Fixed STDEV)
    await db.execute(sql`CREATE TABLE IF NOT EXISTS xrf_standard_references (
      id SERIAL PRIMARY KEY,
      standard_id INTEGER,
      standard_code TEXT NOT NULL,
      element_name TEXT NOT NULL,
      nominal_value DOUBLE PRECISION NOT NULL,
      stdev_fixed DOUBLE PRECISION NOT NULL,
      lower_warning DOUBLE PRECISION,
      upper_warning DOUBLE PRECISION,
      lower_action DOUBLE PRECISION,
      upper_action DOUBLE PRECISION,
      warning_sigma DOUBLE PRECISION DEFAULT 2.0,
      action_sigma DOUBLE PRECISION DEFAULT 3.0,
      extreme_sigma DOUBLE PRECISION DEFAULT 5.0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`);
    await db.execute(sql`
      ALTER TABLE xrf_standard_references 
      ADD COLUMN IF NOT EXISTS lower_warning DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS upper_warning DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS lower_action DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS upper_action DOUBLE PRECISION;
    `);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_xrf_std_ref_code_elem ON xrf_standard_references(standard_code, element_name);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_xrf_std_ref_std ON xrf_standard_references(standard_code);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_xrf_std_ref_elem ON xrf_standard_references(element_name);`);

    // 4. Table Header Verifications
    await db.execute(sql`CREATE TABLE IF NOT EXISTS xrf_verifications (
      id SERIAL PRIMARY KEY,
      batch_code TEXT NOT NULL,
      instrument_id INTEGER,
      instrument_code TEXT NOT NULL,
      instrument_name TEXT NOT NULL,
      verification_date TEXT NOT NULL,
      verification_time TEXT,
      shift TEXT DEFAULT '1',
      week_no INTEGER,
      operator_nik TEXT,
      operator_name TEXT,
      overall_status TEXT DEFAULT 'PASS',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_xrf_verifications_date ON xrf_verifications(verification_date);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_xrf_verifications_inst ON xrf_verifications(instrument_code);`);

    // 5. Table Items
    await db.execute(sql`CREATE TABLE IF NOT EXISTS xrf_verification_items (
      id SERIAL PRIMARY KEY,
      verification_id INTEGER,
      standard_id INTEGER,
      standard_code TEXT NOT NULL,
      sample_label TEXT,
      sequence_no INTEGER DEFAULT 1,
      analyzed_at TEXT,
      ni DOUBLE PRECISION,
      co DOUBLE PRECISION,
      fe DOUBLE PRECISION,
      cao DOUBLE PRECISION,
      sio2 DOUBLE PRECISION,
      al2o3 DOUBLE PRECISION,
      mgo DOUBLE PRECISION,
      p DOUBLE PRECISION,
      s DOUBLE PRECISION,
      cr2o3 DOUBLE PRECISION,
      mno DOUBLE PRECISION,
      bc DOUBLE PRECISION,
      fe_ni DOUBLE PRECISION,
      sum_conc DOUBLE PRECISION,
      evaluations JSONB,
      item_status TEXT DEFAULT 'PASS',
      created_at TIMESTAMP DEFAULT NOW()
    );`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_xrf_ver_items_ver_id ON xrf_verification_items(verification_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_xrf_ver_items_std_code ON xrf_verification_items(standard_code);`);

    // Auto Seed Initial Master Data jika masih kosong
    await seedInitialXrfData();

    xrfTablesEnsured = true;
  } catch (err: any) {
    console.error("[XRF] Failed to ensure tables:", err.message);
  }
}

async function seedInitialXrfData() {
  try {
    // 1. Seed Instruments for GTS and TBP/GPS
    const defaultInstruments = [
      // GTS - EDXRF
      { code: 'EPSILON_A', name: 'EPSILON A', brandModel: 'PANalytical Epsilon 4', channelType: 'ALL', colorTag: 'cyan', site: 'GTS', methodType: 'EDXRF' },
      { code: 'EPSILON_B', name: 'EPSILON B', brandModel: 'PANalytical Epsilon 4', channelType: 'ALL', colorTag: 'purple', site: 'GTS', methodType: 'EDXRF' },
      { code: 'EPSILON_D', name: 'EPSILON D', brandModel: 'PANalytical Epsilon 4', channelType: 'ALL', colorTag: 'amber', site: 'GTS', methodType: 'EDXRF' },
      // GTS - WDXRF
      { code: 'SUPERMINI', name: 'Supermini', brandModel: 'Rigaku Supermini200', channelType: 'ALL', colorTag: 'blue', site: 'GTS', methodType: 'WDXRF' },

      // TBP/GPS - EDXRF
      { code: 'EPSILON_C', name: 'EPSILON C', brandModel: 'PANalytical Epsilon 4', channelType: 'ALL', colorTag: 'teal', site: 'TBP', methodType: 'EDXRF' },
      { code: 'EPSILON_E', name: 'EPSILON E', brandModel: 'PANalytical Epsilon 4', channelType: 'ALL', colorTag: 'orange', site: 'TBP', methodType: 'EDXRF' },
      { code: 'EPSILON_F', name: 'EPSILON F', brandModel: 'PANalytical Epsilon 4', channelType: 'ALL', colorTag: 'rose', site: 'TBP', methodType: 'EDXRF' },
      { code: 'EPSILON_G', name: 'EPSILON G', brandModel: 'PANalytical Epsilon 4', channelType: 'ALL', colorTag: 'emerald', site: 'TBP', methodType: 'EDXRF' },
      { code: 'EPSILON_H', name: 'EPSILON H', brandModel: 'PANalytical Epsilon 4', channelType: 'ALL', colorTag: 'indigo', site: 'TBP', methodType: 'EDXRF' },
      { code: 'S2_PUMA', name: 'S2 PUMA', brandModel: 'Bruker S2 PUMA', channelType: 'ALL', colorTag: 'violet', site: 'TBP', methodType: 'EDXRF' },
      // TBP/GPS - WDXRF
      { code: 'ZETIUM_A', name: 'Zetium A', brandModel: 'PANalytical Zetium', channelType: 'ALL', colorTag: 'fuchsia', site: 'TBP', methodType: 'WDXRF' },
      { code: 'ZETIUM_B', name: 'Zetium B', brandModel: 'PANalytical Zetium', channelType: 'ALL', colorTag: 'pink', site: 'TBP', methodType: 'WDXRF' },
    ];
    for (const inst of defaultInstruments) {
      await db.insert(xrfInstruments).values(inst).onConflictDoUpdate({
        target: [xrfInstruments.code],
        set: {
          name: inst.name,
          brandModel: inst.brandModel,
          site: inst.site,
          methodType: inst.methodType,
          colorTag: inst.colorTag,
        }
      });
    }

    // Pastikan data instrumen TBP dan GTS memiliki site & methodType yang benar
    try {
      await db.execute(sql`UPDATE xrf_instruments SET site = 'TBP' WHERE code IN ('EPSILON_C', 'EPSILON_E', 'EPSILON_F', 'EPSILON_G', 'EPSILON_H', 'S2_PUMA', 'ZETIUM_A', 'ZETIUM_B');`);
      await db.execute(sql`UPDATE xrf_instruments SET site = 'GTS' WHERE code IN ('EPSILON_A', 'EPSILON_B', 'EPSILON_D', 'SUPERMINI');`);
      await db.execute(sql`UPDATE xrf_instruments SET method_type = 'WDXRF' WHERE code IN ('SUPERMINI', 'ZETIUM_A', 'ZETIUM_B');`);
      await db.execute(sql`UPDATE xrf_instruments SET method_type = 'EDXRF' WHERE code NOT IN ('SUPERMINI', 'ZETIUM_A', 'ZETIUM_B');`);

      // Remediasi historical data: Perbaiki urutan 5 (LIM -> OREAS191), 6 (SAP16 -> OREAS192), 10 (SAP -> OREAS195) pada batch Saprolite
      await db.execute(sql`
        UPDATE xrf_verification_items
        SET standard_code = 'OREAS191',
            sample_label = REPLACE(sample_label, 'VER-LIM', 'VER-OREAS191')
        WHERE (standard_code = 'LIM' OR standard_code = 'VER-LIM')
          AND sequence_no = 5
          AND verification_id IN (
            SELECT DISTINCT verification_id FROM xrf_verification_items WHERE standard_code IN ('OREAS184', 'OREAS187')
          );
      `);
      await db.execute(sql`
        UPDATE xrf_verification_items
        SET standard_code = 'OREAS192',
            sample_label = REPLACE(sample_label, 'VER-SAP16', 'VER-OREAS192')
        WHERE (standard_code = 'SAP16' OR standard_code = 'VER-SAP16')
          AND sequence_no = 6
          AND verification_id IN (
            SELECT DISTINCT verification_id FROM xrf_verification_items WHERE standard_code IN ('OREAS184', 'OREAS187')
          );
      `);
      await db.execute(sql`
        UPDATE xrf_verification_items
        SET standard_code = 'OREAS195',
            sample_label = REPLACE(sample_label, 'VER-SAP', 'VER-OREAS195')
        WHERE (standard_code = 'SAP' OR standard_code = 'VER-SAP')
          AND sequence_no = 10
          AND verification_id IN (
            SELECT DISTINCT verification_id FROM xrf_verification_items WHERE standard_code IN ('OREAS184', 'OREAS187')
          );
      `);
    } catch (migErr: any) {
      console.warn("[XRF Migration] Note:", migErr.message);
    }

    // 2. Seed Standards
    const existingStds = await db.select().from(xrfStandards).limit(1);
    if (existingStds.length === 0) {
      const defaultStandards = [
        { code: 'BLANK_A', name: 'BLANK A', matrixType: 'BLANK', displayOrder: 0 },
        { code: 'BLANK_B', name: 'VER-BLANK B', matrixType: 'BLANK', displayOrder: 0 },
        { code: 'LIM01', name: 'LIM 01', matrixType: 'LIMONITE', displayOrder: 1 },
        { code: 'LIM02', name: 'LIM 02', matrixType: 'LIMONITE', displayOrder: 2 },
        { code: 'LIM03', name: 'LIM 03', matrixType: 'LIMONITE', displayOrder: 3 },
        { code: 'LIM04', name: 'LIM 04', matrixType: 'LIMONITE', displayOrder: 4 },
        { code: 'LIM05', name: 'LIM 05', matrixType: 'LIMONITE', displayOrder: 5 },
        { code: 'LIM13', name: 'LIM 13', matrixType: 'LIMONITE', displayOrder: 6 },
        { code: 'OB', name: 'OB', matrixType: 'LIMONITE', displayOrder: 7 },
        { code: 'ZBK412', name: 'ZBK 412', matrixType: 'LIMONITE', displayOrder: 8 },
        { code: 'OREAS182', name: 'OREAS 182', matrixType: 'CRM', displayOrder: 9 },
        { code: 'OREAS184', name: 'OREAS 184', matrixType: 'CRM', displayOrder: 10 },
        { code: 'OREAS187', name: 'OREAS 187', matrixType: 'CRM', displayOrder: 11 },
        { code: 'OREAS189', name: 'OREAS 189', matrixType: 'CRM', displayOrder: 12 },
        { code: 'OREAS190', name: 'OREAS 190', matrixType: 'CRM', displayOrder: 13 },
        { code: 'OREAS191', name: 'OREAS 191', matrixType: 'CRM', displayOrder: 14 },
        { code: 'OREAS192', name: 'OREAS 192', matrixType: 'CRM', displayOrder: 15 },
        { code: 'OREAS193', name: 'OREAS 193', matrixType: 'CRM', displayOrder: 16 },
        { code: 'SAP19', name: 'SAP 19', matrixType: 'SAPROLITE', displayOrder: 17 },
        { code: 'OREAS194', name: 'OREAS 194', matrixType: 'CRM', displayOrder: 18 },
        { code: 'OREAS195', name: 'OREAS 195', matrixType: 'CRM', displayOrder: 19 },
      ];
      for (const std of defaultStandards) {
        await db.insert(xrfStandards).values(std).onConflictDoNothing();
      }
    }

    // 3. Seed Reference Values (Nominal & Fixed STDEV dari Panduan Resmi Gambar 1 & 2)
    const existingRefs = await db.select().from(xrfStandardReferences).limit(1);
    if (existingRefs.length === 0) {
      const refData: Array<{
        standardCode: string;
        elementName: string;
        nominalValue: number;
        stdevFixed: number;
      }> = [
        // LIM01 (Nominal Gambar 2, Sigma Gambar 1)
        { standardCode: 'LIM01', elementName: 'Ni', nominalValue: 1.117, stdevFixed: 0.022 },
        { standardCode: 'LIM01', elementName: 'Co', nominalValue: 0.141, stdevFixed: 0.019 },
        { standardCode: 'LIM01', elementName: 'Fe', nominalValue: 47.60, stdevFixed: 0.330 },
        { standardCode: 'LIM01', elementName: 'CaO', nominalValue: 0.03, stdevFixed: 0.010 },
        { standardCode: 'LIM01', elementName: 'SiO2', nominalValue: 6.81, stdevFixed: 0.150 },
        { standardCode: 'LIM01', elementName: 'Al2O3', nominalValue: 4.42, stdevFixed: 0.190 },
        { standardCode: 'LIM01', elementName: 'MgO', nominalValue: 3.15, stdevFixed: 0.110 },
        { standardCode: 'LIM01', elementName: 'Cr2O3', nominalValue: 2.30, stdevFixed: 0.100 },
        { standardCode: 'LIM01', elementName: 'MnO', nominalValue: 1.07, stdevFixed: 0.040 },
        { standardCode: 'LIM01', elementName: 'P', nominalValue: 0.003, stdevFixed: 0.001 },
        { standardCode: 'LIM01', elementName: 'S', nominalValue: 0.149, stdevFixed: 0.007 },

        // LIM02
        { standardCode: 'LIM02', elementName: 'Ni', nominalValue: 1.204, stdevFixed: 0.022 },
        { standardCode: 'LIM02', elementName: 'Co', nominalValue: 0.133, stdevFixed: 0.019 },
        { standardCode: 'LIM02', elementName: 'Fe', nominalValue: 45.63, stdevFixed: 0.330 },
        { standardCode: 'LIM02', elementName: 'CaO', nominalValue: 0.06, stdevFixed: 0.010 },
        { standardCode: 'LIM02', elementName: 'SiO2', nominalValue: 8.86, stdevFixed: 0.150 },
        { standardCode: 'LIM02', elementName: 'Al2O3', nominalValue: 3.50, stdevFixed: 0.190 },
        { standardCode: 'LIM02', elementName: 'MgO', nominalValue: 4.95, stdevFixed: 0.110 },
        { standardCode: 'LIM02', elementName: 'Cr2O3', nominalValue: 2.16, stdevFixed: 0.100 },
        { standardCode: 'LIM02', elementName: 'MnO', nominalValue: 1.01, stdevFixed: 0.040 },
        { standardCode: 'LIM02', elementName: 'P', nominalValue: 0.003, stdevFixed: 0.001 },
        { standardCode: 'LIM02', elementName: 'S', nominalValue: 0.120, stdevFixed: 0.007 },

        // LIM03
        { standardCode: 'LIM03', elementName: 'Ni', nominalValue: 1.292, stdevFixed: 0.022 },
        { standardCode: 'LIM03', elementName: 'Co', nominalValue: 0.136, stdevFixed: 0.019 },
        { standardCode: 'LIM03', elementName: 'Fe', nominalValue: 45.28, stdevFixed: 0.330 },
        { standardCode: 'LIM03', elementName: 'CaO', nominalValue: 0.05, stdevFixed: 0.010 },
        { standardCode: 'LIM03', elementName: 'SiO2', nominalValue: 8.55, stdevFixed: 0.150 },
        { standardCode: 'LIM03', elementName: 'Al2O3', nominalValue: 4.20, stdevFixed: 0.190 },
        { standardCode: 'LIM03', elementName: 'MgO', nominalValue: 4.84, stdevFixed: 0.110 },
        { standardCode: 'LIM03', elementName: 'Cr2O3', nominalValue: 2.05, stdevFixed: 0.100 },
        { standardCode: 'LIM03', elementName: 'MnO', nominalValue: 1.01, stdevFixed: 0.040 },
        { standardCode: 'LIM03', elementName: 'P', nominalValue: 0.002, stdevFixed: 0.001 },
        { standardCode: 'LIM03', elementName: 'S', nominalValue: 0.131, stdevFixed: 0.007 },

        // LIM04
        { standardCode: 'LIM04', elementName: 'Ni', nominalValue: 1.408, stdevFixed: 0.022 },
        { standardCode: 'LIM04', elementName: 'Co', nominalValue: 0.125, stdevFixed: 0.019 },
        { standardCode: 'LIM04', elementName: 'Fe', nominalValue: 42.65, stdevFixed: 0.330 },
        { standardCode: 'LIM04', elementName: 'CaO', nominalValue: 0.06, stdevFixed: 0.010 },
        { standardCode: 'LIM04', elementName: 'SiO2', nominalValue: 10.84, stdevFixed: 0.150 },
        { standardCode: 'LIM04', elementName: 'Al2O3', nominalValue: 3.86, stdevFixed: 0.190 },
        { standardCode: 'LIM04', elementName: 'MgO', nominalValue: 6.92, stdevFixed: 0.110 },
        { standardCode: 'LIM04', elementName: 'Cr2O3', nominalValue: 1.92, stdevFixed: 0.100 },
        { standardCode: 'LIM04', elementName: 'MnO', nominalValue: 0.87, stdevFixed: 0.040 },
        { standardCode: 'LIM04', elementName: 'P', nominalValue: 0.003, stdevFixed: 0.001 },
        { standardCode: 'LIM04', elementName: 'S', nominalValue: 0.130, stdevFixed: 0.007 },

        // LIM05
        { standardCode: 'LIM05', elementName: 'Ni', nominalValue: 1.497, stdevFixed: 0.022 },
        { standardCode: 'LIM05', elementName: 'Co', nominalValue: 0.124, stdevFixed: 0.019 },
        { standardCode: 'LIM05', elementName: 'Fe', nominalValue: 36.99, stdevFixed: 0.330 },
        { standardCode: 'LIM05', elementName: 'CaO', nominalValue: 0.08, stdevFixed: 0.010 },
        { standardCode: 'LIM05', elementName: 'SiO2', nominalValue: 15.27, stdevFixed: 0.150 },
        { standardCode: 'LIM05', elementName: 'Al2O3', nominalValue: 3.55, stdevFixed: 0.190 },
        { standardCode: 'LIM05', elementName: 'MgO', nominalValue: 10.93, stdevFixed: 0.110 },
        { standardCode: 'LIM05', elementName: 'Cr2O3', nominalValue: 1.92, stdevFixed: 0.100 },
        { standardCode: 'LIM05', elementName: 'MnO', nominalValue: 0.85, stdevFixed: 0.040 },
        { standardCode: 'LIM05', elementName: 'P', nominalValue: 0.003, stdevFixed: 0.001 },
        { standardCode: 'LIM05', elementName: 'S', nominalValue: 0.098, stdevFixed: 0.007 },

        // OREAS184
        { standardCode: 'OREAS184', elementName: 'Ni', nominalValue: 1.020, stdevFixed: 0.009 },
        { standardCode: 'OREAS184', elementName: 'Co', nominalValue: 0.090, stdevFixed: 0.001 },
        { standardCode: 'OREAS184', elementName: 'Fe', nominalValue: 27.51, stdevFixed: 0.140 },
        { standardCode: 'OREAS184', elementName: 'CaO', nominalValue: 0.22, stdevFixed: 0.010 },
        { standardCode: 'OREAS184', elementName: 'SiO2', nominalValue: 42.25, stdevFixed: 0.180 },
        { standardCode: 'OREAS184', elementName: 'Al2O3', nominalValue: 4.62, stdevFixed: 0.030 },
        { standardCode: 'OREAS184', elementName: 'MgO', nominalValue: 3.05, stdevFixed: 0.020 },
        { standardCode: 'OREAS184', elementName: 'Cr2O3', nominalValue: 1.75, stdevFixed: 0.010 },
        { standardCode: 'OREAS184', elementName: 'MnO', nominalValue: 0.68, stdevFixed: 0.010 },

        // OREAS187
        { standardCode: 'OREAS187', elementName: 'Ni', nominalValue: 1.370, stdevFixed: 0.009 },
        { standardCode: 'OREAS187', elementName: 'Co', nominalValue: 0.064, stdevFixed: 0.001 },
        { standardCode: 'OREAS187', elementName: 'Fe', nominalValue: 13.60, stdevFixed: 0.070 },
        { standardCode: 'OREAS187', elementName: 'CaO', nominalValue: 0.34, stdevFixed: 0.005 },
        { standardCode: 'OREAS187', elementName: 'SiO2', nominalValue: 46.66, stdevFixed: 0.230 },
        { standardCode: 'OREAS187', elementName: 'Al2O3', nominalValue: 2.80, stdevFixed: 0.030 },
        { standardCode: 'OREAS187', elementName: 'MgO', nominalValue: 17.99, stdevFixed: 0.100 },
        { standardCode: 'OREAS187', elementName: 'Cr2O3', nominalValue: 0.99, stdevFixed: 0.010 },
        { standardCode: 'OREAS187', elementName: 'MnO', nominalValue: 0.36, stdevFixed: 0.005 },

        // OREAS189
        { standardCode: 'OREAS189', elementName: 'Ni', nominalValue: 1.480, stdevFixed: 0.015 },
        { standardCode: 'OREAS189', elementName: 'Co', nominalValue: 0.033, stdevFixed: 0.001 },
        { standardCode: 'OREAS189', elementName: 'Fe', nominalValue: 10.52, stdevFixed: 0.070 },
        { standardCode: 'OREAS189', elementName: 'CaO', nominalValue: 0.33, stdevFixed: 0.010 },
        { standardCode: 'OREAS189', elementName: 'SiO2', nominalValue: 46.20, stdevFixed: 0.220 },
        { standardCode: 'OREAS189', elementName: 'Al2O3', nominalValue: 2.09, stdevFixed: 0.020 },
        { standardCode: 'OREAS189', elementName: 'MgO', nominalValue: 23.09, stdevFixed: 0.140 },
        { standardCode: 'OREAS189', elementName: 'Cr2O3', nominalValue: 0.76, stdevFixed: 0.010 },
        { standardCode: 'OREAS189', elementName: 'MnO', nominalValue: 0.23, stdevFixed: 0.005 },

        // OREAS190
        { standardCode: 'OREAS190', elementName: 'Ni', nominalValue: 1.640, stdevFixed: 0.012 },
        { standardCode: 'OREAS190', elementName: 'Co', nominalValue: 0.090, stdevFixed: 0.001 },
        { standardCode: 'OREAS190', elementName: 'Fe', nominalValue: 24.84, stdevFixed: 0.100 },
        { standardCode: 'OREAS190', elementName: 'CaO', nominalValue: 0.13, stdevFixed: 0.005 },
        { standardCode: 'OREAS190', elementName: 'SiO2', nominalValue: 38.22, stdevFixed: 0.170 },
        { standardCode: 'OREAS190', elementName: 'Al2O3', nominalValue: 6.00, stdevFixed: 0.050 },
        { standardCode: 'OREAS190', elementName: 'MgO', nominalValue: 6.91, stdevFixed: 0.060 },
        { standardCode: 'OREAS190', elementName: 'Cr2O3', nominalValue: 1.73, stdevFixed: 0.020 },
        { standardCode: 'OREAS190', elementName: 'MnO', nominalValue: 0.58, stdevFixed: 0.005 },

        // OREAS191
        { standardCode: 'OREAS191', elementName: 'Ni', nominalValue: 1.753, stdevFixed: 0.017 },
        { standardCode: 'OREAS191', elementName: 'Co', nominalValue: 0.067, stdevFixed: 0.002 },
        { standardCode: 'OREAS191', elementName: 'Fe', nominalValue: 17.38, stdevFixed: 0.110 },
        { standardCode: 'OREAS191', elementName: 'CaO', nominalValue: 0.28, stdevFixed: 0.010 },
        { standardCode: 'OREAS191', elementName: 'SiO2', nominalValue: 47.97, stdevFixed: 0.260 },
        { standardCode: 'OREAS191', elementName: 'Al2O3', nominalValue: 4.27, stdevFixed: 0.030 },
        { standardCode: 'OREAS191', elementName: 'MgO', nominalValue: 10.06, stdevFixed: 0.080 },
        { standardCode: 'OREAS191', elementName: 'Cr2O3', nominalValue: 1.22, stdevFixed: 0.010 },
        { standardCode: 'OREAS191', elementName: 'MnO', nominalValue: 0.40, stdevFixed: 0.005 },

        // OREAS192
        { standardCode: 'OREAS192', elementName: 'Ni', nominalValue: 1.772, stdevFixed: 0.015 },
        { standardCode: 'OREAS192', elementName: 'Co', nominalValue: 0.040, stdevFixed: 0.001 },
        { standardCode: 'OREAS192', elementName: 'Fe', nominalValue: 12.66, stdevFixed: 0.060 },
        { standardCode: 'OREAS192', elementName: 'CaO', nominalValue: 0.31, stdevFixed: 0.010 },
        { standardCode: 'OREAS192', elementName: 'SiO2', nominalValue: 43.58, stdevFixed: 0.160 },
        { standardCode: 'OREAS192', elementName: 'Al2O3', nominalValue: 2.76, stdevFixed: 0.030 },
        { standardCode: 'OREAS192', elementName: 'MgO', nominalValue: 21.32, stdevFixed: 0.130 },
        { standardCode: 'OREAS192', elementName: 'Cr2O3', nominalValue: 0.91, stdevFixed: 0.010 },
        { standardCode: 'OREAS192', elementName: 'MnO', nominalValue: 0.28, stdevFixed: 0.005 },

        // OREAS193
        { standardCode: 'OREAS193', elementName: 'Ni', nominalValue: 1.930, stdevFixed: 0.019 },
        { standardCode: 'OREAS193', elementName: 'Co', nominalValue: 0.050, stdevFixed: 0.001 },
        { standardCode: 'OREAS193', elementName: 'Fe', nominalValue: 13.66, stdevFixed: 0.070 },
        { standardCode: 'OREAS193', elementName: 'CaO', nominalValue: 0.36, stdevFixed: 0.005 },
        { standardCode: 'OREAS193', elementName: 'SiO2', nominalValue: 42.72, stdevFixed: 0.190 },
        { standardCode: 'OREAS193', elementName: 'Al2O3', nominalValue: 3.08, stdevFixed: 0.020 },
        { standardCode: 'OREAS193', elementName: 'MgO', nominalValue: 20.25, stdevFixed: 0.130 },
        { standardCode: 'OREAS193', elementName: 'Cr2O3', nominalValue: 0.96, stdevFixed: 0.010 },
        { standardCode: 'OREAS193', elementName: 'MnO', nominalValue: 0.32, stdevFixed: 0.005 },

        // SAP19
        { standardCode: 'SAP19', elementName: 'Ni', nominalValue: 2.030, stdevFixed: 0.017 },
        { standardCode: 'SAP19', elementName: 'Co', nominalValue: 0.066, stdevFixed: 0.003 },
        { standardCode: 'SAP19', elementName: 'Fe', nominalValue: 17.56, stdevFixed: 0.130 },
        { standardCode: 'SAP19', elementName: 'CaO', nominalValue: 0.07, stdevFixed: 0.005 },
        { standardCode: 'SAP19', elementName: 'SiO2', nominalValue: 31.54, stdevFixed: 0.060 },
        { standardCode: 'SAP19', elementName: 'Al2O3', nominalValue: 1.70, stdevFixed: 0.020 },
        { standardCode: 'SAP19', elementName: 'MgO', nominalValue: 25.21, stdevFixed: 0.120 },
        { standardCode: 'SAP19', elementName: 'Cr2O3', nominalValue: 1.16, stdevFixed: 0.020 },
        { standardCode: 'SAP19', elementName: 'MnO', nominalValue: 0.45, stdevFixed: 0.010 },

        // OREAS194
        { standardCode: 'OREAS194', elementName: 'Ni', nominalValue: 2.130, stdevFixed: 0.020 },
        { standardCode: 'OREAS194', elementName: 'Co', nominalValue: 0.043, stdevFixed: 0.001 },
        { standardCode: 'OREAS194', elementName: 'Fe', nominalValue: 11.53, stdevFixed: 0.060 },
        { standardCode: 'OREAS194', elementName: 'CaO', nominalValue: 0.31, stdevFixed: 0.010 },
        { standardCode: 'OREAS194', elementName: 'SiO2', nominalValue: 43.02, stdevFixed: 0.220 },
        { standardCode: 'OREAS194', elementName: 'Al2O3', nominalValue: 2.74, stdevFixed: 0.030 },
        { standardCode: 'OREAS194', elementName: 'MgO', nominalValue: 22.83, stdevFixed: 0.150 },
        { standardCode: 'OREAS194', elementName: 'Cr2O3', nominalValue: 0.82, stdevFixed: 0.010 },
        { standardCode: 'OREAS194', elementName: 'MnO', nominalValue: 0.26, stdevFixed: 0.005 },

        // OREAS195
        { standardCode: 'OREAS195', elementName: 'Ni', nominalValue: 2.944, stdevFixed: 0.029 },
        { standardCode: 'OREAS195', elementName: 'Co', nominalValue: 0.048, stdevFixed: 0.001 },
        { standardCode: 'OREAS195', elementName: 'Fe', nominalValue: 12.79, stdevFixed: 0.090 },
        { standardCode: 'OREAS195', elementName: 'CaO', nominalValue: 0.39, stdevFixed: 0.010 },
        { standardCode: 'OREAS195', elementName: 'SiO2', nominalValue: 44.00, stdevFixed: 0.190 },
        { standardCode: 'OREAS195', elementName: 'Al2O3', nominalValue: 3.13, stdevFixed: 0.030 },
        { standardCode: 'OREAS195', elementName: 'MgO', nominalValue: 19.01, stdevFixed: 0.110 },
        { standardCode: 'OREAS195', elementName: 'Cr2O3', nominalValue: 0.96, stdevFixed: 0.010 },
        { standardCode: 'OREAS195', elementName: 'MnO', nominalValue: 0.29, stdevFixed: 0.005 },
      ];

      for (const row of refData) {
        await db.insert(xrfStandardReferences).values(row).onConflictDoNothing();
      }
    }
  } catch (err: any) {
    console.warn("[XRF Seed] Note:", err.message);
  }
}

// -------------------------------------------------------------
// HELPER: Auto-Calculations (BC, Fe/Ni, Sum, Deviasi & Evaluations)
// -------------------------------------------------------------
function calculateMetricsAndEvaluations(
  item: any,
  references: Record<string, { 
    nominalValue: number; 
    stdevFixed: number; 
    warningSigma?: number; 
    actionSigma?: number;
    upperAction?: number | string | null;
    lowerAction?: number | string | null;
    upperWarning?: number | string | null;
    lowerWarning?: number | string | null;
  }>
) {
  const ni = Number(item.ni) || 0;
  const co = Number(item.co) || 0;
  const fe = Number(item.fe) || 0;
  const cao = Number(item.cao) || 0;
  const sio2 = Number(item.sio2) || 0;
  const al2o3 = Number(item.al2o3) || 0;
  const mgo = Number(item.mgo) || 0;
  const p = Number(item.p) || 0;
  const s = Number(item.s) || 0;
  const cr2o3 = Number(item.cr2o3) || 0;
  const mno = Number(item.mno) || 0;

  // Basic Ratio BC = (CaO + MgO) / SiO2 (atau sesuai rumus lab)
  const bc = sio2 > 0 ? Number(((cao + mgo) / sio2).toFixed(2)) : 0;
  
  // Fe/Ni ratio
  const feNi = ni > 0 ? Number((fe / ni).toFixed(2)) : 0;

  // Sum of Concentration %
  const sumConc = Number((ni + co + fe + cao + sio2 + al2o3 + mgo + p + s + cr2o3 + mno).toFixed(2));

  // Evaluations against reference values
  const evaluations: Record<string, any> = {};
  let overallItemStatus = 'PASS';

  const elementsToCheck: Array<{ key: string; val: number }> = [
    { key: 'Ni', val: ni },
    { key: 'Co', val: co },
    { key: 'Fe', val: fe },
    { key: 'CaO', val: cao },
    { key: 'SiO2', val: sio2 },
    { key: 'Al2O3', val: al2o3 },
    { key: 'MgO', val: mgo },
    { key: 'P', val: p },
    { key: 'S', val: s },
    { key: 'Cr2O3', val: cr2o3 },
    { key: 'MnO', val: mno },
  ];

  for (const el of elementsToCheck) {
    const ref = references[el.key];
    if (ref && ref.nominalValue > 0) {
      const diffPct = Number((((el.val - ref.nominalValue) / ref.nominalValue) * 100).toFixed(2));
      const sigmaDist = ref.stdevFixed > 0 ? Number(((el.val - ref.nominalValue) / ref.stdevFixed).toFixed(2)) : 0;
      
      const upperAction = ref.upperAction !== null && ref.upperAction !== undefined ? Number(ref.upperAction) : Number((ref.nominalValue + (ref.actionSigma || 3.0) * ref.stdevFixed).toFixed(3));
      const lowerAction = ref.lowerAction !== null && ref.lowerAction !== undefined ? Number(ref.lowerAction) : Number((ref.nominalValue - (ref.actionSigma || 3.0) * ref.stdevFixed).toFixed(3));
      const upperWarning = ref.upperWarning !== null && ref.upperWarning !== undefined ? Number(ref.upperWarning) : Number((ref.nominalValue + (ref.warningSigma || 2.0) * ref.stdevFixed).toFixed(3));
      const lowerWarning = ref.lowerWarning !== null && ref.lowerWarning !== undefined ? Number(ref.lowerWarning) : Number((ref.nominalValue - (ref.warningSigma || 2.0) * ref.stdevFixed).toFixed(3));

      let status = 'PASS';
      if (el.val > upperAction || el.val < lowerAction) {
        status = 'FAIL';
        overallItemStatus = 'FAIL';
      } else if (el.val > upperWarning || el.val < lowerWarning) {
        status = 'WARNING';
        if (overallItemStatus !== 'FAIL') overallItemStatus = 'WARNING';
      }

      evaluations[el.key] = {
        measured: el.val,
        expected: ref.nominalValue,
        diffPct,
        stdev: ref.stdevFixed,
        sigmaDist,
        status,
        upperAction,
        lowerAction,
        upperWarning,
        lowerWarning,
      };
    }
  }

  return { bc, feNi, sumConc, evaluations, itemStatus: overallItemStatus };
}

// -------------------------------------------------------------
// ENDPOINTS
// -------------------------------------------------------------

// 1. GET Master Instruments (dengan status ketersediaan data langsung dari DB)
xrfRouter.get("/instruments", async (_req, res) => {
  try {
    await ensureXrfTables();
    
    // Hitung jumlah batch pengukuran per instrument_code
    const countRows = await db.select({
      instrumentCode: xrfVerifications.instrumentCode,
      count: sql<number>`count(${xrfVerifications.id})`.as('count'),
    })
    .from(xrfVerifications)
    .groupBy(xrfVerifications.instrumentCode);

    const countsMap: Record<string, number> = {};
    for (const c of countRows) {
      if (c.instrumentCode) countsMap[c.instrumentCode] = Number(c.count) || 0;
    }

    const rows = await db.select().from(xrfInstruments).orderBy(asc(xrfInstruments.id));
    const enriched = rows.map(r => {
      const isKnownGts = ['EPSILON_A', 'EPSILON_B', 'EPSILON_D', 'SUPERMINI'].includes(r.code);
      const isKnownTbp = ['EPSILON_C', 'EPSILON_E', 'EPSILON_F', 'EPSILON_G', 'EPSILON_H', 'S2_PUMA', 'ZETIUM_A', 'ZETIUM_B'].includes(r.code);
      const site = isKnownGts ? 'GTS' : (isKnownTbp ? 'TBP' : (r.site || 'TBP'));
      const isKnownWdxrf = ['SUPERMINI', 'ZETIUM_A', 'ZETIUM_B'].includes(r.code);
      const methodType = isKnownWdxrf ? 'WDXRF' : (r.methodType || 'EDXRF');

      return {
        ...r,
        site,
        methodType,
        measurementCount: countsMap[r.code] || 0,
        hasData: (countsMap[r.code] || 0) > 0,
      };
    });

    return res.json({ success: true, data: enriched });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 1b. POST Tambah Alat XRF Baru Langsung dari Portal UI
xrfRouter.post("/instruments", async (req, res) => {
  try {
    await ensureXrfTables();
    const { code, name, brandModel, channelType, colorTag, site, methodType } = req.body;
    
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: "Nama alat wajib diisi." });
    }

    const cleanCode = (code || name)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_');

    if (!cleanCode) {
      return res.status(400).json({ success: false, error: "Kode alat tidak valid." });
    }

    const existing = await db.select().from(xrfInstruments).where(eq(xrfInstruments.code, cleanCode)).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: `Alat dengan kode '${cleanCode}' sudah terdaftar di database.` });
    }

    const inserted = await db.insert(xrfInstruments).values({
      code: cleanCode,
      name: name.trim(),
      brandModel: brandModel?.trim() || 'PANalytical Epsilon 4',
      channelType: channelType?.trim() || 'ALL',
      colorTag: colorTag?.trim() || 'teal',
      site: (site === 'GTS' || site === 'TBP') ? site : 'TBP',
      methodType: (methodType === 'WDXRF' || methodType === 'EDXRF') ? methodType : 'EDXRF',
      isActive: true,
    }).returning();

    invalidateXrfChartCache();

    return res.json({
      success: true,
      message: `Instrumen ${name} (${cleanCode}) berhasil ditambahkan ke ${site}.`,
      data: inserted[0],
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 1c. PUT Update Detail Alat XRF
xrfRouter.put("/instruments/:id", async (req, res) => {
  try {
    await ensureXrfTables();
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "ID alat tidak valid." });
    }

    const { name, brandModel, channelType, colorTag, site, methodType, isActive } = req.body;

    const updated = await db.update(xrfInstruments)
      .set({
        ...(name ? { name: name.trim() } : {}),
        ...(brandModel ? { brandModel: brandModel.trim() } : {}),
        ...(channelType ? { channelType: channelType.trim() } : {}),
        ...(colorTag ? { colorTag: colorTag.trim() } : {}),
        ...(site ? { site: site === 'GTS' ? 'GTS' : 'TBP' } : {}),
        ...(methodType ? { methodType: methodType === 'WDXRF' ? 'WDXRF' : 'EDXRF' } : {}),
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      })
      .where(eq(xrfInstruments.id, id))
      .returning();

    invalidateXrfChartCache();

    return res.json({
      success: true,
      message: "Instrumen berhasil diperbarui.",
      data: updated[0],
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 1d. DELETE Hapus atau Nonaktifkan Alat XRF
xrfRouter.delete("/instruments/:id", async (req, res) => {
  try {
    await ensureXrfTables();
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "ID alat tidak valid." });
    }

    const inst = await db.select().from(xrfInstruments).where(eq(xrfInstruments.id, id)).limit(1);
    if (inst.length === 0) {
      return res.status(404).json({ success: false, error: "Instrumen tidak ditemukan." });
    }

    // Periksa apakah alat memiliki riwayat verifikasi
    const verCount = await db.select({ count: sql<number>`count(*)` })
      .from(xrfVerifications)
      .where(eq(xrfVerifications.instrumentCode, inst[0].code));
    
    const count = Number(verCount[0]?.count) || 0;
    if (count > 0) {
      // Soft-delete (nonaktifkan) jika sudah ada data verifikasi agar riwayat tidak rusak
      await db.update(xrfInstruments).set({ isActive: false }).where(eq(xrfInstruments.id, id));
      invalidateXrfChartCache();
      return res.json({
        success: true,
        message: `Instrumen ${inst[0].name} dinonaktifkan (memiliki ${count} batch verifikasi).`,
      });
    }

    // Hard delete jika belum pernah ada data pengukuran
    await db.delete(xrfInstruments).where(eq(xrfInstruments.id, id));
    invalidateXrfChartCache();

    return res.json({
      success: true,
      message: `Instrumen ${inst[0].name} berhasil dihapus dari sistem.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET Master Standards
xrfRouter.get("/standards", async (_req, res) => {
  try {
    await ensureXrfTables();
    const rows = await db.select().from(xrfStandards).orderBy(asc(xrfStandards.displayOrder));
    return res.json({ success: true, data: rows });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. GET Standard References (Matrix Nominal & Fixed STDEV)
xrfRouter.get("/references", async (req, res) => {
  try {
    await ensureXrfTables();
    const { standardCode } = req.query;
    
    let query = db.select().from(xrfStandardReferences);
    if (standardCode) {
      query = query.where(eq(xrfStandardReferences.standardCode, String(standardCode))) as any;
    }
    const rows = await query.orderBy(asc(xrfStandardReferences.standardCode), asc(xrfStandardReferences.elementName));
    return res.json({ success: true, data: rows });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. POST / UPDATE Standard References
xrfRouter.post("/references", async (req, res) => {
  try {
    await ensureXrfTables();
    const { references } = req.body; // array of { standardCode, elementName, nominalValue, stdevFixed, warningSigma, actionSigma }
    if (!Array.isArray(references) || references.length === 0) {
      return res.status(400).json({ success: false, error: "references array required" });
    }

    for (const ref of references) {
      await db.insert(xrfStandardReferences).values({
        standardCode: ref.standardCode,
        elementName: ref.elementName,
        nominalValue: Number(ref.nominalValue),
        stdevFixed: Number(ref.stdevFixed),
        lowerWarning: ref.lowerWarning !== undefined && ref.lowerWarning !== null ? Number(ref.lowerWarning) : null,
        upperWarning: ref.upperWarning !== undefined && ref.upperWarning !== null ? Number(ref.upperWarning) : null,
        lowerAction: ref.lowerAction !== undefined && ref.lowerAction !== null ? Number(ref.lowerAction) : null,
        upperAction: ref.upperAction !== undefined && ref.upperAction !== null ? Number(ref.upperAction) : null,
        warningSigma: ref.warningSigma ? Number(ref.warningSigma) : 2.0,
        actionSigma: ref.actionSigma ? Number(ref.actionSigma) : 3.0,
        extremeSigma: ref.extremeSigma ? Number(ref.extremeSigma) : 5.0,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: [xrfStandardReferences.standardCode, xrfStandardReferences.elementName],
        set: {
          nominalValue: Number(ref.nominalValue),
          stdevFixed: Number(ref.stdevFixed),
          lowerWarning: ref.lowerWarning !== undefined && ref.lowerWarning !== null ? Number(ref.lowerWarning) : undefined,
          upperWarning: ref.upperWarning !== undefined && ref.upperWarning !== null ? Number(ref.upperWarning) : undefined,
          lowerAction: ref.lowerAction !== undefined && ref.lowerAction !== null ? Number(ref.lowerAction) : undefined,
          upperAction: ref.upperAction !== undefined && ref.upperAction !== null ? Number(ref.upperAction) : undefined,
          warningSigma: ref.warningSigma ? Number(ref.warningSigma) : 2.0,
          actionSigma: ref.actionSigma ? Number(ref.actionSigma) : 3.0,
          extremeSigma: ref.extremeSigma ? Number(ref.extremeSigma) : 5.0,
          updatedAt: new Date(),
        }
      });
    }

    qcChartCache = null;
    return res.json({ success: true, message: `Berhasil memperbarui ${references.length} data acuan.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. GET Verifications (Daily Logs & History)
xrfRouter.get("/verifications", async (req, res) => {
  try {
    await ensureXrfTables();
    const { instrumentCode, startDate, endDate, limit = 100 } = req.query;

    let conditions: any[] = [];
    if (instrumentCode && instrumentCode !== 'ALL') {
      conditions.push(eq(xrfVerifications.instrumentCode, String(instrumentCode)));
    }
    if (startDate) {
      conditions.push(gte(xrfVerifications.verificationDate, String(startDate)));
    }
    if (endDate) {
      conditions.push(lte(xrfVerifications.verificationDate, String(endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const batches = await db.select()
      .from(xrfVerifications)
      .where(whereClause)
      .orderBy(desc(xrfVerifications.verificationDate), desc(xrfVerifications.id))
      .limit(Number(limit));

    if (batches.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Attach items for these batches
    const batchIds = batches.map(b => b.id);
    const items = await db.select()
      .from(xrfVerificationItems)
      .where(sql`${xrfVerificationItems.verificationId} IN (${sql.join(batchIds.map(id => sql`${id}`), sql`, `)})`)
      .orderBy(asc(xrfVerificationItems.sequenceNo));

    const itemsByBatchId = items.reduce((acc: any, it) => {
      acc[it.verificationId!] = acc[it.verificationId!] || [];
      acc[it.verificationId!].push(it);
      return acc;
    }, {});

    const results = batches.map(b => ({
      ...b,
      items: itemsByBatchId[b.id] || []
    }));

    return res.json({ success: true, data: results });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. POST Create Daily Verification Batch (Gambar 1 Input)
xrfRouter.post("/verifications", async (req, res) => {
  try {
    await ensureXrfTables();
    const {
      instrumentCode,
      instrumentName,
      verificationDate,
      verificationTime,
      shift = '1',
      weekNo,
      operatorNik,
      operatorName,
      notes,
      items // Array of items: { standardCode, sampleLabel, analyzedAt, sequenceNo, ni, co, fe, cao, sio2, al2o3, mgo, p, s, cr2o3, mno }
    } = req.body;

    if (!instrumentCode || !verificationDate || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: "Data batch tidak lengkap." });
    }

    // Load reference table for auto calculation
    const allRefs = await db.select().from(xrfStandardReferences);
    const refMap: Record<string, Record<string, any>> = {};
    for (const r of allRefs) {
      refMap[r.standardCode] = refMap[r.standardCode] || {};
      refMap[r.standardCode][r.elementName] = r;
    }

    // Generate batch code
    const dateFormatted = String(verificationDate).replace(/-/g, '');
    const cleanInst = String(instrumentCode).replace(/[^A-Za-z0-9]/g, '');
    const batchCode = `VRF-${dateFormatted}-${cleanInst}-${Date.now().toString().slice(-4)}`;

    // Evaluate all items
    let overallBatchStatus = 'PASS';
    const processedItems = items.map((rawItem, idx) => {
      const stdCode = rawItem.standardCode || `LIM0${idx + 1}`;
      const stdRefs = refMap[stdCode] || {};
      const { bc, feNi, sumConc, evaluations, itemStatus } = calculateMetricsAndEvaluations(rawItem, stdRefs);

      if (itemStatus === 'FAIL') overallBatchStatus = 'FAIL';
      else if (itemStatus === 'WARNING' && overallBatchStatus !== 'FAIL') overallBatchStatus = 'WARNING';

      return {
        standardCode: stdCode,
        sampleLabel: rawItem.sampleLabel || `${stdCode} ${verificationDate}`,
        sequenceNo: rawItem.sequenceNo || (idx + 1),
        analyzedAt: rawItem.analyzedAt || `${verificationDate} ${verificationTime || ''}`.trim(),
        ni: rawItem.ni !== undefined ? Number(rawItem.ni) : null,
        co: rawItem.co !== undefined ? Number(rawItem.co) : null,
        fe: rawItem.fe !== undefined ? Number(rawItem.fe) : null,
        cao: rawItem.cao !== undefined ? Number(rawItem.cao) : null,
        sio2: rawItem.sio2 !== undefined ? Number(rawItem.sio2) : null,
        al2o3: rawItem.al2o3 !== undefined ? Number(rawItem.al2o3) : null,
        mgo: rawItem.mgo !== undefined ? Number(rawItem.mgo) : null,
        p: rawItem.p !== undefined ? Number(rawItem.p) : null,
        s: rawItem.s !== undefined ? Number(rawItem.s) : null,
        cr2o3: rawItem.cr2o3 !== undefined ? Number(rawItem.cr2o3) : null,
        mno: rawItem.mno !== undefined ? Number(rawItem.mno) : null,
        bc,
        feNi,
        sumConc,
        evaluations,
        itemStatus,
      };
    });

    // Insert Header
    const [insertedHeader] = await db.insert(xrfVerifications).values({
      batchCode,
      instrumentCode,
      instrumentName: instrumentName || instrumentCode,
      verificationDate,
      verificationTime: verificationTime || null,
      shift,
      weekNo: weekNo ? Number(weekNo) : null,
      operatorNik: operatorNik || null,
      operatorName: operatorName || null,
      overallStatus: overallBatchStatus,
      notes: notes || null,
    }).returning();

    // Insert Items
    const itemsToInsert = processedItems.map(p => ({
      ...p,
      verificationId: insertedHeader.id,
    }));
    await db.insert(xrfVerificationItems).values(itemsToInsert);

    return res.json({
      success: true,
      message: "Data verifikasi harian berhasil disimpan.",
      data: {
        ...insertedHeader,
        items: itemsToInsert,
      }
    });
  } catch (err: any) {
    console.error("[XRF Insert] Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7. DELETE Verification Batch
xrfRouter.delete("/verifications/:id", async (req, res) => {
  try {
    await ensureXrfTables();
    const id = Number(req.params.id);
    await db.delete(xrfVerificationItems).where(eq(xrfVerificationItems.verificationId, id));
    await db.delete(xrfVerifications).where(eq(xrfVerifications.id, id));
    qcChartCache = null;
    return res.json({ success: true, message: "Batch verifikasi berhasil dihapus." });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7a. POST Bulk Delete Verifications (Hapus Sekaligus)
xrfRouter.post("/verifications/bulk-delete", async (req, res) => {
  try {
    await ensureXrfTables();
    const { batchIds, instrumentCode, startDate, endDate } = req.body;

    let targetBatchIds: number[] = [];

    if (Array.isArray(batchIds) && batchIds.length > 0) {
      targetBatchIds = batchIds.map(Number).filter(n => !isNaN(n));
    } else if (instrumentCode && instrumentCode !== 'ALL') {
      let conditions: any[] = [eq(xrfVerifications.instrumentCode, String(instrumentCode))];
      if (startDate) conditions.push(gte(xrfVerifications.verificationDate, String(startDate)));
      if (endDate) conditions.push(lte(xrfVerifications.verificationDate, String(endDate)));

      const found = await db.select({ id: xrfVerifications.id })
        .from(xrfVerifications)
        .where(and(...conditions));
      targetBatchIds = found.map(f => f.id);
    }

    if (targetBatchIds.length === 0) {
      return res.status(400).json({ success: false, error: "Tidak ada data batch yang dipilih untuk dihapus." });
    }

    // Delete items first
    await db.delete(xrfVerificationItems)
      .where(sql`${xrfVerificationItems.verificationId} IN (${sql.join(targetBatchIds.map(id => sql`${id}`), sql`, `)})`);

    // Delete verification headers
    await db.delete(xrfVerifications)
      .where(sql`${xrfVerifications.id} IN (${sql.join(targetBatchIds.map(id => sql`${id}`), sql`, `)})`);

    qcChartCache = null;

    return res.json({
      success: true,
      message: `Berhasil menghapus ${targetBatchIds.length} batch verifikasi beserta seluruh item datanya.`,
      deletedCount: targetBatchIds.length,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7b. POST Bulk Reassign Instrument (Pindahkan / Perbaiki Alat Sekaligus)
xrfRouter.post("/verifications/bulk-reassign", async (req, res) => {
  try {
    await ensureXrfTables();
    const { batchIds, fromInstrumentCode, toInstrumentCode, startDate, endDate } = req.body;

    if (!toInstrumentCode) {
      return res.status(400).json({ success: false, error: "Alat target (toInstrumentCode) harus ditentukan." });
    }

    // Find toInstrumentName
    const instRecord = await db.select().from(xrfInstruments).where(eq(xrfInstruments.code, toInstrumentCode)).limit(1);
    const toInstrumentName = instRecord[0]?.name || toInstrumentCode.replace('_', ' ');

    let targetBatchIds: number[] = [];

    if (Array.isArray(batchIds) && batchIds.length > 0) {
      targetBatchIds = batchIds.map(Number).filter(n => !isNaN(n));
    } else if (fromInstrumentCode && fromInstrumentCode !== 'ALL') {
      let conditions: any[] = [eq(xrfVerifications.instrumentCode, String(fromInstrumentCode))];
      if (startDate) conditions.push(gte(xrfVerifications.verificationDate, String(startDate)));
      if (endDate) conditions.push(lte(xrfVerifications.verificationDate, String(endDate)));

      const found = await db.select({ id: xrfVerifications.id })
        .from(xrfVerifications)
        .where(and(...conditions));
      targetBatchIds = found.map(f => f.id);
    }

    if (targetBatchIds.length === 0) {
      return res.status(400).json({ success: false, error: "Tidak ada data batch yang dipilih untuk dipindahkan." });
    }

    // Update batch headers
    await db.execute(sql`
      UPDATE xrf_verifications
      SET instrument_code = ${toInstrumentCode},
          instrument_name = ${toInstrumentName}
      WHERE id IN (${sql.join(targetBatchIds.map(id => sql`${id}`), sql`, `)})
    `);

    qcChartCache = null;

    return res.json({
      success: true,
      message: `Berhasil memindahkan ${targetBatchIds.length} batch verifikasi ke ${toInstrumentName}.`,
      updatedCount: targetBatchIds.length,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7c. GET Available Standards with Data Count
xrfRouter.get("/available-standards", async (req, res) => {
  try {
    await ensureXrfTables();
    const { instrumentCode } = req.query;

    let conditions: any[] = [];
    if (instrumentCode && instrumentCode !== 'ALL') {
      const instList = String(instrumentCode).split(',').filter(Boolean);
      if (instList.length > 0) {
        conditions.push(sql`${xrfVerifications.instrumentCode} IN (${sql.join(instList.map(c => sql`${c}`), sql`, `)})`);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db.select({
      standardCode: xrfVerificationItems.standardCode,
      count: sql<number>`count(${xrfVerificationItems.id})`.as('count'),
      lastAnalyzed: sql<string>`max(${xrfVerificationItems.analyzedAt})`.as('last_analyzed'),
    })
    .from(xrfVerificationItems)
    .innerJoin(xrfVerifications, eq(xrfVerificationItems.verificationId, xrfVerifications.id))
    .where(whereClause)
    .groupBy(xrfVerificationItems.standardCode)
    .orderBy(desc(sql`count(${xrfVerificationItems.id})`));

    return res.json({ success: true, data: rows });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Cache for high-performance chart querying
let qcChartCache: {
  cacheKey: string;
  timestamp: number;
  allElementsData: Record<string, Record<string, Record<string, any>>>;
  instruments: string[];
  standards: string[];
  availableStandards?: string[];
} | null = null;

// Invalidate cache helper
export function invalidateXrfChartCache() {
  qcChartCache = null;
}

// 8. GET QC Control Chart Data (Gambar 6 & 4)
// High-performance with in-memory cache and precomputed all-elements data
xrfRouter.get("/qc-chart-data", async (req, res) => {
  try {
    if (!xrfTablesEnsured) {
      await ensureXrfTables();
    }
    const element = String(req.query.element || 'Cr2O3');
    const instrumentsParam = req.query.instruments ? String(req.query.instruments).split(',') : ['EPSILON_C', 'EPSILON_E'];
    const isAllStandards = !req.query.standards || req.query.standards === 'ALL';
    let standardsParam = req.query.standards && req.query.standards !== 'ALL'
      ? String(req.query.standards).split(',').filter(Boolean)
      : [];
    const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
    const endDate = req.query.endDate ? String(req.query.endDate) : undefined;

    const cacheKey = `${[...instrumentsParam].sort().join('_')}::${isAllStandards ? 'ALL' : [...standardsParam].sort().join('_')}::${startDate || ''}::${endDate || ''}`;
    const now = Date.now();

    // Check if cache is still valid (5 minutes TTL)
    if (qcChartCache && qcChartCache.cacheKey === cacheKey && (now - qcChartCache.timestamp < 300000)) {
      const gridData = qcChartCache.allElementsData[element] || qcChartCache.allElementsData['Cr2O3'] || {};
      return res.json({
        success: true,
        element,
        instruments: instrumentsParam,
        standards: qcChartCache.standards || standardsParam,
        availableStandards: qcChartCache.availableStandards || [],
        gridData,
        allElementsData: qcChartCache.allElementsData,
        cached: true,
      });
    }

    const ALL_ELEMENTS = ['Cr2O3', 'Ni', 'Co', 'Fe', 'SiO2', 'Al2O3', 'MgO', 'CaO', 'MnO', 'P', 'S'];

    // Ambil semua referensi standar
    const allReferences = await db.select().from(xrfStandardReferences);
    const refMap: Record<string, Record<string, any>> = {};
    for (const r of allReferences) {
      refMap[r.standardCode] = refMap[r.standardCode] || {};
      refMap[r.standardCode][r.elementName] = r;
    }

    const whereConditions: any[] = [
      sql`${xrfVerifications.instrumentCode} IN (${sql.join(instrumentsParam.map(c => sql`${c}`), sql`, `)})`,
      startDate ? gte(xrfVerifications.verificationDate, startDate) : sql`1=1`,
      endDate ? lte(xrfVerifications.verificationDate, endDate) : sql`1=1`,
    ];
    if (standardsParam.length > 0) {
      const expandedStandards = Array.from(new Set([
        ...standardsParam,
        ...standardsParam.map(s => s.replace('_', ' ')),
        ...standardsParam.map(s => s.replace(' ', '_')),
      ]));
      whereConditions.push(sql`${xrfVerificationItems.standardCode} IN (${sql.join(expandedStandards.map(s => sql`${s}`), sql`, `)})`);
    }

    const rawData = await db.select({
      id: xrfVerificationItems.id,
      verificationId: xrfVerifications.id,
      instrumentCode: xrfVerifications.instrumentCode,
      instrumentName: xrfVerifications.instrumentName,
      verificationDate: xrfVerifications.verificationDate,
      weekNo: xrfVerifications.weekNo,
      analyzedAt: xrfVerificationItems.analyzedAt,
      standardCode: xrfVerificationItems.standardCode,
      sampleLabel: xrfVerificationItems.sampleLabel,
      itemStatus: xrfVerificationItems.itemStatus,
      ni: xrfVerificationItems.ni,
      co: xrfVerificationItems.co,
      fe: xrfVerificationItems.fe,
      cao: xrfVerificationItems.cao,
      sio2: xrfVerificationItems.sio2,
      al2o3: xrfVerificationItems.al2o3,
      mgo: xrfVerificationItems.mgo,
      p: xrfVerificationItems.p,
      s: xrfVerificationItems.s,
      cr2o3: xrfVerificationItems.cr2o3,
      mno: xrfVerificationItems.mno,
    })
    .from(xrfVerificationItems)
    .innerJoin(xrfVerifications, eq(xrfVerificationItems.verificationId, xrfVerifications.id))
    .where(and(...whereConditions))
    .orderBy(asc(xrfVerifications.verificationDate), asc(xrfVerificationItems.id));

    if (standardsParam.length === 0) {
      const distinct = Array.from(new Set(rawData.map(d => d.standardCode).filter(Boolean)));
      standardsParam = distinct.length > 0 ? distinct : ['LIM01', 'LIM02', 'LIM03', 'LIM04', 'LIM05'];
    }

    // Element field getter map
    const elementValueGetters: Record<string, (d: any) => number | null> = {
      'Ni': (d) => d.ni,
      'Co': (d) => d.co,
      'Fe': (d) => d.fe,
      'CaO': (d) => d.cao,
      'SiO2': (d) => d.sio2,
      'Al2O3': (d) => d.al2o3,
      'MgO': (d) => d.mgo,
      'P': (d) => d.p,
      'S': (d) => d.s,
      'Cr2O3': (d) => d.cr2o3,
      'MnO': (d) => d.mno,
    };

    // Precalculate allElementsData for all 11 elements in-memory (< 2ms)
    const computedAllElements: Record<string, Record<string, Record<string, any>>> = {};

    for (const elKey of ALL_ELEMENTS) {
      const getter = elementValueGetters[elKey] || elementValueGetters['Cr2O3'];
      const currentGrid: Record<string, Record<string, any>> = {};

      for (const std of standardsParam) {
        currentGrid[std] = {};
        const isBlank = std.toUpperCase().includes('BLANK');
        const defaultNominal = isBlank ? 0.000 : 2.0;
        const defaultSigma = isBlank ? 0.010 : 0.08;
        const ref = refMap[std]?.[elKey] || refMap[std.replace('_', ' ')]?.[elKey] || refMap[std.replace(' ', '_')]?.[elKey] || {
          nominalValue: defaultNominal,
          stdevFixed: defaultSigma,
          warningSigma: 2.0,
          actionSigma: 3.0,
        };

        const nominal = ref.nominalValue;
        const sigma = ref.stdevFixed;
        const upperAction = ref.upperAction !== null && ref.upperAction !== undefined ? Number(ref.upperAction) : Number((nominal + 3 * sigma).toFixed(3));
        const upperWarning = ref.upperWarning !== null && ref.upperWarning !== undefined ? Number(ref.upperWarning) : Number((nominal + 2 * sigma).toFixed(3));
        const lowerWarning = ref.lowerWarning !== null && ref.lowerWarning !== undefined ? Number(ref.lowerWarning) : Number((nominal - 2 * sigma).toFixed(3));
        const lowerAction = ref.lowerAction !== null && ref.lowerAction !== undefined ? Number(ref.lowerAction) : Number((nominal - 3 * sigma).toFixed(3));

        for (const inst of instrumentsParam) {
          const pointsForGrid = rawData
            .filter(d => (d.standardCode === std || d.standardCode === std.replace('_', ' ') || d.standardCode === std.replace(' ', '_')) && d.instrumentCode === inst)
            .map((d, idx) => {
              const val = getter(d);
              return {
                index: idx + 1,
                id: d.id,
                date: d.verificationDate,
                week: d.weekNo,
                analyzedAt: d.analyzedAt,
                value: val !== null && val !== undefined ? Number(val) : 0,
                status: d.itemStatus,
              };
            });

          // Kalkulasi Statistik Aktual
          const values = pointsForGrid.map(p => p.value).filter(v => !isNaN(v) && v > 0);
          let mean = 0;
          let median = 0;
          let min = 0;
          let max = 0;
          let actualStdev = 0;

          if (values.length > 0) {
            const sum = values.reduce((a, b) => a + b, 0);
            mean = Number((sum / values.length).toFixed(3));
            
            const sorted = [...values].sort((a, b) => a - b);
            min = sorted[0];
            max = sorted[sorted.length - 1];
            const mid = Math.floor(sorted.length / 2);
            median = sorted.length % 2 !== 0 ? sorted[mid] : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(3));

            if (values.length > 1) {
              const squareDiffs = values.map(v => Math.pow(v - mean, 2));
              const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / (values.length - 1);
              actualStdev = Number(Math.sqrt(avgSquareDiff).toFixed(3));
            }
          }

          currentGrid[std][inst] = {
            limits: {
              nominalValue: nominal,
              stdevFixed: sigma,
              upperAction,
              upperWarning,
              lowerWarning,
              lowerAction,
            },
            statistics: {
              count: values.length,
              mean,
              median,
              min,
              max,
              actualStdev,
            },
            points: pointsForGrid,
          };
        }
      }

      computedAllElements[elKey] = currentGrid;
    }

    const availableStandards = Array.from(new Set(rawData.map(d => d.standardCode).filter(Boolean)));

    // Save to server memory cache
    qcChartCache = {
      cacheKey,
      timestamp: now,
      allElementsData: computedAllElements,
      instruments: instrumentsParam,
      standards: standardsParam,
      availableStandards,
    };

    const targetGrid = computedAllElements[element] || computedAllElements['Cr2O3'] || {};

    return res.json({
      success: true,
      element,
      instruments: instrumentsParam,
      standards: standardsParam,
      availableStandards,
      gridData: targetGrid,
      allElementsData: computedAllElements,
      cached: false,
    });
  } catch (err: any) {
    console.error("[XRF Chart] Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Endpoint Seeding Sample Data Simulasi untuk Demo Awal jika belum ada transaksi
xrfRouter.post("/seed-demo-history", async (_req, res) => {
  try {
    await ensureXrfTables();

    // Cek apakah sudah ada data verifikasi
    const count = await db.select({ count: sql<number>`count(*)` }).from(xrfVerifications);
    if (Number(count[0]?.count) > 20) {
      return res.json({ success: true, message: "Data riwayat sudah ada, tidak perlu seeding demo." });
    }

    const instruments = ['EPSILON_C', 'EPSILON_E'];
    const stdCodes = ['LIM01', 'LIM02', 'LIM03', 'LIM04', 'LIM05'];
    
    // Ambil referensi
    const allRefs = await db.select().from(xrfStandardReferences);
    const refMap: Record<string, Record<string, any>> = {};
    for (const r of allRefs) {
      refMap[r.standardCode] = refMap[r.standardCode] || {};
      refMap[r.standardCode][r.elementName] = r;
    }

    const today = new Date();
    // Buat data 30 hari ke belakang
    for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
      const d = new Date(today);
      d.setDate(d.getDate() - dayOffset);
      const dateStr = d.toISOString().split('T')[0];
      const weekNo = Math.ceil(((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7);

      for (const instCode of instruments) {
        const instName = instCode === 'EPSILON_C' ? 'EPSILON C' : 'EPSILON E';
        const batchCode = `VRF-${dateStr.replace(/-/g, '')}-${instCode}-01`;

        const [header] = await db.insert(xrfVerifications).values({
          batchCode,
          instrumentCode: instCode,
          instrumentName: instName,
          verificationDate: dateStr,
          verificationTime: '00:30',
          shift: '1',
          weekNo,
          operatorNik: 'M0403240177',
          operatorName: 'Aldy Aldersun',
          overallStatus: 'PASS',
        }).returning();

        const itemsToInsert = stdCodes.map((std, seq) => {
          const refs = refMap[std] || {};
          // Tambahkan sedikit noise realistis
          const noise = (Math.random() - 0.48) * 0.04;
          // Simulasi instrumen Epsilon E sedikit drop di hari ke 5-8 seperti di Gambar 6
          const extraDrift = (instCode === 'EPSILON_E' && dayOffset >= 5 && dayOffset <= 8) ? -0.28 : 0;

          const niRef = refs['Ni']?.nominalValue || 1.2;
          const feRef = refs['Fe']?.nominalValue || 45.0;
          const crRef = refs['Cr2O3']?.nominalValue || 2.2;
          const crSigma = refs['Cr2O3']?.stdevFixed || 0.08;

          const cr2o3Val = Number((crRef + (noise * crSigma * 10) + extraDrift).toFixed(3));
          const niVal = Number((niRef + noise * 0.05).toFixed(3));
          const feVal = Number((feRef + noise * 0.5).toFixed(2));

          const rawItem = {
            ni: niVal,
            co: Number((refs['Co']?.nominalValue || 0.13).toFixed(3)),
            fe: feVal,
            cao: Number((refs['CaO']?.nominalValue || 0.05).toFixed(3)),
            sio2: Number((refs['SiO2']?.nominalValue || 8.5).toFixed(2)),
            al2o3: Number((refs['Al2O3']?.nominalValue || 4.0).toFixed(2)),
            mgo: Number((refs['MgO']?.nominalValue || 4.5).toFixed(2)),
            p: 0.002,
            s: 0.13,
            cr2o3: cr2o3Val,
            mno: Number((refs['MnO']?.nominalValue || 1.0).toFixed(2)),
          };

          const { bc, feNi, sumConc, evaluations, itemStatus } = calculateMetricsAndEvaluations(rawItem, refs);

          return {
            verificationId: header.id,
            standardCode: std,
            sampleLabel: `VER-${std} D ${dateStr}`,
            sequenceNo: seq + 1,
            analyzedAt: `${dateStr} 00:${30 + seq * 3}`,
            ...rawItem,
            bc,
            feNi,
            sumConc,
            evaluations,
            itemStatus,
          };
        });

        await db.insert(xrfVerificationItems).values(itemsToInsert);
      }
    }

    return res.json({ success: true, message: "Berhasil generate 30 hari data simulasi untuk demo grafik!" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

function getIsoWeek(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

// 10. POST /import-recap-csv - Import format data Excel/CSV GTS (Epsilon A, B, D / Lab)
xrfRouter.post("/import-recap-csv", async (req, res) => {
  try {
    await ensureXrfTables();
    const { csvContent, targetInstrumentCode } = req.body;
    if (!csvContent || typeof csvContent !== 'string') {
      return res.status(400).json({ success: false, error: "Isi CSV wajib diisi." });
    }

    const parsed = Papa.parse<string[]>(csvContent, { skipEmptyLines: false });
    const rows = parsed.data;

    let defaultInst = targetInstrumentCode || 'EPSILON_A';
    let currentInstrument = defaultInst;

    const rawBatches: Array<{
      instrumentCode: string;
      instrumentName: string;
      date: string;
      time: string;
      weekNo: number;
      items: Array<{
        seqNo: number;
        analyzedAt: string;
        sampleLabel: string;
        stdCode: string;
        ni: number;
        co: number;
        fe: number;
        cao: number;
        sio2: number;
        al2o3: number;
        mgo: number;
        p: number;
        s: number;
        cr2o3: number;
        mno: number;
      }>;
    }> = [];

    let currentBatchItems: any[] = [];
    let currentDate = '';
    let currentTime = '';

    for (let i = 0; i < rows.length; i++) {
      const cols = rows[i];
      if (!cols || cols.length < 5) continue;

      const seqStr = String(cols[0] || '').trim();
      const seq = parseInt(seqStr, 10);
      if (isNaN(seq) || seq < 1 || seq > 25) continue;

      const niVal = parseFloat(cols[4]);
      if (isNaN(niVal)) continue; // ignore #DIV/0! or non-numbers

      // Check if Col 1 has Instrument name (e.g. on row 1 of day)
      if (targetInstrumentCode) {
        currentInstrument = targetInstrumentCode;
      } else {
        const xrfText = String(cols[1] || '').toUpperCase();
        if (xrfText.includes('SUPERMINI') || xrfText.includes('RIGAKU') || xrfText.includes('WDXRF')) {
          currentInstrument = 'SUPERMINI';
        } else if (xrfText.includes('EPSILON A') || xrfText.includes('EPSILON_A')) {
          currentInstrument = 'EPSILON_A';
        } else if (xrfText.includes('EPSILON B') || xrfText.includes('EPSILON_B')) {
          currentInstrument = 'EPSILON_B';
        } else if (xrfText.includes('EPSILON D') || xrfText.includes('EPSILON_D')) {
          currentInstrument = 'EPSILON_D';
        }
      }

      const dateStr = String(cols[2] || '').trim();
      const rawLabel = String(cols[3] || '').trim().toUpperCase();

      let stdCode = 'UNKNOWN';
      if (rawLabel.includes('BLANK A') || rawLabel === 'BLANK A') stdCode = 'BLANK_A';
      else if (rawLabel.includes('BLANK B') || rawLabel.includes('BLANK_B')) stdCode = 'BLANK_B';
      else if (rawLabel.includes('LIM01') || rawLabel.includes('LIM 01')) stdCode = 'LIM01';
      else if (rawLabel.includes('LIM02') || rawLabel.includes('LIM 02')) stdCode = 'LIM02';
      else if (rawLabel.includes('LIM03') || rawLabel.includes('LIM 03')) stdCode = 'LIM03';
      else if (rawLabel.includes('LIM04') || rawLabel.includes('LIM 04')) stdCode = 'LIM04';
      else if (rawLabel.includes('LIM05') || rawLabel.includes('LIM 05')) stdCode = 'LIM05';
      else if (rawLabel.includes('OREAS184') || rawLabel.includes('OREAS 184')) stdCode = 'OREAS184';
      else if (rawLabel.includes('OREAS187') || rawLabel.includes('OREAS 187')) stdCode = 'OREAS187';
      else if (rawLabel.includes('OREAS189') || rawLabel.includes('OREAS 189')) stdCode = 'OREAS189';
      else if (rawLabel.includes('OREAS190') || rawLabel.includes('OREAS 190')) stdCode = 'OREAS190';
      else if (rawLabel.includes('OREAS191') || rawLabel.includes('OREAS 191')) stdCode = 'OREAS191';
      else if (rawLabel.includes('OREAS192') || rawLabel.includes('OREAS 192')) stdCode = 'OREAS192';
      else if (rawLabel.includes('OREAS193') || rawLabel.includes('OREAS 193')) stdCode = 'OREAS193';
      else if (rawLabel.includes('SAP19') || rawLabel.includes('SAP 19')) stdCode = 'SAP19';
      else if (rawLabel.includes('OREAS194') || rawLabel.includes('OREAS 194')) stdCode = 'OREAS194';
      else if (rawLabel.includes('OREAS195') || rawLabel.includes('OREAS 195')) stdCode = 'OREAS195';
      else if (rawLabel.includes('SAP16') || rawLabel.includes('SAP 16')) stdCode = 'SAP16';
      else if (rawLabel.includes('OREAS182') || rawLabel.includes('OREAS 182')) stdCode = 'OREAS182';
      else if (rawLabel.includes('LIM13') || rawLabel.includes('LIM 13')) stdCode = 'LIM13';
      else if (rawLabel.includes('LIM')) stdCode = 'LIM01';
      else if (rawLabel.includes('OREAS')) stdCode = 'OREAS184';

      const [dPart, tPart] = dateStr.split(' ');
      if (!dPart) continue;

      let [day, month, year] = dPart.split('/').map(n => parseInt(n, 10));
      if (isNaN(day) || isNaN(month) || isNaN(year)) continue;
      if (year < 100) year = 2000 + year;

      const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const time = tPart || '00:00';

      const co = parseFloat(cols[5]) || 0;
      const fe = parseFloat(cols[6]) || 0;
      const cao = parseFloat(cols[7]) || 0;
      const sio2 = parseFloat(cols[8]) || 0;
      const al2o3 = parseFloat(cols[9]) || 0;
      const mgo = parseFloat(cols[10]) || 0;
      const p = parseFloat(cols[11]) || 0;
      const s = parseFloat(cols[12]) || 0;
      const cr2o3 = parseFloat(cols[13]) || 0;
      const mno = parseFloat(cols[14]) || 0;

      const itemObj = {
        seqNo: seq,
        analyzedAt: dateStr,
        sampleLabel: rawLabel,
        stdCode,
        ni: niVal,
        co,
        fe,
        cao,
        sio2,
        al2o3,
        mgo,
        p,
        s,
        cr2o3,
        mno,
      };

      if (seq === 1) {
        if (currentBatchItems.length > 0 && currentDate) {
          const dObj = new Date(currentDate);
          rawBatches.push({
            instrumentCode: currentInstrument,
            instrumentName: currentInstrument.replace('_', ' '),
            date: currentDate,
            time: currentTime,
            weekNo: getIsoWeek(dObj),
            items: [...currentBatchItems],
          });
        }
        currentBatchItems = [itemObj];
        currentDate = isoDate;
        currentTime = time;
      } else {
        currentBatchItems.push(itemObj);
      }
    }

    if (currentBatchItems.length > 0 && currentDate) {
      const dObj = new Date(currentDate);
      rawBatches.push({
        instrumentCode: currentInstrument,
        instrumentName: currentInstrument.replace('_', ' '),
        date: currentDate,
        time: currentTime,
        weekNo: getIsoWeek(dObj),
        items: [...currentBatchItems],
      });
    }

    if (rawBatches.length === 0) {
      return res.status(400).json({ success: false, error: "Tidak ada baris data verifikasi yang valid untuk diimport." });
    }

    // Load references
    const allRefs = await db.select().from(xrfStandardReferences);
    const refMap: Record<string, Record<string, any>> = {};
    for (const r of allRefs) {
      refMap[r.standardCode] = refMap[r.standardCode] || {};
      refMap[r.standardCode][r.elementName] = r;
    }

    // Clean previous data for this instrument if requested
    const distinctInstruments = Array.from(new Set(rawBatches.map(b => b.instrumentCode)));
    for (const inst of distinctInstruments) {
      const existing = await db.select({ id: xrfVerifications.id })
        .from(xrfVerifications)
        .where(eq(xrfVerifications.instrumentCode, inst));
      if (existing.length > 0) {
        const ids = existing.map(b => b.id);
        for (let chunk = 0; chunk < ids.length; chunk += 500) {
          const slice = ids.slice(chunk, chunk + 500);
          await db.delete(xrfVerificationItems)
            .where(sql`${xrfVerificationItems.verificationId} IN (${sql.join(slice.map(id => sql`${id}`), sql`, `)})`);
        }
        await db.delete(xrfVerifications).where(eq(xrfVerifications.instrumentCode, inst));
      }
    }

    // Insert batches
    let totalItems = 0;
    for (let i = 0; i < rawBatches.length; i++) {
      const b = rawBatches[i];
      const dateFormatted = b.date.replace(/-/g, '');
      const cleanTime = (b.time || '0000').replace(/[^0-9]/g, '').padEnd(4, '0').slice(0, 4);
      const batchCode = `VRF-${dateFormatted}-${b.instrumentCode.replace('_', '')}-${cleanTime}-${String(i + 1).padStart(3, '0')}`;

      let overallStatus = 'PASS';
      const evaluatedItems = b.items.map(it => {
        const stdRefs = refMap[it.stdCode] || {};
        const { bc, feNi, sumConc, evaluations, itemStatus } = calculateMetricsAndEvaluations(it, stdRefs);
        if (itemStatus === 'FAIL') overallStatus = 'FAIL';
        else if (itemStatus === 'WARNING' && overallStatus !== 'FAIL') overallStatus = 'WARNING';

        return {
          ...it,
          bc,
          feNi,
          sumConc,
          evaluations,
          itemStatus,
        };
      });

      const [header] = await db.insert(xrfVerifications).values({
        batchCode,
        instrumentCode: b.instrumentCode,
        instrumentName: b.instrumentName,
        verificationDate: b.date,
        verificationTime: b.time,
        shift: '1',
        weekNo: b.weekNo,
        operatorNik: 'GTS-OPERATOR',
        operatorName: 'Analis GTS Lab',
        overallStatus,
        notes: `Import Rekap CSV GTS ${b.instrumentName}`,
      }).returning();

      const itemsToInsert = evaluatedItems.map(p => ({
        verificationId: header.id,
        standardCode: p.stdCode,
        sampleLabel: p.sampleLabel,
        sequenceNo: p.seqNo,
        analyzedAt: p.analyzedAt,
        ni: p.ni,
        co: p.co,
        fe: p.fe,
        cao: p.cao,
        sio2: p.sio2,
        al2o3: p.al2o3,
        mgo: p.mgo,
        p: p.p,
        s: p.s,
        cr2o3: p.cr2o3,
        mno: p.mno,
        bc: p.bc,
        feNi: p.feNi,
        sumConc: p.sumConc,
        evaluations: p.evaluations,
        itemStatus: p.itemStatus,
      }));

      await db.insert(xrfVerificationItems).values(itemsToInsert);
      totalItems += itemsToInsert.length;
    }

    // Invalidate chart cache
    qcChartCache = null;

    return res.json({
      success: true,
      message: `Berhasil mengimpor ${rawBatches.length} tanggal analisa (${totalItems} sample standar) untuk instrumen ${distinctInstruments.join(', ')}!`,
      batchCount: rawBatches.length,
      itemCount: totalItems,
      dateRange: {
        from: rawBatches[0]?.date,
        to: rawBatches[rawBatches.length - 1]?.date,
      },
      instruments: distinctInstruments,
    });
  } catch (err: any) {
    console.error("[XRF Import] Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 11. POST /bulk-import-paste - Direct Paste Import for Saprolite (10 std) & Limonite (5 std)
xrfRouter.post("/bulk-import-paste", async (req, res) => {
  try {
    await ensureXrfTables();
    const { 
      batches, 
      targetInstrumentCode, 
      matrixType,
      operatorNik, 
      operatorName 
    } = req.body;

    if (!Array.isArray(batches) || batches.length === 0) {
      return res.status(400).json({ success: false, error: "Tidak ada data batch verifikasi yang dikirimkan." });
    }

    // Load master standard references for live evaluation
    const allRefs = await db.select().from(xrfStandardReferences);
    const refMap: Record<string, Record<string, any>> = {};
    for (const r of allRefs) {
      refMap[r.standardCode] = refMap[r.standardCode] || {};
      refMap[r.standardCode][r.elementName] = r;
    }

    let totalBatchesInserted = 0;
    let totalItemsInserted = 0;

    for (let i = 0; i < batches.length; i++) {
      const b = batches[i];
      if (!b.items || !Array.isArray(b.items) || b.items.length === 0) continue;

      const instCode = b.instrumentCode || targetInstrumentCode || 'EPSILON_D';
      const instName = b.instrumentName || instCode.replace('_', ' ');
      const vDate = b.verificationDate;
      const vTime = b.verificationTime || '00:00';
      const weekNo = Number(b.weekNo) || 1;

      const dateFormatted = vDate.replace(/[^0-9]/g, '');
      const cleanTime = vTime.replace(/[^0-9]/g, '').padEnd(4, '0').slice(0, 4);
      const batchCode = b.batchCode || `VRF-${dateFormatted}-${instCode.replace('_', '')}-${cleanTime}-${String(i + 1).padStart(3, '0')}`;

      // Smart Upsert: Check if batch on the same date, time, and instrument already exists
      const existing = await db.select({ id: xrfVerifications.id })
        .from(xrfVerifications)
        .where(
          and(
            eq(xrfVerifications.instrumentCode, instCode),
            eq(xrfVerifications.verificationDate, vDate),
            eq(xrfVerifications.verificationTime, vTime)
          )
        );

      if (existing.length > 0) {
        const oldIds = existing.map(e => e.id);
        await db.delete(xrfVerificationItems)
          .where(sql`${xrfVerificationItems.verificationId} IN (${sql.join(oldIds.map(id => sql`${id}`), sql`, `)})`);
        await db.delete(xrfVerifications)
          .where(sql`${xrfVerifications.id} IN (${sql.join(oldIds.map(id => sql`${id}`), sql`, `)})`);
      }

      // Evaluate items against standard references
      let overallStatus = 'PASS';
      const evaluatedItems = b.items.map((it: any, itemIdx: number) => {
        const stdRefs = refMap[it.standardCode] || {};
        const { bc, feNi, sumConc, evaluations, itemStatus } = calculateMetricsAndEvaluations(it, stdRefs);

        // Track overall batch status
        if (itemStatus === 'FAIL') {
          overallStatus = 'FAIL';
        } else if (itemStatus === 'WARNING' && overallStatus !== 'FAIL') {
          overallStatus = 'WARNING';
        }

        return {
          standardCode: it.standardCode,
          sampleLabel: it.sampleLabel || it.displayName || it.standardCode,
          sequenceNo: Number(it.sequenceNo) || (itemIdx + 1),
          analyzedAt: it.analyzedAt || `${vDate} ${vTime}`,
          ni: Number(it.ni) || 0,
          co: Number(it.co) || 0,
          fe: Number(it.fe) || 0,
          cao: Number(it.cao) || 0,
          sio2: Number(it.sio2) || 0,
          al2o3: Number(it.al2o3) || 0,
          mgo: Number(it.mgo) || 0,
          p: Number(it.p) || 0,
          s: Number(it.s) || 0,
          cr2o3: Number(it.cr2o3) || 0,
          mno: Number(it.mno) || 0,
          bc: it.bc !== undefined && !isNaN(Number(it.bc)) ? Number(it.bc) : bc,
          feNi: it.feNi !== undefined && !isNaN(Number(it.feNi)) ? Number(it.feNi) : feNi,
          sumConc: it.sumConc !== undefined && !isNaN(Number(it.sumConc)) ? Number(it.sumConc) : sumConc,
          evaluations: it.evaluations || evaluations,
          itemStatus: it.itemStatus || itemStatus,
        };
      });

      // Insert verification batch header
      // CATATAN: Data dengan overallStatus = 'FAIL' tetap disimpan lengkap ke DB (karena data historis)
      const [header] = await db.insert(xrfVerifications).values({
        batchCode,
        instrumentCode: instCode,
        instrumentName: instName,
        verificationDate: vDate,
        verificationTime: vTime,
        shift: b.shift || '1',
        weekNo,
        operatorNik: operatorNik || b.operatorNik || 'GTS-OPERATOR',
        operatorName: operatorName || b.operatorName || 'Analis GTS Lab',
        overallStatus,
        notes: b.notes || `Direct Paste Excel (${matrixType || 'XRF Verifikasi'})`,
      }).returning();

      // Insert verification items
      const itemsToInsert = evaluatedItems.map((p: any) => ({
        verificationId: header.id,
        standardCode: p.standardCode,
        sampleLabel: p.sampleLabel,
        sequenceNo: p.sequenceNo,
        analyzedAt: p.analyzedAt,
        ni: p.ni,
        co: p.co,
        fe: p.fe,
        cao: p.cao,
        sio2: p.sio2,
        al2o3: p.al2o3,
        mgo: p.mgo,
        p: p.p,
        s: p.s,
        cr2o3: p.cr2o3,
        mno: p.mno,
        bc: p.bc,
        feNi: p.feNi,
        sumConc: p.sumConc,
        evaluations: p.evaluations,
        itemStatus: p.itemStatus,
      }));

      await db.insert(xrfVerificationItems).values(itemsToInsert);
      totalBatchesInserted++;
      totalItemsInserted += itemsToInsert.length;
    }

    // Invalidate chart cache
    qcChartCache = null;

    return res.json({
      success: true,
      message: `Berhasil menyimpan ${totalBatchesInserted} batch verifikasi (${totalItemsInserted} sampel) ke database.`,
      batchCount: totalBatchesInserted,
      itemCount: totalItemsInserted,
    });
  } catch (err: any) {
    console.error("[XRF Bulk Import Paste] Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});


