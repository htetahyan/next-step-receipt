import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set in .env.local');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const sql = postgres(connectionString, { max: 1 });

  try {
    console.log('Fixing constraints for cascade deletion...');

    // 1. invoices -> customers cascade
    console.log('Fixing invoices -> customers constraint...');
    await sql.unsafe(`
      ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_customer_id_fkey;
      ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_customer_id_customers_id_fk;
      ALTER TABLE invoices ADD CONSTRAINT invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
    `);

    // 2. invoice_items -> invoices cascade
    console.log('Fixing invoice_items -> invoices constraint...');
    await sql.unsafe(`
      ALTER TABLE invoice_items DROP CONSTRAINT IF EXISTS invoice_items_invoice_id_fkey;
      ALTER TABLE invoice_items DROP CONSTRAINT IF EXISTS invoice_items_invoice_id_invoices_id_fk;
      ALTER TABLE invoice_items ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;
    `);

    // 3. customer_services -> customers cascade
    console.log('Fixing customer_services -> customers constraint...');
    await sql.unsafe(`
      ALTER TABLE customer_services DROP CONSTRAINT IF EXISTS customer_services_customer_id_fkey;
      ALTER TABLE customer_services DROP CONSTRAINT IF EXISTS customer_services_customer_id_customers_id_fk;
      ALTER TABLE customer_services ADD CONSTRAINT customer_services_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
    `);

    // 4. customer_documents -> customers cascade
    console.log('Fixing customer_documents -> customers constraint...');
    await sql.unsafe(`
      ALTER TABLE customer_documents DROP CONSTRAINT IF EXISTS customer_documents_customer_id_fkey;
      ALTER TABLE customer_documents DROP CONSTRAINT IF EXISTS customer_documents_customer_id_customers_id_fk;
      ALTER TABLE customer_documents ADD CONSTRAINT customer_documents_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
    `);

    console.log('All constraints updated with ON DELETE CASCADE successfully!');
  } catch (error) {
    console.error('Error updating constraints:', error);
  } finally {
    await sql.end();
  }
}

main();
