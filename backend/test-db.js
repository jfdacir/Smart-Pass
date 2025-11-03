const db = require('./config/database');

async function testConnection() {
  try {
    // Test basic connection
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    console.log('✓ Database math test:', rows[0].result);

    // Test if tables exist
    const [tables] = await db.query('SHOW TABLES');
    console.log('✓ Tables in database:', tables.length);
    tables.forEach(table => {
      console.log('  -', Object.values(table)[0]);
    });

    // Test if users exist
    const [users] = await db.query('SELECT COUNT(*) as count FROM users');
    console.log('✓ Total users:', users[0].count);

    console.log('\n🎉 Everything looks good!\n');
    process.exit(0);
  } catch (error) {
    console.error('✗ Database test failed:', error.message);
    process.exit(1);
  }
}

testConnection();