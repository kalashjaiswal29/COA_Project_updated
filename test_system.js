const http = require('http');

const checkService = (name, url) => {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      // If we get any HTTP response, the server is "alive" and listening on the port
      resolve({ name, url, status: res.statusCode, ok: true });
    }).on('error', (err) => {
      resolve({ name, url, error: err.message, ok: false });
    });
    
    // Timeout of 3 seconds
    req.setTimeout(3000, () => {
      req.destroy();
      resolve({ name, url, error: 'Connection timeout (3000ms)', ok: false });
    });
  });
};

const runHealthCheck = async () => {
  console.log('\n🔍 Running System Health Check...\n');

  const services = [
    { name: 'React Frontend (Vite)', url: 'http://localhost:5173/' },
    { name: 'Node.js Backend (Express)', url: 'http://localhost:5000/' }, 
    { name: 'Python CV Backend (FastAPI)', url: 'http://localhost:8000/health' }
  ];

  const results = await Promise.all(services.map(s => checkService(s.name, s.url)));

  let allOnline = true;

  results.forEach(res => {
    if (res.ok) {
      console.log(`✅ [ONLINE]  ${res.name.padEnd(28)} | ${res.url}`);
    } else {
      console.log(`❌ [OFFLINE] ${res.name.padEnd(28)} | Error: ${res.error}`);
      allOnline = false;
    }
  });

  console.log('\n---------------------------------------------------------------');
  if (allOnline) {
    // Print in green text
    console.log('\x1b[32m%s\x1b[0m', '✅ SYSTEM ONLINE: All microservices are running normally!');
  } else {
    // Print in red text
    console.log('\x1b[31m%s\x1b[0m', '❌ SYSTEM ERROR: One or more services failed to boot.');
  }
  console.log('---------------------------------------------------------------\n');
};

runHealthCheck();
