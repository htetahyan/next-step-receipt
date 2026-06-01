import postgres from 'postgres';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL as string);

async function runMigration() {
  try {
    const query = fs.readFileSync('sql/migrations/006_centralized_customers_drizzle.sql', 'utf8');
    await sql.unsafe(query);
    console.log('Migration successful');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sql.end();
  }
}

runMigration();
