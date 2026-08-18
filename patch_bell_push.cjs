const fs = require('fs');
let code = fs.readFileSync('src/components/notification-bell.tsx', 'utf8');

const importReplacement = `import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, BellRing } from 'lucide-react';
import { format } from 'date-fns';
import { subscribeUserToPush } from '../push-notifications';`;

code = code.replace(/import React, \{ useState, useEffect, useRef \} from 'react';\nimport \{ Bell, Check, X \} from 'lucide-react';\nimport \{ format \} from 'date-fns';/, importReplacement);

const newLogic = `
  const [pushStatus, setPushStatus] = useState<string>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    }
  }, []);

  const handleSubscribe = async () => {
    if (!userNik) return;
    const success = await subscribeUserToPush(userNik);
    if (success) {
      setPushStatus('granted');
      alert('Push notifications enabled!');
    } else {
      alert('Failed to enable push notifications. Check browser settings.');
      if ('Notification' in window) {
        setPushStatus(Notification.permission);
      }
    }
  };
`;

code = code.replace(/const isDev = userNik === '02D25000055' \|\| userNik === 'preplabadmin';/, `const isDev = userNik === '02D25000055' || userNik === 'preplabadmin';\n${newLogic}`);

const subscribeButton = `
            {pushStatus !== 'granted' && (
              <div className="mx-2 mb-2 p-2 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
                <span className="text-xs text-blue-800">Aktifkan Notifikasi Push</span>
                <button onClick={handleSubscribe} className="px-2 py-1 bg-blue-600 text-white text-[10px] rounded hover:bg-blue-700">
                  Aktifkan
                </button>
              </div>
            )}
            <div className="overflow-y-auto flex-1 p-2 space-y-1">`;

code = code.replace(/<div className="overflow-y-auto flex-1 p-2 space-y-1">/, subscribeButton);

fs.writeFileSync('src/components/notification-bell.tsx', code);
console.log("Patched bell with push button");
