import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

async function run() {
  const services = await sql`
    SELECT id, reference_id, category, created_at, details
    FROM customer_services;
  `;

  console.log(`Total services in DB: ${services.length}`);
  const keySet = new Set<string>();
  let hasTravelDate = 0;
  let hasVisaIssued = 0;
  let hasBoth = 0;
  let hasNeither = 0;

  services.forEach((s: any) => {
    const d = s.details || {};
    Object.keys(d).forEach(k => keySet.add(k));
    const td = d.travel_date;
    const vi = d.visa_issued_date || d.issued_date;
    if (td && vi) hasBoth++;
    else if (td) hasTravelDate++;
    else if (vi) hasVisaIssued++;
    else hasNeither++;
  });

  console.log(`Keys in details:`, Array.from(keySet));
  console.log(`Counts: hasBoth=${hasBoth}, hasTravelDateOnly=${hasTravelDate}, hasVisaIssuedOnly=${hasVisaIssued}, hasNeither=${hasNeither}`);

  await sql.end();
}

run();
