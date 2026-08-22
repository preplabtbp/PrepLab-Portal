const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');

const allDeps = new Set([
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-dom/client',
  'lucide-react',
  'motion/react',
  'motion',
  'path', 'fs', 'url', 'http', 'https', 'stream', 'crypto', 'events'
]);

let issues = 0;

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        scanDir(full);
      }
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js')) {
      const code = fs.readFileSync(full, 'utf8');
      const lines = code.split('\n');
      for (const line of lines) {
        const m = line.match(/from\s+['"]([^'"]+)['"]/);
        if (m) {
          const mod = m[1];
          if (!mod.startsWith('.') && !mod.startsWith('/') && !mod.startsWith('@/')) {
            const basePkg = mod.startsWith('@') ? mod.split('/').slice(0, 2).join('/') : mod.split('/')[0];
            if (!allDeps.has(basePkg) && !allDeps.has(mod)) {
              console.log('Unrecognized import:', mod, 'in', full);
              issues++;
            }
          }
        }
      }
    }
  }
}

scanDir(path.resolve(__dirname, '../src'));
if (issues === 0) {
  console.log('All imports in src/ are valid and installed!');
} else {
  console.log('Found', issues, 'unrecognized imports.');
}
