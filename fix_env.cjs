const fs = require('fs');
let code = fs.readFileSync('server_refactored_preview.ts', 'utf8');

code = code.replace(/const vapidPublicKey = .*?;/g, 'const vapidPublicKey = env.VAPID_PUBLIC_KEY as string;');
code = code.replace(/const vapidPrivateKey = .*?;/g, 'const vapidPrivateKey = env.VAPID_PRIVATE_KEY as string;');

code = code.replace(/import express from 'express';/g, 'import express from \'express\';\nimport { env, validateEnv } from "./server/config/env.js";\nvalidateEnv();');

fs.writeFileSync('server_refactored_preview.ts', code);
