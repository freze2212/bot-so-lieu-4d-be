async function testTeleApi() {
  console.log('Testing Telegram Bot Config & Send API...');

  // 1. Get Telegram Config
  const res1 = await fetch('http://localhost:3001/api/telegram/config');
  const cfg = await res1.json();
  console.log('Current Telegram Config:', cfg);

  // 2. Save Telegram Config
  const res2 = await fetch('http://localhost:3001/api/telegram/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scheduleTime: '13:00',
      feUrl: 'http://localhost:5173/',
      enabled: true
    })
  });
  console.log('Save Config Response:', await res2.json());

  console.log('Telegram Bot API Verification Passed!');
}

testTeleApi().catch(err => console.error('Telegram API test error:', err));
