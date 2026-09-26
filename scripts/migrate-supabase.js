const path = require('path');
const { Client } = require(path.join(__dirname, '../backend/node_modules/pg'));
const fs = require('fs');

const connectionString = 'postgresql://postgres.humyzwxqjrajgrvtdldy:bernad281879@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres';

async function migrate() {
  console.log('[SUPABASE MIGRATION] Connecting to Supabase PostgreSQL cluster...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('[SUPABASE MIGRATION] Connected successfully.');

  const sqlPath = path.join(__dirname, '../backend/src/db/supabase-schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('[SUPABASE MIGRATION] Executing SQL schema and RLS policies from supabase-schema.sql...');
  await client.query(sql);
  console.log('[SUPABASE MIGRATION] SQL schema, RLS policies, and seed data applied successfully!');

  // Verify tables
  console.log('[SUPABASE MIGRATION] Verifying created tables...');
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('[SUPABASE MIGRATION] Public tables:', tablesRes.rows.map(r => r.table_name));

  // Verify counts
  const usersCount = await client.query('SELECT count(*) FROM users');
  const booksCount = await client.query('SELECT count(*) FROM books');
  const rolesCount = await client.query('SELECT count(*) FROM roles');
  const borrowCount = await client.query('SELECT count(*) FROM borrow_records');
  const rlsCheck = await client.query(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public';
  `);

  console.log('----------------------------------------------------');
  console.log(`[SUPABASE STATUS] Users: ${usersCount.rows[0].count}`);
  console.log(`[SUPABASE STATUS] Books: ${booksCount.rows[0].count}`);
  console.log(`[SUPABASE STATUS] Roles: ${rolesCount.rows[0].count}`);
  console.log(`[SUPABASE STATUS] Borrow Records: ${borrowCount.rows[0].count}`);
  console.log('[SUPABASE STATUS] Row-Level Security (RLS) state:');
  rlsCheck.rows.forEach(r => console.log(`  - ${r.tablename}: RLS ${r.rowsecurity ? 'ENABLED' : 'DISABLED'}`));
  console.log('----------------------------------------------------');

  await client.end();
}

migrate().catch((err) => {
  console.error('[SUPABASE MIGRATION FAILED]', err);
  process.exit(1);
});
