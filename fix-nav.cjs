const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const replacement = `
        <NavItem 
          icon={<CheckSquare className="w-5 h-5" />} 
          label="WO List" 
          active={activeTab === 'wo-list'} 
          onClick={() => handleNav('wo-list')} 
        />
        <NavItem 
          icon={<Settings className="w-5 h-5" />} 
          label="Pengaturan" 
          active={activeTab === 'settings'} 
          onClick={() => handleNav('settings')} 
        />
        {inspectorNik === '02D25000055' && (
          <NavItem 
            icon={<Settings className="w-5 h-5" />} 
            label="DB Admin" 
            active={activeTab === 'admin-dashboard'} 
            onClick={() => handleNav('admin-dashboard')} 
          />
        )}
      </nav>
    </div>
  );
}
`;

code = code.replace(/<NavItem \s*icon=\{<CheckSquare className="w-5 h-5" \/>\}[\s\S]*\}\s*$/m, replacement.trim());
fs.writeFileSync('src/App.tsx', code);
