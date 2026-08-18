const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');

const pwaOld = `VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'custom-sw.js',
        registerType: 'autoUpdate',
      })`;
const pwaNew = `VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'custom-sw.js',
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
          type: 'module',
        }
      })`;

code = code.replace(pwaOld, pwaNew);
fs.writeFileSync('vite.config.ts', code);
console.log("Patched vite config PWA devOptions");
