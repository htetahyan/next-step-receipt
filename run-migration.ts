import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import postgres from 'postgres';

dotenv.config({ path: '.env.local' });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not found in .env.local');
    return;
  }
  
  const sqlClient = postgres(connectionString);

  try {
    const sql = fs.readFileSync('sql/migrations/004_service_reference_id.sql', 'utf8');
    await sqlClient.unsafe(sql);
    console.log('Migration 004 successful');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sqlClient.end();
  }
}

main();
