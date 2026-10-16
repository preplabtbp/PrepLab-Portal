# Audit Codebase & Perbaikan — 15 Oktober 2026

## Status Keseluruhan

✅ **TypeScript Type Check**: 0 error (`npm run lint`)  
✅ **Test Suite**: 11/11 pass (auth guard tests)  
✅ **Working Tree**: Clean, tanpa .env ter-track  
✅ **Domain Logic**: 29 agendas, split 4/5/9/11 persis CLAUDE.md, tanpa duplikat  

---

## Lima Temuan Audit

### ✅ Temuan 1: Socket.IO CORS Wildcard + Tanpa Auth (AKAN DITANGANI TERPISAH)

**Status**: Teridentifikasi, belum diperbaiki  
**Severity**: HIGH  
**Lokasi**: `server.ts:494-495`, `server.ts:594+`

```typescript
const io = new Server(httpServer, {
  cors: { origin: "*" }  // Wildcard
});
io.on('connection', (socket) => {
  // Tidak ada middleware auth — langsung emit presence data
  socket.emit('presence:init', { onlineUsers: [...], totalOnline: ... });
```

**Dampak**: Siapa pun (origin apapun) bisa connect ke socket, menerima daftar user online (NIK, nama, department, section), lalu spoof sebagai orang lain via `presence:join`.

**Rekomendasi Perbaikan**:
- Tambah `io.use()` middleware yang cek JWT token dari handshake query
- Ubah CORS ke origin tertentu atau middleware auth
- Validasi `presence:join` payload (cek NIK cocok dengan decoded JWT)

---

### ✅ Temuan 2: ISO Week-Year Dicampur dengan Calendar Year — **DIPERBAIKI**

**Status**: FIXED ✓ (commit 7f55a4c)  
**Severity**: MEDIUM (data filter menunjukkan bulan salah di awal tahun)  
**Lokasi**: `monitoring-dashboard.tsx:243`, `monitoring-dashboard.tsx:249`, `GuestMonitoringScreen.tsx:282`, `GuestMonitoringScreen.tsx:286-287`, dll.

**Bug Pattern**:
```typescript
// SALAH: mix calendar year + ISO week
const range = getISOWeekRange(now.getFullYear(), getISOWeek(now));

// Contoh: 2023-01-01 = W52/2022 (ISO)
// Code lama: getISOWeekRange(2023, 52)  → range 2023-12-17 s/d 2023-12-24 ❌
// (tidak mengandung 2023-01-01)
```

**Perbaikan**:
```typescript
// BENAR: gunakan ISO week-year
const range = getISOWeekRange(getISOWeekYear(now), getISOWeek(now));

// atau gunakan helper untuk minggu lalu:
const lastWeekInfo = getLastISOWeek(now);  // returns { week, year }
const range = getISOWeekRange(lastWeekInfo.year, lastWeekInfo.week);
```

**Files Diubah**: `iso-week.ts`, `monitoring-dashboard.tsx`, `GuestMonitoringScreen.tsx`, `wo-list-screen.tsx`, `wo-maintenance-dashboard.tsx`

---

### ✅ Temuan 3: Dropdown Selalu Tampilkan 53 Minggu — **DIPERBAIKI**

**Status**: FIXED ✓ (commit 7f55a4c)  
**Severity**: MEDIUM (user bisa filter minggu yang tidak ada)  
**Lokasi**: `iso-week.ts:114-130` (getYearISOWeeksList)

**Bug**:
```typescript
for (let w = 53; w >= 1; w--) {  // Loop tetap 1-53 tanpa cek
  const range = getISOWeekRange(year, w);
  // ...
}
// Hasil untuk 2025: list tampilkan W53 padahal 2025 hanya punya W52
```

**Perbaikan**:
```typescript
// Helper baru: cek apakah year punya W53
export function getLastISOWeekOfYear(year: number): number {
  const range53 = getISOWeekRange(year, 53);
  const week = getISOWeek(range53.start);
  return (week === 53) ? 53 : 52;
}

// Gunakan di getYearISOWeeksList:
const maxWeek = getLastISOWeekOfYear(year);
for (let w = maxWeek; w >= 1; w--) { ... }
```

