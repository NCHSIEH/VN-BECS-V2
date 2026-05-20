

async function testLogin(username, password) {
  console.log(`Testing login for ${username} / ${password}...`);
  const res = await fetch('http://localhost:3000/api/v1/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  const data = await res.json();
  if (res.ok) {
    console.log('Login Success:', data.username, data.role);
  } else {
    console.log('Login Failed:', data.error);
  }
}

async function runTests() {
  await testLogin('admin', 'admin123');
  await testLogin('nurse_hosp_1', '123');
}

runTests();
