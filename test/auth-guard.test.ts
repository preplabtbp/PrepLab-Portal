/**
 * Automated Security Test: Centralized API Authentication Guard
 * Run via: npm test or npm run test:auth
 */

declare const process: {
  env: Record<string, string | undefined>;
  exit: (code?: number) => never;
};

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

const PROTECTED_ROUTES = [
  '/api/employees',
  '/api/tickets',
  '/api/roster',
  '/api/inspections',
  '/api/notifications',
  '/api/bulletin-posts',
  '/api/agenda',
  '/api/workorders',
  '/api/admin/tables/employees'
];

const ALLOWLIST_ROUTES = [
  { path: '/api/auth/check-nik', method: 'POST', body: { nik: '02D25000055' } },
  { path: '/api/health', method: 'GET' }
];

async function runSecurityTests() {
  console.log(`\n🛡️ Running Centralized Auth Guard Security Tests against: ${BASE_URL}\n`);

  let failureCount = 0;
  let successCount = 0;

  // 1. Test Protected Endpoints (Must return 401 Unauthorized when accessed without token)
  console.log('--- 1. Testing Protected Endpoints (Expect HTTP 401) ---');
  for (const path of PROTECTED_ROUTES) {
    try {
      const res = await fetch(`${BASE_URL}${path}`);
      if (res.status === 401) {
        console.log(`  ✅ PASS: ${path} returned 401 Unauthorized`);
        successCount++;
      } else {
        console.error(`  ❌ FAIL: ${path} returned ${res.status} (Expected 401)`);
        failureCount++;
      }
    } catch (err) {
      console.error(`  ❌ ERROR: Could not connect to ${BASE_URL}${path}:`, (err as Error).message);
      failureCount++;
    }
  }

  // 2. Test Allowlist Endpoints (Must NOT return 401)
  console.log('\n--- 2. Testing Allowlisted Public Endpoints (Expect Non-401) ---');
  for (const item of ALLOWLIST_ROUTES) {
    try {
      const res = await fetch(`${BASE_URL}${item.path}`, {
        method: item.method,
        headers: item.body ? { 'Content-Type': 'application/json' } : undefined,
        body: item.body ? JSON.stringify(item.body) : undefined
      });
      if (res.status !== 401) {
        console.log(`  ✅ PASS: ${item.method} ${item.path} returned ${res.status} (Public access allowed)`);
        successCount++;
      } else {
        console.error(`  ❌ FAIL: ${item.method} ${item.path} was blocked with 401`);
        failureCount++;
      }
    } catch (err) {
      console.error(`  ❌ ERROR: Could not connect to ${BASE_URL}${item.path}:`, (err as Error).message);
      failureCount++;
    }
  }

  // 3. Summary
  console.log(`\n========================================`);
  console.log(`Total Passed: ${successCount} | Total Failed: ${failureCount}`);
  console.log(`========================================\n`);

  if (failureCount > 0) {
    console.error('🚨 Security Guard Test Suite FAILED! Centralized auth guard has regressions.\n');
    process.exit(1);
  } else {
    console.log('🎉 Centralized Auth Guard Test Suite PASSED! All routes are securely protected.\n');
    process.exit(0);
  }
}

runSecurityTests();
