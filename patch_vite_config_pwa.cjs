const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');

const pwaOld = `VitePWA({
        
        registerType: 'autoUpdate',
      })`;
const pwaNew = `VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'custom-sw.js',
        registerType: 'autoUpdate',
      })`;

code = code.replace(/VitePWA\(\{\s*registerType:\s*'autoUpdate',\s*\}\)/g, pwaNew);
fs.writeFileSync('vite.config.ts', code);
console.log("Patched vite config PWA");
