const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add lazy import
if (!code.includes('AdminDashboard')) {
  code = code.replace(/const SettingsScreen = lazy[^\n]+;/, "$&\nconst AdminDashboard = lazy(() => import('./components/admin-dashboard').then(m => ({ default: m.AdminDashboard })));");
}

// Add route
if (!code.includes("<AdminDashboard />")) {
  code = code.replace(/\{activeTab === 'settings' && <SettingsScreen[^\}]+\} \/\>}/, "$&\n        {activeTab === 'admin-dashboard' && <AdminDashboard />}");
}

fs.writeFileSync('src/App.tsx', code);
