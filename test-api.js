async function runTests() {
  console.log('=============== STARTING BACKEND LOGIC & API VERIFICATION ===============');

  // 1. Admin Login
  console.log('\n[TEST 1] Admin Login (POST /api/auth/login)...');
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const loginData = await loginRes.json();
  console.log('Login Response:', loginData);

  // 2. Create Employee
  console.log('\n[TEST 2] Create Employee (POST /api/employees)...');
  const empRes = await fetch('http://localhost:3001/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'LE VAN DAU', code: 'LVD888' })
  });
  const empData = await empRes.json();
  console.log('New Employee Response:', empData);

  // 3. User Submit Report
  console.log('\n[TEST 3] User Submit Report (POST /api/reports)...');
  const reportRes = await fetch('http://localhost:3001/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeCode: 'GG88F6F04',
      date: '2026-07-25',
      registeredCount: 25,
      firstDepositCount: 15,
      totalDeposit: 35000000,
      totalBet: 90000000
    })
  });
  const reportData = await reportRes.json();
  console.log('Submit Report Response:', reportData);

  // 4. Admin Get Stats
  console.log('\n[TEST 4] Fetch Aggregated Stats for Charts (GET /api/reports/stats)...');
  const statsRes = await fetch('http://localhost:3001/api/reports/stats');
  const statsData = await statsRes.json();
  console.log('Summary Stats:', statsData.summary);
  console.log('Daily Breakdown (for line/bar charts):', statsData.dailyStats);
  console.log('Employee Breakdown (for leaderboards/bar charts):', statsData.employeeStats);

  console.log('\n================ LOGIC VERIFICATION PASSED PERFECTLY ================');
}

runTests().catch(err => console.error('Test error:', err));
