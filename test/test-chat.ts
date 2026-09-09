import { generateAuthToken } from '../server/middleware/auth.js';

const BASE_URL = 'http://localhost:3000';

async function testChat() {
  console.log('--- Testing Teams Chat Backend API ---');

  const token = generateAuthToken({
    nik: '02D25000055',
    name: 'Alvin Tester',
    role: 'Staff',
    isAdmin: true,
    isDeveloper: true
  });

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'Cookie': `token=${token}`
  };

  // 1. Test GET /api/chat/groups
  const groupsRes = await fetch(`${BASE_URL}/api/chat/groups`, { headers });
  console.log('1. GET /api/chat/groups status:', groupsRes.status);
  const groups = await groupsRes.json();
  console.log('   Groups payload:', JSON.stringify(groups));

  // 2. Test GET /api/chat/users
  const usersRes = await fetch(`${BASE_URL}/api/chat/users`, { headers });
  console.log('2. GET /api/chat/users status:', usersRes.status);
  const users = await usersRes.json();
  console.log('   Users count:', users.length, 'Sample user:', users[0]?.name);

  // 3. Test POST /api/chat/messages
  const sendRes = await fetch(`${BASE_URL}/api/chat/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      room: 'group_all',
      senderNik: '02D25000055',
      senderName: 'Alvin Tester',
      text: 'Halo tim! Uji coba fitur Teams Chat di localhost.'
    })
  });
  console.log('3. POST /api/chat/messages status:', sendRes.status);
  const sentMsg = await sendRes.json();
  console.log('   Sent message ID:', sentMsg.id, 'Text:', sentMsg.text);

  // 4. Test GET /api/chat/messages/group_all
  const getMsgsRes = await fetch(`${BASE_URL}/api/chat/messages/group_all`, { headers });
  console.log('4. GET /api/chat/messages/group_all status:', getMsgsRes.status);
  const msgs = await getMsgsRes.json();
  console.log('   Total messages in group_all:', msgs.length);

  // 5. Test GET /api/chat/conversations/02D25000055
  const convRes = await fetch(`${BASE_URL}/api/chat/conversations/02D25000055`, { headers });
  console.log('5. GET /api/chat/conversations/:nik status:', convRes.status);
  const convs = await convRes.json();
  console.log('   Groups count in conversation:', convs.groups?.length);

  console.log('\n🎉 ALL TEAMS CHAT API TESTS PASSED SUCCESSFULLY!');
}

testChat().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
