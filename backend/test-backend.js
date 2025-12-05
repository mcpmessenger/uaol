/**
 * Quick test to check if backend is running
 */

async function testBackend() {
  console.log('Testing backend connection...\n');
  
  try {
    const response = await fetch('http://localhost:3000/health');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is RUNNING');
      console.log('Status:', data.status);
      console.log('Service:', data.service);
      return true;
    } else {
      console.log('❌ Backend responded with error:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Backend is NOT RUNNING');
    console.log('Error:', error.message);
    console.log('\n💡 Solution: Start the backend with:');
    console.log('   cd backend');
    console.log('   npm run dev');
    return false;
  }
}

testBackend().then(success => {
  process.exit(success ? 0 : 1);
});
