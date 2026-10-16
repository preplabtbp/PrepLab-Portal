# Prompt Perbaikan Temuan #1 & #5 — Antigravity

## Temuan #1: Socket.IO CORS Wildcard + Tanpa Auth

### Severity: HIGH
### File: `server.ts` (line 494-495, 594+)

---

### Context

Saat ini Socket.IO dibuka dengan:
```typescript
// server.ts:494-495
const io = new Server(httpServer, {
  cors: { origin: "*" }  // Wildcard — siapa pun bisa connect
});

// server.ts:594+
io.on('connection', (socket) => {
  // Langsung emit presence data TANPA auth check
  socket.emit('presence:init', { 
    onlineUsers: getUniqueOnlineUsers(),  // NIK, nama, dept, section
    totalOnline: getUniqueOnlineUsers().length 
  });
  
  // User bisa spoof via presence:join tanpa validasi
  socket.on('presence:join', (user) => {
    if (!user || !user.nik) return;
    onlineSockets.set(socket.id, { ...user, socketId: socket.id, ... });
  });
});
```

**Masalah**: 
1. Siapa pun dari origin manapun bisa connect
2. Begitu connect, dapat daftar personil online (NIK, nama, dept, section)
3. Bisa spoof `presence:join` dengan NIK orang lain — impersonate user

**Kontras dengan**: REST API sudah punya `authMiddleware` yang ketat (terbukti 11/11 auth tests lolos)

---

### Requirement Perbaikan

1. **Auth Middleware pada Socket.IO**:
   - Cek JWT token dari `socket.handshake.query.token` atau `socket.handshake.auth.token`
   - Gunakan `io.use()` middleware (BEFORE `io.on('connection', ...)`)
   - Reject jika token invalid atau expired
   - Extract NIK dari decoded JWT, simpan di `socket.data.nik`

2. **Validasi `presence:join`**:
   - Cek NIK dari payload cocok dengan `socket.data.nik` (dari JWT)
   - Reject jika NIK di payload ≠ NIK di JWT

3. **CORS Restrict**:
   - Ganti `origin: "*"` dengan origin spesifik (atau middleware auth cukup)
   - Contoh: `origin: process.env.FRONTEND_URL || 'http://localhost:5173'`

4. **Backward Compat**:
   - Socket disconnect gracefully jika auth fail (jangan crash server)
   - Log attempt yang didapat-reject untuk audit

---

### Implementation Guide

```typescript
// server.ts — tambahkan di atas io.on('connection', ...)

import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './server/middleware/auth';

const io = new Server(httpServer, {
  cors: { 
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true 
  }
});

// AUTH MIDDLEWARE
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  
  if (!token) {
    console.warn(`[Socket] Reject connection: no token`);
    return next(new Error('Authentication required'));
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    socket.data.nik = decoded.nik;
    socket.data.name = decoded.name;
    socket.data.userId = decoded.id;
    next();
  } catch (err: any) {
    console.warn(`[Socket] Reject connection: invalid token — ${err.message}`);
    next(new Error('Invalid token'));
  }
});

// CONNECTION — setelah auth middleware
io.on('connection', (socket) => {
  console.log(`[Socket] User ${socket.data.nik} connected (${socket.id})`);
  
  socket.emit('presence:init', { 
    onlineUsers: getUniqueOnlineUsers(), 
    totalOnline: getUniqueOnlineUsers().length 
  });

  socket.on('presence:join', (user) => {
    // VALIDASI: NIK dari payload harus match JWT
    if (!user || !user.nik) {
      console.warn(`[Socket ${socket.id}] presence:join: missing nik`);
      return;
    }
    
    if (user.nik !== socket.data.nik) {
      console.warn(`[Socket ${socket.id}] presence:join: NIK mismatch! payload=${user.nik}, jwt=${socket.data.nik}`);
      socket.disconnect(true);  // Force disconnect untuk security
      return;
    }
    
    const existing = onlineSockets.get(socket.id) || {};
    onlineSockets.set(socket.id, {
      ...existing,
      ...user,
      socketId: socket.id,
      lastActive: Date.now()
    });
    broadcastPresence();
  });

  // ... rest of handlers
});
```

---

### Testing

1. **Unit Test**: 
   - Try connect tanpa token → reject
   - Try connect dengan invalid token → reject
   - Try `presence:join` dengan NIK berbeda dari JWT → disconnect

