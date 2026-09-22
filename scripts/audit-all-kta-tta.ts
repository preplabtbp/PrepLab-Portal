import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';
import { getKtaObligation } from '../src/components/GroupReportScreen';

async function audit() {
  console.log('========================================================================');
  console.log('         AUDIT LENGKAP LAPORAN KTA / TTA SELURUH PERSONIL (W39)         ');
  console.log('========================================================================\n');

  const employeesRes = await db.execute(sql`
    SELECT nik, name, position, jabatan, section, pt, gol 
    FROM employees 
    ORDER BY section, name;
  `);

  const reportsRes = await db.execute(sql`
    SELECT id, nik, name, report_type, week, date, created_at, image_url, description 
    FROM kta_reports 
    WHERE week = 'W39'
    ORDER BY created_at ASC;
  `);

  const reports = reportsRes.rows as any[];
  const employees = employeesRes.rows as any[];

  // Group reports by NIK and Name
  const userReportsMap = new Map<string, any[]>();
  reports.forEach(r => {
    const cleanNik = (r.nik || '').trim().toLowerCase();
    const cleanName = (r.name || '').trim().toLowerCase();
    
    if (cleanNik) {
      const list = userReportsMap.get(cleanNik) || [];
      list.push(r);
      userReportsMap.set(cleanNik, list);
    }
    if (cleanName) {
      const list = userReportsMap.get(cleanName) || [];
      if (!cleanNik || list !== userReportsMap.get(cleanNik)) {
        list.push(r);
        userReportsMap.set(cleanName, list);
      }
    }
  });

  const fullAuditList: any[] = [];
  const partialList: any[] = [];
  const completeList: any[] = [];
  const unsubmittedList: any[] = [];

  for (const emp of employees) {
    const obligation = getKtaObligation(emp.nik, emp.jabatan || emp.position, emp.section);
    const cleanNik = (emp.nik || '').trim().toLowerCase();
    const cleanName = (emp.name || '').trim().toLowerCase();

    const empReports = userReportsMap.get(cleanNik) || userReportsMap.get(cleanName) || [];
    
    const ktaCount = empReports.filter(r => r.report_type === 'KTA').length;
    const ttaCount = empReports.filter(r => r.report_type === 'TTA').length;
    const totalReports = empReports.length;

    let status = 'BELUM';
    let progress = '0/2';

    if (obligation.type === '1_KTA_OR_TTA') {
      progress = `${Math.min(totalReports, 1)}/1`;
      status = totalReports >= 1 ? 'LENGKAP' : 'BELUM';
    } else if (obligation.type === '1_KTA_AND_1_TTA') {
      const hasKta = ktaCount >= 1;
      const hasTta = ttaCount >= 1;
      const score = (hasKta ? 1 : 0) + (hasTta ? 1 : 0);
      progress = `${score}/2`;
      if (hasKta && hasTta) status = 'LENGKAP';
      else if (hasKta || hasTta) status = 'KURANG_1';
      else status = 'BELUM';
    } else if (obligation.type === '2_TTA') {
      progress = `${Math.min(ttaCount, 2)}/2`;
      if (ttaCount >= 2) status = 'LENGKAP';
      else if (ttaCount === 1) status = 'KURANG_1';
      else status = 'BELUM';
    }

    const record = {
      nik: emp.nik,
      name: emp.name,
      section: emp.section,
      jabatan: emp.jabatan || emp.position,
      obligation: obligation.label,
      targetCount: obligation.targetCount,
      ktaCount,
      ttaCount,
      totalReports,
      progress,
      status,
      reports: empReports.map(r => ({
        id: r.id,
        type: r.report_type,
        time: r.created_at,
        img: r.image_url ? 'Ada Foto' : 'Tanpa Foto'
      }))
    };

    fullAuditList.push(record);
    if (status === 'KURANG_1') partialList.push(record);
    else if (status === 'LENGKAP') completeList.push(record);
    else unsubmittedList.push(record);
  }

  console.log(`TOTAL PERSONIL TERDAFTAR: ${employees.length}`);
  console.log(`✅ LENGKAP (${completeList.length})`);
  console.log(`⚠️ KURANG 1 / HANYA CEKLIS 1 (${partialList.length})`);
  console.log(`⏳ BELUM SAMA SEKALI (${unsubmittedList.length})\n`);

  if (partialList.length > 0) {
    console.log('------------------------------------------------------------------------');
    console.log('⚠️ DAFTAR PERSONIL YANG BARU CEKLIS 1 (KURANG 1 DARI KEWAJIBAN):');
    console.log('------------------------------------------------------------------------');
    partialList.forEach((p, idx) => {
      console.log(`${idx + 1}. ${p.name} (${p.nik}) - ${p.jabatan}`);
      console.log(`   Kewajiban: ${p.obligation} | Laporan di DB: KTA=${p.ktaCount}, TTA=${p.ttaCount} (Total: ${p.totalReports})`);
      console.log(`   Detail Laporan:`, p.reports);
      console.log('');
    });
  } else {
    console.log('✓ Tidak ada personil yang berstatus KURANG 1 saat ini.');
  }

  console.log('\n------------------------------------------------------------------------');
  console.log('✅ DAFTAR PERSONIL YANG SUDAH CEKLIS LENGKAP (2/2 atau 1/1):');
  console.log('------------------------------------------------------------------------');
  completeList.forEach((c, idx) => {
    console.log(`${idx + 1}. ${c.name} (${c.nik}) - ${c.obligation} [Progress: ${c.progress}] (KTA: ${c.ktaCount}, TTA: ${c.ttaCount})`);
  });

  process.exit(0);
}

audit().catch(console.error);
