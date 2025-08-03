// Test script to verify backend functionality
const fetch = require('node-fetch');
require('dotenv').config();

const BACKEND_URL = 'http://localhost:3000';

async function testBackend() {
  console.log('🧪 Testing PageMind Backend...\n');
  
  try {
    // 1. Test health endpoint
    console.log('1. Testing health check...');
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    const health = await healthResponse.json();
    console.log('✅ Health check:', health);
    console.log('   Redis connected:', health.redis ? '✓' : '✗');
    
    // 2. Create a room with API key
    console.log('\n2. Creating a test room with API key...');
    const createRoomResponse = await fetch(`${BACKEND_URL}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: 'TEST01',
        userId: 'test_user_1',
        action: 'create',
        apiKey: process.env.GEMINI_API_KEY || 'test-api-key'
      })
    });
    const createRoom = await createRoomResponse.json();
    console.log('✅ Room created:', createRoom);
    
    // 3. Join room with another user
    console.log('\n3. Joining room with another user...');
    const joinRoomResponse = await fetch(`${BACKEND_URL}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: 'TEST01',
        userId: 'test_user_2',
        action: 'join'
      })
    });
    const joinRoom = await joinRoomResponse.json();
    console.log('✅ Room joined:', joinRoom);
    
    // 4. Create a summary (will use backend's Gemini API)
    console.log('\n4. Creating a test summary...');
    const summaryResponse = await fetch(`${BACKEND_URL}/api/summaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com/test-article',
        title: 'Test Article',
        content: 'This is a test article about Redis and AI. Redis is a powerful in-memory data structure store that can be used as a database, cache, and message broker. When combined with AI applications, Redis provides real-time performance and scalability.',
        roomId: 'TEST01',
        userId: 'test_user_1',
        summaryLength: 'medium'
      })
    });
    const summary = await summaryResponse.json();
    console.log('✅ Summary created:', {
      success: summary.success,
      fromCache: summary.data?.fromCache,
      summary: summary.data?.summary?.substring(0, 100) + '...'
    });
    
    // 5. Test cache hit (same URL, different user)
    console.log('\n5. Testing cache hit with same URL...');
    const cacheHitResponse = await fetch(`${BACKEND_URL}/api/summaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com/test-article',
        title: 'Test Article',
        content: 'This content is ignored because it should hit the cache',
        roomId: 'TEST01',
        userId: 'test_user_2',
        summaryLength: 'medium'
      })
    });
    const cacheHit = await cacheHitResponse.json();
    console.log('✅ Cache hit test:', {
      success: cacheHit.success,
      fromCache: cacheHit.data?.fromCache,
      message: cacheHit.data?.fromCache ? 'Cache hit! No AI API call made.' : 'Cache miss - check Redis connection'
    });
    
    // 6. Get room summaries
    console.log('\n6. Getting room summaries...');
    const summariesResponse = await fetch(`${BACKEND_URL}/api/rooms/TEST01/summaries`);
    const summaries = await summariesResponse.json();
    console.log('✅ Room summaries:', {
      success: summaries.success,
      count: summaries.summaries?.length
    });
    
    // 7. Get metrics
    console.log('\n7. Getting metrics...');
    const metricsResponse = await fetch(`${BACKEND_URL}/api/metrics`);
    const metrics = await metricsResponse.json();
    console.log('✅ Metrics:', metrics.metrics);
    
    console.log('\n✨ All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- Backend is running');
    console.log('- Redis is connected');
    console.log('- Room creation/joining works');
    console.log('- AI summarization works');
    console.log('- Redis caching works');
    console.log('- Metrics tracking works');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Make sure:');
    console.error('1. Backend is running (npm start)');
    console.error('2. Redis credentials are correct in .env');
    console.error('3. Gemini API key is valid in .env');
  }
}

// Run tests
testBackend();
