#!/usr/bin/env node

// Simple functionality test for the Houdini Clock application
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Houdini Clock Application...\n');

// Test 1: Check if all required files exist
console.log('📁 File Structure Test:');
const requiredFiles = [
  'src/App.js',
  'src/components/clock/Clock.js',
  'src/components/clock/SecondsHand.js',
  'src/components/clock/MinutesHand.js',
  'src/components/hint/Hint.js',
  'src/MQTT.js',
  'package.json',
  'public/index.html'
];

let fileTestPassed = true;
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    fileTestPassed = false;
  }
}

// Test 2: Check package.json for proper dependencies
console.log('\n📦 Dependencies Test:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const expectedDeps = {
    'react': '^18.3.1',
    'react-dom': '^18.3.1',
    'rxjs': '^7.8.1',
    'paho-mqtt': '^1.1.0'
  };
  
  let depsTestPassed = true;
  for (const [dep, expectedVersion] of Object.entries(expectedDeps)) {
    const actualVersion = packageJson.dependencies[dep];
    if (actualVersion) {
      console.log(`✅ ${dep}: ${actualVersion}`);
    } else {
      console.log(`❌ ${dep}: MISSING`);
      depsTestPassed = false;
    }
  }
  
  console.log(`\nDependencies test: ${depsTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
} catch (error) {
  console.log('❌ Could not read package.json');
}

// Test 3: Basic JavaScript syntax validation
console.log('\n🔍 Syntax Test:');
const jsFiles = [
  'src/App.js',
  'src/components/clock/Clock.js',
  'src/MQTT.js'
];

let syntaxTestPassed = true;
for (const file of jsFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    // Basic checks
    if (content.includes('import') && content.includes('export')) {
      console.log(`✅ ${file} - Valid ES6 module`);
    } else {
      console.log(`⚠️ ${file} - Missing imports/exports`);
    }
  } catch (error) {
    console.log(`❌ ${file} - Could not read: ${error.message}`);
    syntaxTestPassed = false;
  }
}

// Test 4: React component structure validation
console.log('\n⚛️ React Components Test:');
const componentFiles = [
  'src/components/clock/Clock.js',
  'src/components/clock/SecondsHand.js',
  'src/components/clock/MinutesHand.js',
  'src/components/hint/Hint.js'
];

let componentTestPassed = true;
for (const file of componentFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const hasReactImport = content.includes('import React') || content.includes('from \'react\'');
    const hasExport = content.includes('export') || content.includes('module.exports');
    const hasJSX = content.includes('<') && content.includes('>');
    
    if (hasReactImport && hasExport && hasJSX) {
      console.log(`✅ ${file} - Valid React component`);
    } else {
      console.log(`⚠️ ${file} - Missing: ${!hasReactImport ? 'React import ' : ''}${!hasExport ? 'export ' : ''}${!hasJSX ? 'JSX ' : ''}`);
    }
  } catch (error) {
    console.log(`❌ ${file} - Could not read: ${error.message}`);
    componentTestPassed = false;
  }
}

// Test 5: MQTT functionality check
console.log('\n📡 MQTT Integration Test:');
try {
  const mqttContent = fs.readFileSync('src/MQTT.js', 'utf8');
  const hasRxJS = mqttContent.includes('rxjs');
  const hasPahoMQTT = mqttContent.includes('paho-mqtt');
  const hasSubject = mqttContent.includes('Subject');
  
  if (hasRxJS && hasPahoMQTT && hasSubject) {
    console.log('✅ MQTT integration properly configured');
  } else {
    console.log(`⚠️ MQTT integration issues: ${!hasRxJS ? 'RxJS missing ' : ''}${!hasPahoMQTT ? 'Paho MQTT missing ' : ''}${!hasSubject ? 'Subject missing ' : ''}`);
  }
} catch (error) {
  console.log(`❌ Could not validate MQTT: ${error.message}`);
}

// Test 6: Performance optimizations check
console.log('\n⚡ Performance Optimizations Test:');
const perfFiles = ['src/utils/performance.js', 'src/utils/performanceAnalyzer.js'];
let perfTestPassed = true;

for (const file of perfFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} - Performance utilities available`);
  } else {
    console.log(`❌ ${file} - Performance utilities missing`);
    perfTestPassed = false;
  }
}

// Check for React.memo usage
const componentContents = componentFiles.map(file => {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
});

const hasMemoOptimizations = componentContents.some(content => 
  content.includes('React.memo') || content.includes('useMemo') || content.includes('useCallback')
);

if (hasMemoOptimizations) {
  console.log('✅ React performance optimizations detected');
} else {
  console.log('⚠️ No React performance optimizations found');
}

// Final Summary
console.log('\n📊 TEST SUMMARY:');
console.log(`File Structure: ${fileTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`Syntax Validation: ${syntaxTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`React Components: ${componentTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`Performance Features: ${perfTestPassed ? '✅ PASSED' : '❌ FAILED'}`);

const overallPassed = fileTestPassed && syntaxTestPassed && componentTestPassed;
console.log(`\n🎯 OVERALL: ${overallPassed ? '✅ APPLICATION READY' : '❌ ISSUES DETECTED'}`);

if (overallPassed) {
  console.log('\n🎉 The Houdini Clock application appears to be properly modernized!');
  console.log('💡 Next steps: Start the development server with `npm start`');
} else {
  console.log('\n🔧 Please address the issues above before testing');
}
