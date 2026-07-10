import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local' });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not found in .env.local');
    return;
  }
  
  console.log('Connecting to database...');
  const sql = postgres(connectionString);

  try {
    console.log('Clearing database tables...');
    
    // We truncate tables with CASCADE to safely clear everything in correct dependency order
    await sql.unsafe(`
      TRUNCATE TABLE 
        invoice_items, 
        invoices, 
        customer_documents, 
        customer_services, 
        customers, 
        suppliers 
      RESTART IDENTITY CASCADE;
    `);

    console.log('Successfully cleared all database data and reset identities!');
  } catch (err) {
    console.error('Failed to clear database:', err);
  } finally {
    await sql.end();
  }
}

main();
