import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local' });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not found');
    return;
  }
  
  const sql = postgres(connectionString);
  try {
    const result = await sql`select id, name, email, phone, passport_no from customers limit 5`;
    console.log('Query successful, customers found:', result);
  } catch (err) {
    console.error('Query failed:', err);
  } finally {
    await sql.end();
  }
}

main();
