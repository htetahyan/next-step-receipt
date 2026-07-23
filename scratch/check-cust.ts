import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local' });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  const customerId = '46490548-bbb3-4dd3-9018-019073c92b87';

  const cust = await sql`SELECT id, name, phone, passport_no FROM customers WHERE id = ${customerId}`;
  const svcs = await sql`SELECT id, reference_id, category, status, details, created_at FROM customer_services WHERE customer_id = ${customerId}`;

  console.log('Customer info:', cust);
  console.log(`Found ${svcs.length} total services for this customer:`);
  svcs.forEach((s, idx) => {
    console.log(`\n--- Service ${idx + 1} ---`);
    console.log('ID:', s.id);
    console.log('Ref ID:', s.reference_id);
    console.log('Category:', s.category);
    console.log('Status:', s.status);
    console.log('Details:', s.details);
    console.log('Created At:', s.created_at);
  });

  await sql.end();
}

main();
