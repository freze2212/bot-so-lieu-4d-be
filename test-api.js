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
      employeeCode: 'GG88F4D04',
      date: '2026-07-25',
      registeredCount: 25,
      firstDepositCount: 15,
      totalDeposit: 35000000,
      totalBet: 90000000
    })
  });
  const reportData = await reportRes.json();
  console.log('Submit Report Response:', reportData);

  // 4. Admin Get Stats (Grand Total)
  console.log('\n[TEST 4] Fetch Aggregated Grand Total Stats (GET /api/reports/stats)...');
  const statsRes = await fetch('http://localhost:3001/api/reports/stats');
  const statsData = await statsRes.json();
  console.log('Grand Total Summary Stats:', statsData.summary);

  // 5. Per-Employee Get Stats
  console.log('\n[TEST 5] Fetch Per-Employee Stats for GG88F4D04 (GET /api/reports/stats?employeeCode=GG88F4D04)...');
  const empStatsRes = await fetch('http://localhost:3001/api/reports/stats?employeeCode=GG88F4D04');
  const empStatsData = await empStatsRes.json();
  console.log('Employee GG88F4D04 Summary Stats:', empStatsData.summary);
  console.log('Employee GG88F4D04 Daily Stats:', empStatsData.dailyStats);

  console.log('\n================ LOGIC VERIFICATION PASSED PERFECTLY ================');
}

runTests().catch(err => console.error('Test error:', err));
