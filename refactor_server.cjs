const fs = require('fs');

const content = fs.readFileSync('server.ts', 'utf8');
const lines = content.split('\n');

const routesToExtract = [
  { prefix: '/api/bulletin', file: 'server/routes/bulletin.ts' },
  { prefix: '/api/quiz-', file: 'server/routes/quiz.ts' },
  { prefix: '/api/notifications', file: 'server/routes/notifications.ts' },
  { prefix: '/api/equipments', file: 'server/routes/workOrders.ts' },
  { prefix: '/api/work-orders', file: 'server/routes/workOrders.ts' },
  { prefix: '/api/tickets', file: 'server/routes/workOrders.ts' },
  { prefix: '/api/spareparts', file: 'server/routes/workOrders.ts' },
  { prefix: '/api/inspections', file: 'server/routes/inspections.ts' },
  { prefix: '/api/pemantauan', file: 'server/routes/inspections.ts' },
  { prefix: '/api/downtime', file: 'server/routes/inspections.ts' },
  { prefix: '/api/apd', file: 'server/routes/apd.ts' },
  { prefix: '/api/admin', file: 'server/routes/admin.ts' },
  { prefix: '/api/agenda', file: 'server/routes/agenda.ts' },
  { prefix: '/api/preplab-cloud-', file: 'server/routes/cloud.ts' },
  { prefix: '/api/files', file: 'server/routes/cloud.ts' },
  { prefix: '/api/upload', file: 'server/routes/cloud.ts' },
  { prefix: '/api/pdf', file: 'server/routes/misc.ts' },
  { prefix: '/api/settings', file: 'server/routes/misc.ts' },
  { prefix: '/api/notes', file: 'server/routes/misc.ts' },
  { prefix: '/api/themes', file: 'server/routes/misc.ts' },
  { prefix: '/api/meal-reports', file: 'server/routes/misc.ts' },
  { prefix: '/api/induksi', file: 'server/routes/misc.ts' },
  { prefix: '/api/health', file: 'server/routes/misc.ts' },
  { prefix: '/api/roster', file: 'server/routes/roster.ts' },
  { prefix: '/api/questions', file: 'server/routes/misc.ts' },
  { prefix: '/api/gallery', file: 'server/routes/misc.ts' },
  { prefix: '/api/chat', file: 'server/routes/misc.ts' },
  { prefix: '/api/vapid', file: 'server/routes/misc.ts' },
  { prefix: '/api/push', file: 'server/routes/misc.ts' }
];

let filesContent = {};
let i = 0;
let modifiedLines = [];
let braceCount = 0;
let inRoute = false;
let currentRouteLines = [];
let currentTargetFile = null;

while (i < lines.length) {
  let line = lines[i];
  
  if (!inRoute) {
    const match = line.match(/^\s*app\.(get|post|put|delete)\(\s*['"](\/api\/[^'"]+)['"]/);
    if (match) {
      const endpoint = match[2];
      const targetRoute = routesToExtract.find(r => endpoint.startsWith(r.prefix));
      if (targetRoute) {
        inRoute = true;
        currentTargetFile = targetRoute.file;
        currentRouteLines = [];
        braceCount = 0;
      }
    }
  }
  
  if (inRoute) {
    currentRouteLines.push(line);
    const cleanLine = line.replace(/(["'`].*?["'`]|\/\/.*)/g, '');
    const opens = (cleanLine.match(/\{/g) || []).length;
    const closes = (cleanLine.match(/\}/g) || []).length;
    braceCount += opens;
    braceCount -= closes;
    
    // Check for standard route closures
    if (braceCount <= 0 && line.trim().endsWith('});')) {
      if (!filesContent[currentTargetFile]) {
         filesContent[currentTargetFile] = [];
      }
      const routerLines = currentRouteLines.map(l => l.replace(/^\s*app\./, 'router.'));
      filesContent[currentTargetFile].push(routerLines.join('\n'));
      inRoute = false;
    }
  } else {
    modifiedLines.push(line);
  }
  i++;
}

// Add imports for the new routers in server_refactored_preview.ts
let importStatements = [];
let useStatements = [];
Object.keys(filesContent).forEach(file => {
  const routerName = file.split('/').pop().replace('.ts', 'Router');
  importStatements.push(`import { router as ${routerName} } from "./${file.replace('.ts', '.js')}";`);
  useStatements.push(`app.use("/", ${routerName});`);
});

// find place to insert imports
const appUseAuthIndex = modifiedLines.findIndex(l => l.includes('app.use("/api/auth"'));
if (appUseAuthIndex !== -1) {
    modifiedLines.splice(appUseAuthIndex + 1, 0, ...useStatements);
} else {
    modifiedLines.push(...useStatements);
}

// find place to insert imports at top
const expressImportIndex = modifiedLines.findIndex(l => l.includes('import express from'));
if (expressImportIndex !== -1) {
    modifiedLines.splice(expressImportIndex + 1, 0, ...importStatements);
}

fs.writeFileSync('server_refactored_preview.ts', modifiedLines.join('\n'));

if (!fs.existsSync('server/routes')) {
    fs.mkdirSync('server/routes', { recursive: true });
}

for (const [file, contents] of Object.entries(filesContent)) {
  const routerCode = `import { Router } from "express";
import { db } from "../../src/db/index.js";
import { eq, desc, or, inArray, isNull, and, gte, lte } from "drizzle-orm";
import { 
  chatMessages, employees, equipments, workOrders, users, tickets, downtime, 
  spareparts, apdSettings, apdHistory, apdDocuments, roster, inspections, 
  pemantauan, questions, agendaEvents, privateNotes, userThemes, bulletinPosts, 
  notifications, bulletinComments, uploadedFiles, appSettings, pelanggaran, 
  mealReports, pushSubscriptions, quizQuestions, preplabCloudLogs, quizScores, induksi
} from "../../src/db/schema.js";
import { generatePdfFromTemplate, drive } from '../../google-services.js';
import { 
  sendWebPush, getUniverse, uploadFileToDrive, syncBulletinToAgenda, 
  getNotificationTargets, getTableObj, sanitizePayload 
} from "../utils.js";
import webpush from 'web-push';
import path from "path";

export const router = Router();

${contents.join('\n\n')}
`;
  fs.writeFileSync(file, routerCode);
}

console.log('Successfully extracted routes.');