**Verifikasi**:
- 2021, 2024, 2025, 2022: 52 minggu ✓
- 2026: 53 minggu ✓

---

### ✅ Temuan 4: Math.max(1, getISOWeek(now) - 1) Salah untuk W1 — **DIPERBAIKI**

**Status**: FIXED ✓ (commit 7f55a4c)  
**Severity**: LOW-MEDIUM (display salah di W1, data filter tetap OK)  
**Lokasi**: `monitoring-dashboard.tsx:248`, `monitoring-dashboard.tsx:509`, `GuestMonitoringScreen.tsx:286`, `GuestMonitoringScreen.tsx:677`, `wo-list-screen.tsx:295`, `wo-maintenance-dashboard.tsx:996`

**Bug Pattern**:
```typescript
const lastWeek = Math.max(1, getISOWeek(now) - 1);
// Saat W1: lastWeek = Max(1, 1 - 1) = 1  ← Sama dengan minggu ini! ❌
// Padahal minggu lalu = W52 atau W53 tahun sebelumnya
```

**Perbaikan**:
```typescript
// Helper baru:
export function getLastISOWeek(dateInput: Date): { week: number; year: number } {
  const lastWeekDate = new Date(dateInput.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { week: getISOWeek(lastWeekDate), year: getISOWeekYear(lastWeekDate) };
}

// Gunakan:
const lastWeekInfo = getLastISOWeek(now);
const range = getISOWeekRange(lastWeekInfo.year, lastWeekInfo.week);
```

**Verifikasi**:
```
2023-01-01 (W52/2022) → last week = W51/2022 ✓
2025-01-02 (W1/2025)  → last week = W52/2024 ✓
2022-01-01 (W52/2021) → last week = W51/2021 ✓
```

---

### ⏳ Temuan 5: 33 npm Vulnerabilities (2 Critical, 14 High)

**Status**: Teridentifikasi, prioritas rendah  
**Severity**: MEDIUM (mostly transitive, dari firebase-admin, xlsx, grpc)

**Critical Advisories**:
- `jspdf <=4.2.0`: Prototype pollution
- `proxy-addr`: Authorization bypass (indirectly via express-rate-limit / body-parser)

**High Advisories** (sampel):
- `@grpc/grpc-js`: Cert validation bypass
- `compression`: Memory leak pada premature close
- `xlsx`: ReDoS + Prototype pollution (NO FIX AVAILABLE)

**Rekomendasi**:
```bash
npm audit fix           # Perbaiki yang bisa
npm audit fix --force   # Untuk @grpc/grpc-js (breaking)
# xlsx tetap harus dipantau — tidak ada fix upstream
```

**Note**: `express.json({ limit: '150mb' })` di server.ts:1011 adalah permukaan potensial DoS (file upload). Wajar jika memang untuk arsip foto, hanya perlu dipantau.

---

## Ringkasan Perbaikan

| Temuan | Status | Jenis | Effort | Files |
|--------|--------|-------|--------|-------|
| #2: ISO week-year | ✅ FIXED | Logic | Low | 5 |
| #3: W53 overcount | ✅ FIXED | Logic | Low | 1 |
| #4: Math.max(1,...) | ✅ FIXED | Logic | Low | 6 |
| #1: Socket.IO auth | ⏳ TODO | Security | Medium | 1 |
| #5: npm vulns | ⏳ TODO | Deps | Medium | package.json |

---

## Commit

```
commit 7f55a4c
Author: Claude Sonnet 5
fix: resolve ISO week year/calendar year mismatch and W53 overcount
```

Verifikasi:
- ✓ `npm run lint` (0 error)
- ✓ Round-trip: `iso_2025_52` → range → reparse = W52/2025
- ✓ Edge cases: all January 1st edge cases handled
- ✓ "this" week: now correctly contained in its ISO week range

---

## Rekomendasi Next Steps

1. **High Priority**: Perbaiki Socket.IO auth (temuan #1) — nyata dapat diexploit
2. **Medium Priority**: `npm audit fix` untuk critical vulnerabilities
3. **Monitor**: Pantau xlsx alternatives atau request fix upstream