2. **Manual Test**:
   - Client kirim token valid → connect OK
   - Client kirim `presence:join` dengan NIK sesuai JWT → OK
   - Client kirim `presence:join` dengan NIK berbeda → force disconnect

3. **Check Logs**:
   - `[Socket] User <NIK> connected`
   - `[Socket] Reject connection: ...`

---

## Temuan #5: 33 npm Vulnerabilities

### Severity: MEDIUM
### File: `package.json`, `package-lock.json`

---

### Critical Advisories (2)

1. **jspdf <=4.2.0** — Prototype Pollution
   ```bash
   npm audit fix  # Should upgrade to 4.3.0+
   ```

2. **proxy-addr** — Authorization bypass (indirect via express-rate-limit)
   ```bash
   npm audit fix  # Should upgrade transitive dependency
   ```

---

### High Advisories (14) — Sampel

| Package | Issue | Fix |
|---------|-------|-----|
| `@grpc/grpc-js` | Cert validation bypass | `npm audit fix --force` |
| `compression` | Memory leak on close | `npm audit fix` |
| `@fastify/busboy` | DoS via multipart | `npm audit fix` |
| `brace-expansion` | ReDoS/stack exhaustion | `npm audit fix` |
| `xlsx` | ReDoS + prototype pollution | **NO FIX** — monitor upstream |

---

### Action Plan

**Option A: Automatic Fix (Recommended for Low Risk)**
```bash
cd C:\Users\ADRYANSYAH\Documents\ALVIN\Project\PrepLab-Portal

# 1. Safe fixes (most advisories)
npm audit fix

# 2. Review what changed
git diff package-lock.json | head -100

# 3. Run tests
npm run lint
npm test

# 4. Test app locally
npm run dev
# Manual test: access /api endpoints, check socket.io, etc.

# 5. If safe, commit
git add package-lock.json
git commit -m "fix(deps): update dependencies via npm audit fix"
```

**Option B: Manual (If Force Fails or Tests Break)**
```bash
# Upgrade specific high-severity packages
npm install --save-exact jspdf@latest compression@latest @grpc/grpc-js@latest

# Then test
npm run lint && npm test
```

**Option C: Defer Non-Critical**
- `xlsx` tidak punya fix — document di SECURITY_AUDIT.md
- `@google-cloud/storage` (firebase transitive) — monitor

---

### Acceptance Criteria

- [ ] `npm audit --omit=dev` menunjukkan ≤5 vulnerabilities (semua low/moderate)
- [ ] Atau jika ada sisa, dokumentasi alasan di `SECURITY_AUDIT.md`
- [ ] `npm run lint` lolos (0 error)
- [ ] `npm test` lolos (11/11 auth guard tests)
- [ ] Manual test: REST API respond 200, Socket.IO connect & auth OK
- [ ] Commit message: `fix(deps): resolve npm audit vulnerabilities`

---

## Checklist Perbaikan

### Temuan #1 (Socket.IO Auth)

- [ ] Add `io.use()` JWT auth middleware
- [ ] Validate `presence:join` NIK ≠ JWT NIK → force disconnect
- [ ] Update CORS dari wildcard ke specific origin
- [ ] Add console logs untuk audit trail
- [ ] Manual test: socket connect without token → reject
- [ ] Manual test: socket send presence:join with wrong NIK → disconnect
- [ ] `npm run lint` pass (0 error)
- [ ] `npm test` pass (11/11)
- [ ] Commit ke `main` dengan message descriptive

### Temuan #5 (npm Audit)

- [ ] `npm audit fix` (auto)
- [ ] Check `git diff package-lock.json` — acceptable changes?
- [ ] `npm run lint` pass
- [ ] `npm test` pass
- [ ] Manual browser test: any regressions?
- [ ] If unsafe: document reason di `SECURITY_AUDIT.md`
- [ ] Commit message: describe which advisories fixed

---

## References

- Socket.IO Middleware: https://socket.io/docs/v4/server-middleware/
- JWT from Handshake: https://socket.io/docs/v4/server-api/#sockethandshake
- npm audit: https://docs.npmjs.com/cli/v8/commands/npm-audit
- Existing Auth: `server/middleware/auth.ts` (untuk reference JWT_SECRET & verify logic)

