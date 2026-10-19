export interface CurrentUserInfo {
  nik: string;
  name: string;
  jabatan: string;
  role: string;
  category: 'DEV' | 'MANAGER' | 'SPT' | 'SPV' | 'UNAUTHORIZED';
}

export interface XrfOffspecAuditLog {
  id?: number | string;
  action: 'ISOLATE' | 'RESTORE' | 'CLEAR_ALL' | 'BULK_ISOLATE';
  userNik: string;
  userName: string;
  userJabatan?: string;
  userRole?: string; // 'SPV' | 'SPT' | 'DEV' | 'MANAGER'
  instrumentCode?: string;
  instrumentName?: string;
  standardCode?: string;
  element?: string;
  pointIndex?: number;
  measuredValue?: number;
  nominalValue?: number;
  sigmaDist?: number;
  diff?: number;
  statusLabel?: string;
  reason?: string;
  sampleDate?: string;
  timestamp?: string;
  createdAt?: string;
}

const SUPER_ADMIN_NIKS = [
  '02D25000055',
  '02D24000043',
  '04D21001047',
  '04D24000042',
  'M0403240177',
];

/**
 * Validasi otorisasi pengguna untuk fitur Take Out / Isolasi Data Off-Spec:
 * HANYA: SPV Lab, SPT Lab, Developer, dan Manager.
 */
export function getTakeoutUserAuth(explicitUser?: {
  nik?: string;
  name?: string;
  jabatan?: string;
  role?: string;
}): {
  allowed: boolean;
  userInfo: CurrentUserInfo;
  reason?: string;
} {
  let nik = (explicitUser?.nik || localStorage.getItem('p2h_inspector_nik') || '').trim();
  let name = (explicitUser?.name || localStorage.getItem('p2h_inspector_name') || 'Petugas Lab').trim();
  let jabatan = (explicitUser?.jabatan || localStorage.getItem('p2h_inspector_jabatan') || '').trim();
  let role = (explicitUser?.role || '').trim();

  // Ambil profile tambahan dari storage jika ada
  try {
    const rawProfile = localStorage.getItem('p2h_inspector_profile');
    if (rawProfile) {
      const p = JSON.parse(rawProfile);
      if (!nik && p.nik) nik = String(p.nik).trim();
      if ((!name || name === 'Petugas Lab') && (p.name || p.nama)) name = String(p.name || p.nama).trim();
      if (!jabatan && (p.jabatan || p.position)) jabatan = String(p.jabatan || p.position).trim();
      if (!role && p.role) role = String(p.role).trim();
    }
  } catch {}

  const isDevFlag = localStorage.getItem('p2h_is_developer') === 'true';
  const combined = `${jabatan} ${role}`.toLowerCase();

  // 1. Cek Developer
  if (
    isDevFlag ||
    SUPER_ADMIN_NIKS.includes(nik) ||
    nik === 'preplabadmin' ||
    nik.startsWith('02D24') ||
    combined.includes('developer')
  ) {
    return {
      allowed: true,
      userInfo: {
        nik: nik || 'DEV',
        name: name || 'Developer',
        jabatan: jabatan || 'Lead Systems Developer',
        role: 'Developer',
        category: 'DEV',
      },
    };
  }

  // 2. Cek Manager
  if (combined.includes('manager')) {
    return {
      allowed: true,
      userInfo: {
        nik,
        name,
        jabatan,
        role: 'Manager',
        category: 'MANAGER',
      },
    };
  }

  // 3. Cek Superintendent (SPT) Lab
  if (combined.includes('superintendent') || combined.includes('spt')) {
    return {
      allowed: true,
      userInfo: {
        nik,
        name,
        jabatan,
        role: 'Superintendent (SPT) Lab',
        category: 'SPT',
      },
    };
  }

  // 4. Cek Supervisor (SPV) Lab
  if (combined.includes('supervisor') || combined.includes('spv')) {
    return {
      allowed: true,
      userInfo: {
        nik,
        name,
        jabatan,
        role: 'Supervisor (SPV) Lab',
        category: 'SPV',
      },
    };
  }

  // 5. Unauthorized (Operator / Analis / Staff biasa)
  return {
    allowed: false,
    userInfo: {
      nik,
      name,
      jabatan: jabatan || 'Staff / Analis Lab',
      role: 'Staff / Analis',
      category: 'UNAUTHORIZED',
    },
    reason: 'Izin Take Out data off-spec dibatasi secara ketat. Hanya Supervisor (SPV) Lab, Superintendent (SPT) Lab, Developer, dan Manager yang memiliki wewenang untuk mengambil tindakan ini.',
  };
}

/**
 * Menyimpan rekaman audit log take out ke database server dan localStorage client-side
 */
export async function recordTakeoutAuditLogs(
  logs: XrfOffspecAuditLog | XrfOffspecAuditLog[]
): Promise<boolean> {
  const list = Array.isArray(logs) ? logs : [logs];
  if (list.length === 0) return true;

  const now = new Date().toISOString();
  const enrichedLogs = list.map(item => ({
    ...item,
    id: item.id || `local-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: item.timestamp || now,
    createdAt: item.createdAt || now,
  }));

  // 1. Simpan ke LocalStorage agar langsung tersedia di UI
  try {
    const existingRaw = localStorage.getItem('xrf_takeout_audit_logs');
    const existing: XrfOffspecAuditLog[] = existingRaw ? JSON.parse(existingRaw) : [];
    const updated = [...enrichedLogs, ...existing].slice(0, 500); // simpan 500 riwayat terbaru
    localStorage.setItem('xrf_takeout_audit_logs', JSON.stringify(updated));
  } catch (err) {
    console.error('[XRF Audit LocalStorage] Error saving local logs:', err);
  }

  // 2. Kirim ke Backend API
  try {
    const res = await fetch('/api/xrf/takeout-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs: enrichedLogs }),
    });
    const json = await res.json();
    return Boolean(json.success);
  } catch (err) {
    console.error('[XRF Audit API] Gagal sinkronisasi log ke server:', err);
    return false;
  }
}

/**
 * Mengambil riwayat audit log take out dari server dengan fallback ke localStorage
 */
export async function fetchTakeoutAuditLogs(filterParams?: {
  instrumentCode?: string;
  standardCode?: string;
  element?: string;
}): Promise<XrfOffspecAuditLog[]> {
  try {
    const params = new URLSearchParams();
    if (filterParams?.instrumentCode && filterParams.instrumentCode !== 'ALL') {
      params.set('instrumentCode', filterParams.instrumentCode);
    }
    if (filterParams?.standardCode && filterParams.standardCode !== 'ALL') {
      params.set('standardCode', filterParams.standardCode);
    }
    if (filterParams?.element && filterParams.element !== 'ALL') {
      params.set('element', filterParams.element);
    }

    const res = await fetch(`/api/xrf/takeout-logs?${params.toString()}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      return json.data;
    }
  } catch {}

  // Fallback ke localStorage
  try {
    const existingRaw = localStorage.getItem('xrf_takeout_audit_logs');
    if (existingRaw) {
      const logs: XrfOffspecAuditLog[] = JSON.parse(existingRaw);
      return logs.filter(l => {
        if (filterParams?.instrumentCode && filterParams.instrumentCode !== 'ALL' && l.instrumentCode !== filterParams.instrumentCode) return false;
        if (filterParams?.standardCode && filterParams.standardCode !== 'ALL' && l.standardCode !== filterParams.standardCode) return false;
        if (filterParams?.element && filterParams.element !== 'ALL' && l.element !== filterParams.element) return false;
        return true;
      });
    }
  } catch {}

  return [];
}
