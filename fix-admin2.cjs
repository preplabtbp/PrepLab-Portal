const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add route
if (!code.includes("<AdminDashboard />")) {
  code = code.replace(/\{activeTab === 'settings' && <SettingsScreen [^>]+ \/>\}/, "$&\n        {activeTab === 'admin-dashboard' && <AdminDashboard />}");
}

fs.writeFileSync('src/App.tsx', code);
