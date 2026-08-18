const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const navItemCode = `
function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={\`flex flex-col items-center justify-center w-16 h-full transition-all \${active ? 'text-teal-600 font-semibold' : 'text-slate-400 hover:text-slate-600'}\`}
    >
      <div className={\`\${active ? 'scale-110 mb-1' : 'scale-100 mb-1'} transition-transform\`}>{icon}</div>
      <span className="text-[10px] whitespace-nowrap">{label}</span>
    </button>
  );
}
`;

if (!code.includes('function NavItem')) {
  code += navItemCode;
  fs.writeFileSync('src/App.tsx', code);
}
