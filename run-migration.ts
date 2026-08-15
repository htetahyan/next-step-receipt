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
    const sql = fs.readFileSync('sql/migrations/008_user_profiles_and_rbac.sql', 'utf8');
    await sqlClient.unsafe(sql);
    console.log('Migration 008 (User Profiles & RBAC) successful');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sqlClient.end();
  }
}

main();
