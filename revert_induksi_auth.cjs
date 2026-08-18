const fs = require('fs');
let code = fs.readFileSync('src/components/induksi-screen.tsx', 'utf8');

const importRegex = /import { useNavigate } from 'react-router-dom';\nimport { initAuth, googleSignIn, getAccessToken, logout } from '\.\.\/lib\/auth';\nimport type { User } from 'firebase\/auth';/;
if (importRegex.test(code)) {
    code = code.replace(importRegex, "import { useNavigate } from 'react-router-dom';");
    console.log("Reverted imports");
}

const stateRegex = /  const \[isSubmitting, setIsSubmitting\] = useState\(false\);\n  const \[needsAuth, setNeedsAuth\] = useState\(true\);\n  const \[isLoggingIn, setIsLoggingIn\] = useState\(false\);\n  const \[token, setToken\] = useState<string \| null>\(null\);\n\n  useEffect\(\(\) => {\n    const unsubscribe = initAuth\(\n      \(user, t\) => { setNeedsAuth\(false\); setToken\(t\); },\n      \(\) => setNeedsAuth\(true\)\n    \);\n    return \(\) => unsubscribe\(\);\n  }, \[\]\);\n\n  const handleLogin = async \(\) => {\n    setIsLoggingIn\(true\);\n    try {\n      const result = await googleSignIn\(\);\n      if \(result\) {\n        setToken\(result.accessToken\);\n        setNeedsAuth\(false\);\n      }\n    } catch \(err\) {\n      console.error\('Login failed:', err\);\n      toast.error\('Gagal login Google Workspace'\);\n    } finally {\n      setIsLoggingIn\(false\);\n    }\n  };/;

const authStates = `  const [isSubmitting, setIsSubmitting] = useState(false);`;
if (stateRegex.test(code)) {
    code = code.replace(stateRegex, authStates);
    console.log("Reverted states");
}

const fetchRegex = /      if \(!token\) {\n        toast.error\('Sesi OAuth habis, silakan login ulang.'\);\n        setNeedsAuth\(true\);\n        return;\n      }\n      const res = await fetch\('\/api\/induksi', {\n        method: 'POST',\n        headers: \{ \n           'Content-Type': 'application\/json',\n           'Authorization': \`Bearer \$\{token\}\`\n        \},\n        body: JSON\.stringify\(payload\)\n      }\);/;
const fetchAuth = `      const res = await fetch('/api/induksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });`;
if (fetchRegex.test(code)) {
    code = code.replace(fetchRegex, fetchAuth);
    console.log("Reverted fetch");
}

const returnRegex = /  if \(needsAuth\) {[\s\S]*?return \(\n    <div className="max-w-4xl mx-auto space-y-6">/;
const returnAuth = `  return (
    <div className="max-w-4xl mx-auto space-y-6">`;
if (returnRegex.test(code)) {
    code = code.replace(returnRegex, returnAuth);
    console.log("Reverted return");
}

fs.writeFileSync('src/components/induksi-screen.tsx', code);
