const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes("import React")) {
  code = "import React, { useState, useEffect, Suspense, lazy, useRef, useMemo, useCallback } from 'react';\n" + code;
}

fs.writeFileSync('src/App.tsx', code);
