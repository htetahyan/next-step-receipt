import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function inspectSpecificRefs() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  try {
    const rows = await sql`
      SELECT 
        cs.id,
        cs.reference_id,
        cs.category,
        cs.created_at,
        c.name as customer_name,
        c.passport_no,
        cs.details,
        cs.financials
      FROM customer_services cs
      LEFT JOIN customers c ON cs.customer_id = c.id
      WHERE LOWER(TRIM(cs.reference_id)) IN ('ae182', 'ae183', 'ae184', 'ae185', 'ae186', 'ae234', 'tp-1')
      ORDER BY cs.reference_id, cs.created_at DESC
    `;

    for (const r of rows) {
      console.log(`Ref: ${r.reference_id} | Customer: "${r.customer_name}" | Passport: "${r.passport_no}" | Category: "${r.category}" | ID: ${r.id}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

inspectSpecificRefs();
