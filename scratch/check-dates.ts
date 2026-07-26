import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

async function run() {
  const services = await sql`
    SELECT id, reference_id, category, created_at, details
    FROM customer_services
    ORDER BY created_at DESC
    LIMIT 30;
  `;

  console.log(`Inspecting ${services.length} services from DB:`);
  services.forEach((s: any, idx: number) => {
    const d = s.details || {};
    console.log(`[${idx+1}] ref:${s.reference_id} | created_at:${s.created_at} | travel_date:${d.travel_date} | visa_issued:${d.visa_issued_date} | visa_expiry:${d.visa_expiry_date}`);
  });

  await sql.end();
}

run();
