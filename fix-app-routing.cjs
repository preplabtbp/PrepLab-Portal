const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add AdminDashboard import
if (!code.includes('import { AdminDashboard }')) {
  code = code.replace(/import { SettingsScreen } from '.\/components\/settings-screen';/, "import { SettingsScreen } from './components/settings-screen';\nimport { AdminDashboard } from './components/admin-dashboard';");
}

// Update activeTab type
code = code.replace(/\| 'roster-admin'>/g, "| 'roster-admin' | 'admin-dashboard'>");

// Add route
if (!code.includes("activeTab === 'admin-dashboard'")) {
  code = code.replace(/\{activeTab === 'settings' && <SettingsScreen[^\}]+\} \/\>}/, "{activeTab === 'settings' && <SettingsScreen inspectorName={inspectorName} onLogoutKaryawan={handleLogoutKaryawan} />}\n        {activeTab === 'admin-dashboard' && <AdminDashboard />}");
}

// Add nav item for dev users
if (!code.includes("label=\"DB Admin\"")) {
  code = code.replace(/label="Pengaturan"/, "label=\"Pengaturan\"\n             active={activeTab === 'settings'}\n             onClick={() => handleNav('settings')}\n           />\n           <NavItem \n             icon={<Settings className=\"w-5 h-5\" />}\n             label=\"DB Admin\"\n             active={activeTab === 'admin-dashboard'}\n             onClick={() => handleNav('admin-dashboard')}\n           />\n{/*");
  code = code.replace(/onClick=\{\(\) => handleNav\('settings'\)\} \/>\n           <NavItem/, "onClick={() => handleNav('settings')} />\n           */}\n           <NavItem");
}

fs.writeFileSync('src/App.tsx', code);
