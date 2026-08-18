const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /chatMessagesMemory\.push\(newMsg\);\s*io\.to\(room\)\.emit\('new_message', newMsg\);/;
const replacement = `chatMessagesMemory.push(newMsg);
        io.to(room).emit('new_message', newMsg);
        
        // Push notification
        const title = room === 'global' ? 'Global Chat' : \`Chat - \${room}\`;
        try {
          const _n = await db.insert(notifications).values({
            userId: null,
            role: room === 'global' ? null : room,
            title,
            message: \`\${msg.senderName}: \${msg.text}\`,
            type: 'info',
            link: '/chat'
          }).returning();
          sendWebPush(_n);
        } catch(e) { console.error('Chat push error:', e); }`;
        
if (code.match(regex)) {
  fs.writeFileSync('server.ts', code.replace(regex, replacement));
  console.log("Chat notif patched");
} else {
  console.log("Chat not matched!");
}
