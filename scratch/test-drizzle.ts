import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema';

dotenv.config({ path: '.env.local' });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not found');
    return;
  }
  
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client, { schema });
  
  try {
    console.log('Testing Drizzle Select on customers...');
    const result = await db.select().from(schema.customers).limit(1);
    console.log('Drizzle Select successful! Records found:', result.length);

    console.log('Testing Drizzle Insert on customers...');
    const [inserted] = await db.insert(schema.customers).values({
      name: 'Test Customer Temp',
      passportNo: 'TEMP123456'
    }).returning();
    console.log('Drizzle Insert successful! New Customer:', inserted);

    console.log('Testing Drizzle Delete on customers...');
    await db.delete(schema.customers).where(schema.eq(schema.customers.id, inserted.id));
    console.log('Drizzle Delete successful!');

  } catch (err) {
    console.error('Drizzle DB test failed:', err);
  } finally {
    await client.end();
  }
}

main();
