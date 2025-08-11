#!/usr/bin/env node

// Simple runtime test to verify the application is working
console.log('🧪 Testing Houdini Clock Runtime...\n');

// Test HTTP endpoint
const http = require('http');

const testEndpoint = () => {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3000', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 && data.includes('root')) {
          console.log('✅ HTTP Server: Responding correctly');
          console.log('✅ HTML: Contains root element');
          resolve(true);
        } else {
          console.log(`❌ HTTP Server: Status ${res.statusCode}`);
          reject(new Error('Server not responding properly'));
        }
      });
    });
    
    req.on('error', (err) => {
      console.log(`❌ HTTP Server: ${err.message}`);
      reject(err);
    });
    
    req.setTimeout(5000, () => {
      console.log('❌ HTTP Server: Timeout');
      reject(new Error('Timeout'));
    });
  });
};

const runTests = async () => {
  try {
    await testEndpoint();
    
    console.log('\n🎯 RESULT: Application is running and accessible!');
    console.log('📱 Open http://localhost:3000 to view the clock');
    console.log('🔧 If you see a blank screen, check browser console for errors');
    
  } catch (error) {
    console.log('\n❌ RESULT: Application not accessible');
    console.log('💡 Try running: npm start');
    console.log(`Error: ${error.message}`);
  }
};

runTests();
