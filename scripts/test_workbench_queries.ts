import { pool, testDatabaseConnection, ensureSchemaMigrations } from '../src/config/database';

async function testAll() {
  console.log('--- Step 1: Testing Database Connection ---');
  const connected = await testDatabaseConnection();
  if (!connected) {
    console.error('Failed to connect to database!');
    process.exit(1);
  }

  console.log('\n--- Step 2: Running Schema Migrations (users & login_history) ---');
  await ensureSchemaMigrations(pool);

  console.log('\n--- Step 3: Testing User Query ---');
  const [users]: any = await pool.query('SELECT id, name, username, email, failed_attempts, is_locked, locked_at FROM users LIMIT 5');
  console.log(`Found ${users.length} user(s):`);
  console.table(users);

  console.log('\n--- Step 4: Testing Login History Query ---');
  const [history]: any = await pool.query('SELECT id, user_id, identifier, status, failure_reason, attempted_at FROM login_history ORDER BY attempted_at DESC LIMIT 5');
  console.log(`Found ${history.length} login history record(s):`);
  console.table(history);

  console.log('\n--- Step 5: Testing User + Login History Join Query ---');
  const [joined]: any = await pool.query(`
    SELECT 
      lh.id AS log_id,
      COALESCE(u.name, 'Unknown') AS user_name,
      lh.identifier,
      lh.status,
      lh.failure_reason,
      lh.attempted_at
    FROM login_history lh
    LEFT JOIN users u ON lh.user_id = u.id
    ORDER BY lh.attempted_at DESC
    LIMIT 5
  `);
  console.log(`Join query returned ${joined.length} row(s):`);
  console.table(joined);

  console.log('\n--- Step 6: Testing Analytics Query ---');
  const [analytics]: any = await pool.query(`
    SELECT 
      COUNT(*) AS total_users,
      SUM(CASE WHEN is_locked = 1 OR failed_attempts >= 3 THEN 1 ELSE 0 END) AS locked_users
    FROM users
  `);
  console.table(analytics);

  console.log('\n>>> All Workbench queries executed successfully without error! <<<');
  await pool.end();
}

testAll().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
