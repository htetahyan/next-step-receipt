import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Required in .env.local:
// DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
const connectionString = process.env.DATABASE_URL || '';

// If DATABASE_URL is missing, we shouldn't crash immediately but warn.
// This allows the build to succeed if it's omitted in certain environments.
const client = postgres(connectionString, { max: 10 });
export const db = drizzle(client, { schema });
