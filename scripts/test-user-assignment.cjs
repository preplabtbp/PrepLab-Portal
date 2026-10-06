require('dotenv').config();

async function testUserAssignment() {
  console.log('--- Testing /api/p5m/schedules/user-assignment ---');
  
  // Test by NIK: 02D25000055
  const resNik = await fetch('http://127.0.0.1:3000/api/p5m/schedules/user-assignment?nik=02D25000055');
  const dataNik = await resNik.json();
  console.log('\nQuery NIK 02D25000055 Result:');
  console.dir(dataNik, { depth: null });

  // Test by Name: Muhamad Anugrah Ramadhan
  const resName = await fetch('http://127.0.0.1:3000/api/p5m/schedules/user-assignment?name=Muhamad%20Anugrah%20Ramadhan');
  const dataName = await resName.json();
  console.log('\nQuery Name Muhamad Anugrah Ramadhan Result:');
  console.dir(dataName, { depth: null });
}

testUserAssignment().catch(console.error);
