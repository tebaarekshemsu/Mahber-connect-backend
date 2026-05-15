const Redis = require('ioredis');

const client = new Redis({
  host: 'intent-lark-83301.upstash.io',
  port: 6379,
  password: 'gQAAAAAAAUVlAAIgcDExYWVlZTdmNjQzYjk0MGI0YTFjNjNjOTg5NjY0YjFmZA',
  tls: {
    rejectUnauthorized: false,
  },
  connectTimeout: 10000,
});

client.on('connect', () => {
  console.log('✅ Connected to Redis');
});

client.on('ready', () => {
  console.log('✅ Redis is ready');
});

client.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
});

async function test() {
  try {
    console.log('Testing Redis connection...');
    const result = await client.ping();
    console.log('✅ PING response:', result);
    
    await client.set('test-key', 'test-value');
    console.log('✅ SET test-key');
    
    const value = await client.get('test-key');
    console.log('✅ GET test-key:', value);
    
    await client.del('test-key');
    console.log('✅ DEL test-key');
    
    console.log('\n🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await client.quit();
    console.log('Connection closed');
  }
}

test();
